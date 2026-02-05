import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { supabase } from "../../lib/supabase";
import { Client, type DecodedMessage } from "@xmtp/browser-sdk";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useXMTPClient } from "../../contexts/XMTPContext";

interface MessageWithMetadata extends DecodedMessage<any> {
  senderName?: string;
  senderImage?: string;
  isSent?: boolean;
}

const Chat: React.FC = () => {
  const router = useRouter();
  const { peer: peerParam } = router.query;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageWithMetadata[]>([]);
  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [peerAddress, setPeerAddress] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const clientRef = useRef<Client<any> | null>(null);
  const userNameRef = useRef(userName);
  const userImageRef = useRef(userImage);
  const hasInitializedRef = useRef(false);

  // Use shared XMTP client hook
  const {
    client: xmtpClient,
    isLoading: isXmtpLoading,
    error: xmtpError,
    walletAddress,
    showRevokeOption,
    handleRevokeAndRetry,
  } = useXMTPClient();

  // Keep refs in sync with state
  useEffect(() => {
    userNameRef.current = userName;
    userImageRef.current = userImage;
  }, [userName, userImage]);

  // Keep client ref in sync
  useEffect(() => {
    clientRef.current = xmtpClient;
  }, [xmtpClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Truncate address for display
  const truncateAddress = (address: string | unknown): string => {
    if (!address || typeof address !== "string") return "Unknown";
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Format timestamp for message display
  const formatMessageTime = (sentAt: Date | string | number | bigint | undefined): string => {
    if (!sentAt) return "";

    let timestamp: number;

    if (typeof sentAt === "bigint") {
      timestamp = Number(sentAt / BigInt(1000000));
    } else if (typeof sentAt === "number") {
      timestamp = sentAt > 1e15 ? sentAt / 1000000 : sentAt > 1e12 ? sentAt : sentAt * 1000;
    } else if (typeof sentAt === "string") {
      timestamp = new Date(sentAt).getTime();
    } else if (sentAt instanceof Date) {
      timestamp = sentAt.getTime();
    } else {
      return "";
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return timeStr;
    } else if (isYesterday) {
      return `Yesterday ${timeStr}`;
    } else {
      return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${timeStr}`;
    }
  };

  // Check if message is a system/metadata message
  const isSystemMessage = (content: any): boolean => {
    if (typeof content === "object" && content !== null) {
      if ("initiatedByInboxId" in content) return true;
      if ("membersAdded" in content) return true;
      if ("membersRemoved" in content) return true;
    }
    return false;
  };

  // Load existing messages from conversation
  const loadMessages = async (conversation: any, client: Client<any>) => {
    try {
      const msgs = await conversation.messages({ limit: BigInt(50) });

      // Resolve addresses from conversation members
      const addressMap = new Map<string, string>();
      try {
        if (typeof conversation.members === "function") {
          const members = await conversation.members();
          members?.forEach((member: any) => {
            if (member.inboxId && member.accountIdentifiers?.length > 0) {
              const address = member.accountIdentifiers[0].identifier;
              addressMap.set(member.inboxId, address);
            }
          });
        }
      } catch (e) {
        console.debug("Could not resolve member addresses:", e);
      }

      const formattedMessages = msgs
        .filter((msg: DecodedMessage<any>) => !isSystemMessage(msg.content))
        .map((msg: DecodedMessage<any>) => {
          const senderAddress = addressMap.get(msg.senderInboxId) || msg.senderInboxId;
          return {
            ...msg,
            senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : truncateAddress(senderAddress || "Unknown"),
            senderImage: msg.senderInboxId === client.inboxId ? userImageRef.current : "/Chat-Section-Icons/Image 1.svg",
            isSent: msg.senderInboxId === client.inboxId,
          };
        })
        .sort((a: MessageWithMetadata, b: MessageWithMetadata) => {
          const timeA = a.sentAtNs ? Number(a.sentAtNs) : 0;
          const timeB = b.sentAtNs ? Number(b.sentAtNs) : 0;
          return timeA - timeB;
        });
      setMessages(formattedMessages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // Stream new messages in real-time
  const streamMessages = async (conversation: any, client: Client<any>, signal: AbortSignal) => {
    try {
      if (!conversation.stream) {
        console.log("Stream not available for this conversation");
        return;
      }

      const stream = await conversation.stream();

      signal.addEventListener("abort", () => {
        if (stream && stream.return) {
          stream.return();
        }
      });

      for await (const msg of stream) {
        if (signal.aborted) break;

        if (isSystemMessage(msg.content)) continue;

        const messageWithMetadata: MessageWithMetadata = {
          ...msg,
          senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : truncateAddress(msg.senderInboxId),
          senderImage: msg.senderInboxId === client.inboxId ? userImageRef.current : "/Chat-Section-Icons/Image 1.svg",
          isSent: msg.senderInboxId === client.inboxId,
        };

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) return prev;
          return [...prev, messageWithMetadata];
        });
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && !signal.aborted) {
        console.error("Failed to stream messages:", err);
      }
    }
  };

  // Initialize or find conversation with peer
  const initializeConversation = useCallback(async (peer: string, client: Client<any>) => {
    setIsLoadingConversation(true);
    setLocalError(null);

    try {
      const normalizedPeer = peer.toLowerCase();
      setPeerAddress(normalizedPeer);

      // Sync conversations first
      await client.conversations.sync();

      // Try to find existing conversation
      const convos = await client.conversations.list();
      let conversation = null;

      for (const convo of convos) {
        try {
          // Cast to any for flexible property access
          const convoAny = convo as any;

          // Check peer addresses
          if (convoAny.peerAddresses?.some((addr: string) => addr.toLowerCase() === normalizedPeer)) {
            conversation = convo;
            break;
          }

          // Check members
          if (typeof convoAny.members === "function") {
            const members = await convoAny.members();
            const peerMember = members?.find((m: any) =>
              m.accountIdentifiers?.some((id: any) => id.identifier?.toLowerCase() === normalizedPeer)
            );
            if (peerMember) {
              conversation = convo;
              break;
            }
          }

          // Check peerInboxId
          let peerInboxId = convoAny.peerInboxId;
          if (typeof peerInboxId === "function") peerInboxId = peerInboxId.call(convo);
          if (peerInboxId && typeof peerInboxId === "object" && "then" in peerInboxId) peerInboxId = await peerInboxId;
          if (String(peerInboxId).toLowerCase() === normalizedPeer) {
            conversation = convo;
            break;
          }
        } catch (e) {
          // Continue checking other conversations
        }
      }

      // Create new conversation if not found
      if (!conversation) {
        console.log("[Chat] Creating new conversation with:", normalizedPeer);

        // Create identifier for the peer
        const peerIdentifier = {
          identifier: normalizedPeer,
          identifierKind: "Ethereum" as const,
        };

        // Check if peer can receive messages
        const canMessage = await client.canMessage([peerIdentifier]);
        if (!canMessage.get(normalizedPeer)) {
          throw new Error("This address hasn't enabled XMTP messaging yet.");
        }

        // Create new DM (newDm expects a string address)
        conversation = await client.conversations.newDm(normalizedPeer as any);
        console.log("[Chat] New conversation created");
      }

      // Set up conversation
      setCurrentConversation(conversation);

      // Abort previous stream
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }

      // Load messages and start streaming
      await loadMessages(conversation, client);

      streamAbortRef.current = new AbortController();
      streamMessages(conversation, client, streamAbortRef.current.signal).catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Message stream error:", err);
        }
      });
    } catch (err: any) {
      console.error("[Chat] Failed to initialize conversation:", err);
      setLocalError(err.message || "Failed to start conversation. Make sure the recipient has XMTP enabled.");
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  // Handle peer param from URL
  useEffect(() => {
    if (!xmtpClient || !peerParam || typeof peerParam !== "string" || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    const peer = decodeURIComponent(peerParam);
    console.log("[Chat] Initializing conversation with peer:", peer);
    initializeConversation(peer, xmtpClient);
  }, [xmtpClient, peerParam, initializeConversation]);

  // Get user profile
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setUserName(data.username || "User");
          setUserImage(data.profile_picture_url || "/Chat-Section-Icons/Image 1.svg");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    getUser();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
    };
  }, []);

  // Reset when peer param changes
  useEffect(() => {
    if (!peerParam) {
      hasInitializedRef.current = false;
      setCurrentConversation(null);
      setMessages([]);
      setPeerAddress(null);
    }
  }, [peerParam]);

  const handleSend = async () => {
    if (message.trim() && currentConversation) {
      try {
        await currentConversation.send(message);
        setMessage("");
      } catch (err) {
        console.error("Failed to send message:", err);
        setLocalError("Failed to send message");
      }
    }
  };

  const handleBack = () => {
    router.push("/chat-Section/Search");
  };

  // Combined states
  const error = xmtpError || localError;
  const isLoading = isXmtpLoading || isLoadingConversation;
  const needsWalletConnection = !xmtpClient && !isXmtpLoading && !xmtpError;
  const noPeerProvided = !peerParam && !isLoading && xmtpClient;

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Chat - XAO Cult</title>
          <meta name="description" content="Chat" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
          userName={peerAddress ? truncateAddress(peerAddress) : userName}
          userImage={userImage}
          onBackClick={handleBack}
        />

        <main className={styles.chatMain}>
          <div className={styles.messagesContainer}>
            {isLoading && (
              <div className={styles.RecievedMessage}>
                {isXmtpLoading ? "Loading XMTP client..." : "Loading conversation..."}
              </div>
            )}

            {error && (
              <div className={styles.RecievedMessage}>
                {error}
                {showRevokeOption && (
                  <>
                    <button
                      onClick={handleRevokeAndRetry}
                      style={{
                        marginTop: "12px",
                        padding: "10px 20px",
                        background: "linear-gradient(to right, #ff9900, #e100ff)",
                        border: "none",
                        borderRadius: "20px",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "block",
                        width: "100%",
                      }}
                    >
                      Try Clearing Local Data
                    </button>
                    <div style={{ marginTop: "16px", fontSize: "12px", opacity: 0.9 }}>
                      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>If that doesn&apos;t work, use XMTP CLI:</div>
                      <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "8px", marginBottom: "4px" }}>
                        npm install -g @xmtp/cli
                      </code>
                      <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "8px", marginBottom: "4px" }}>
                        xmtp auth
                      </code>
                      <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "8px" }}>
                        xmtp installations revoke-all-other
                      </code>
                    </div>
                  </>
                )}
              </div>
            )}

            {needsWalletConnection && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "20px" }}>
                <div className={styles.RecievedMessage}>Connect your wallet to use chat</div>
                <ConnectButton />
              </div>
            )}

            {noPeerProvided && (
              <div className={styles.RecievedMessage}>
                <div style={{ marginBottom: "12px" }}>No conversation selected.</div>
                <button
                  onClick={handleBack}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(to right, #ff9900, #e100ff)",
                    border: "none",
                    borderRadius: "20px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  Go to Search
                </button>
              </div>
            )}

            {/* Chat Messages */}
            {!isLoading && !noPeerProvided && currentConversation && (
              <>
                {messages.length === 0 && !error && (
                  <div className={styles.RecievedMessage}>No messages yet. Start a conversation!</div>
                )}

                {messages
                  .filter((msg) => !isSystemMessage(msg.content))
                  .map((msg, idx) => {
                    let displayContent = "";
                    if (typeof msg.content === "string") {
                      displayContent = msg.content;
                    } else if (msg.content?.text) {
                      displayContent = msg.content.text;
                    } else if (msg.content?.content) {
                      displayContent = msg.content.content;
                    } else {
                      return null;
                    }

                    if (!displayContent) return null;

                    const msgTimestamp = msg.sentAtNs || (msg as any).sentAt || (msg as any).timestamp;

                    return (
                      <div key={idx} className={msg.isSent ? styles.sentMessage : styles.RecievedMessage}>
                        <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>{msg.isSent ? "You" : msg.senderName}</span>
                          <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "8px" }}>
                            {msgTimestamp ? formatMessageTime(msgTimestamp) : ""}
                          </span>
                        </div>
                        {displayContent}
                      </div>
                    );
                  })}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className={styles.messageInputContainer}>
            <div className={styles.messageInput}>
              <img src="/Chat-Section-Icons/Frame.svg" alt="Frame" width={24} height={24} style={{ cursor: "pointer" }} />
              <input
                type="text"
                placeholder={isLoading ? "Loading..." : "Message"}
                className={styles.input}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                disabled={isLoading || !currentConversation}
              />
              <span className={styles.chatInputIcons}>
                <img
                  src="/contracts-Icons/Group 6.svg"
                  alt="Send"
                  width={28}
                  height={28}
                  style={{ cursor: isLoading || !currentConversation ? "not-allowed" : "pointer", opacity: isLoading || !currentConversation ? 0.5 : 1 }}
                  onClick={handleSend}
                />
              </span>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Chat;
