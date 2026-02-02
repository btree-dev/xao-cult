import React, { useEffect, useRef, useState } from "react";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { supabase } from "../../lib/supabase";
import { Client, type Signer, type DecodedMessage } from "@xmtp/browser-sdk";
import { ethers } from "ethers";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface MessageWithMetadata extends DecodedMessage<any> {
  senderName?: string;
  senderImage?: string;
  isSent?: boolean;
}

interface ConversationPreview {
  conversation: any;
  peerInboxId: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

const Chat: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageWithMetadata[]>([]);
  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);
  const [xmtpClient, setXmtpClient] = useState<Client<any> | null>(null);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsWalletConnection, setNeedsWalletConnection] = useState(false);
  const [newRecipientAddress, setNewRecipientAddress] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<any>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const clientRef = useRef<Client<any> | null>(null);
  const userNameRef = useRef(userName);
  const userImageRef = useRef(userImage);

  // Keep refs in sync with state
  useEffect(() => {
    userNameRef.current = userName;
    userImageRef.current = userImage;
  }, [userName, userImage]);

  useEffect(() => {
    clientRef.current = xmtpClient;
  }, [xmtpClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get or create encryption key for XMTP (to reuse the same installation)
  const getOrCreateEncryptionKey = async (): Promise<Uint8Array> => {
    const storageKey = "xmtp_encryption_key";
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      // Convert stored hex string back to Uint8Array
      const bytes = new Uint8Array(stored.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      return bytes;
    }

    // Generate new 32-byte encryption key
    const key = crypto.getRandomValues(new Uint8Array(32));
    // Store as hex string
    const hexKey = Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(storageKey, hexKey);
    return key;
  };

  // Initialize XMTP Client
  const initializeXMTP = async (signer: Signer) => {
    try {
      setIsLoading(true);

      // Get encryption key to reuse same installation
      const encryptionKey = await getOrCreateEncryptionKey();

      const client = await Client.create(signer, {
        env: "dev",
        appVersion: "xao-cult/1.0.0",
        dbEncryptionKey: encryptionKey,
      });
      setXmtpClient(client);
      setError(null);

      // Get wallet address for display
      const address = await signer.getIdentifier();
      setWalletAddress(address.identifier);

      // Check if first time user (no previous conversations and hasn't seen welcome)
      const hasSeenWelcome = localStorage.getItem("xmtp_welcome_seen");

      // Load conversations after client is ready
      await loadConversations(client);

      // Show welcome message for first-time users
      if (!hasSeenWelcome) {
        setShowWelcome(true);
        localStorage.setItem("xmtp_welcome_seen", "true");
      }
    } catch (err: any) {
      console.error("Failed to initialize XMTP client:", err);

      // Handle installation limit error
      if (err.message?.includes("10/10 installations")) {
        // Clear the encryption key and try with a fresh one
        localStorage.removeItem("xmtp_encryption_key");
        setError("Too many devices registered. Please clear your browser data for this site and try again, or use a different wallet.");
      } else {
        setError("Failed to initialize chat. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load all conversations
  const loadConversations = async (client: Client<any>) => {
    try {
      setIsLoadingConversations(true);
      await client.conversations.sync();
      const convos = await client.conversations.list();

      const previews: ConversationPreview[] = await Promise.all(
        convos.map(async (convo: any) => {
          let lastMessage = "";
          let lastMessageTime: Date | undefined;

          try {
            const msgs = await convo.messages({ limit: 1n });
            if (msgs.length > 0) {
              const msg = msgs[0];
              lastMessage = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
              lastMessageTime = msg.sentAt ? new Date(msg.sentAt) : undefined;
            }
          } catch (e) {
            console.error("Error loading last message:", e);
          }

          // Get peer inbox ID (the other participant)
          const peerInboxId = convo.peerInboxId || convo.id || "Unknown";

          return {
            conversation: convo,
            peerInboxId,
            lastMessage,
            lastMessageTime,
          };
        })
      );

      // Sort by last message time (most recent first)
      previews.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });

      setConversations(previews);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Select and open a conversation
  const selectConversation = async (convo: any, client: Client<any>) => {
    try {
      // Cancel any existing stream before starting a new one
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }

      setCurrentConversation(convo);
      conversationRef.current = convo;
      setShowConversationList(false);
      setMessages([]);

      // Load existing messages
      await loadMessages(convo, client);

      // Start streaming new messages
      streamAbortRef.current = new AbortController();
      streamMessages(convo, client, streamAbortRef.current.signal).catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Stream error:", err);
        }
      });
    } catch (err) {
      console.error("Failed to select conversation:", err);
      setError("Failed to open conversation");
    }
  };

  // Start a new conversation with a recipient (wallet address or inbox ID)
  const startNewConversation = async (recipientAddress: string) => {
    if (!xmtpClient) {
      setError("XMTP client not initialized");
      return;
    }

    try {
      let dm;

      // If it's a wallet address (starts with 0x), use newDmWithIdentifier
      if (recipientAddress.startsWith("0x")) {
        const normalizedAddress = recipientAddress.toLowerCase();
        const identifier = { identifier: normalizedAddress, identifierKind: "Ethereum" as const };

        console.log("Checking if address can receive messages:", normalizedAddress);

        // Check if the address can receive XMTP messages
        const canMessageResult = await xmtpClient.canMessage([identifier]);
        const canReceive = canMessageResult.get(normalizedAddress);

        console.log("canMessage result:", canReceive, "Full result:", Object.fromEntries(canMessageResult));

        if (!canReceive) {
          setError(`This person hasn't enabled chat yet. Ask them to visit the Chat page and connect their wallet first. (Address: ${truncateAddress(normalizedAddress)})`);
          return;
        }

        dm = await xmtpClient.conversations.newDmWithIdentifier(identifier);
      } else {
        // Assume it's an inbox ID
        dm = await xmtpClient.conversations.newDm(recipientAddress);
      }

      await selectConversation(dm, xmtpClient);
      setNewRecipientAddress("");

      // Refresh conversations list
      await loadConversations(xmtpClient);
    } catch (err: any) {
      console.error("Failed to start new conversation:", err);
      setError(err.message || "Failed to start conversation. Make sure the recipient has XMTP enabled.");
    }
  };

  // Go back to conversations list
  const backToList = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    setCurrentConversation(null);
    setMessages([]);
    setShowConversationList(true);
  };

  // Check if message is a system/metadata message
  const isSystemMessage = (content: any): boolean => {
    if (typeof content === 'object' && content !== null) {
      if ('initiatedByInboxId' in content) return true;
      if ('membersAdded' in content) return true;
      if ('membersRemoved' in content) return true;
    }
    return false;
  };

  // Load existing messages from conversation
  const loadMessages = async (conversation: any, client: Client<any>) => {
    try {
      const msgs = await conversation.messages({ limit: 50n });
      const formattedMessages = msgs
        .filter((msg: DecodedMessage<any>) => !isSystemMessage(msg.content))
        .map((msg: DecodedMessage<any>) => ({
          ...msg,
          senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : truncateAddress(msg.senderInboxId || "Unknown"),
          senderImage: msg.senderInboxId === client.inboxId ? userImageRef.current : "/Chat-Section-Icons/Image 1.svg",
          isSent: msg.senderInboxId === client.inboxId,
        }));
      setMessages(formattedMessages.reverse());
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // Stream new messages in real-time
  const streamMessages = async (conversation: any, client: Client<any>, signal: AbortSignal) => {
    try {
      // Check if stream method exists
      if (!conversation.stream) {
        console.log("Stream not available for this conversation");
        return;
      }

      const stream = await conversation.stream();

      // Handle abort signal
      signal.addEventListener('abort', () => {
        if (stream && stream.return) {
          stream.return();
        }
      });

      for await (const msg of stream) {
        if (signal.aborted) break;

        // Skip system messages
        if (isSystemMessage(msg.content)) continue;

        const messageWithMetadata: MessageWithMetadata = {
          ...msg,
          senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : truncateAddress(msg.senderInboxId || "Unknown"),
          senderImage: msg.senderInboxId === client.inboxId ? userImageRef.current : "/Chat-Section-Icons/Image 1.svg",
          isSent: msg.senderInboxId === client.inboxId,
        };

        // Avoid duplicate messages by checking if message already exists
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, messageWithMetadata];
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && !signal.aborted) {
        console.error("Failed to stream messages:", err);
      }
    }
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        let profileData = null;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            profileData = data;
            setUserName(profileData.username || "User");
            setUserImage(profileData.profile_picture_url || '/Chat-Section-Icons/Image 1.svg');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } catch (error) {
        console.error('Error in chat:', error);
      }
    };

    getUser();
  }, []);

  // Initialize XMTP when component mounts
  useEffect(() => {
    const initializeXMTPConnection = async () => {
      try {
        // Check if wallet extension is available
        if (!(window as any).ethereum) {
          setError("Please install MetaMask or another Web3 wallet to use chat");
          setIsLoading(false);
          return;
        }

        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const signer = provider.getSigner();

        // Check if wallet is connected
        try {
          await signer.getAddress();
        } catch {
          setNeedsWalletConnection(true);
          setIsLoading(false);
          return;
        }

        const signerObj: Signer = {
          type: "EOA",
          getIdentifier: async () => ({
            identifier: await signer.getAddress(),
            identifierKind: "Ethereum",
          }),
          signMessage: async (message: string): Promise<Uint8Array> => {
            const sig = await signer.signMessage(message);
            return new Uint8Array(Buffer.from(sig.slice(2), "hex"));
          },
        };

        await initializeXMTP(signerObj);
      } catch (err) {
        console.error("Failed to initialize XMTP connection:", err);
        setError("Failed to connect to XMTP. Please try again.");
        setIsLoading(false);
      }
    };

    initializeXMTPConnection();

    // Listen for wallet connection changes
    const handleAccountsChanged = () => {
      if (needsWalletConnection) {
        setNeedsWalletConnection(false);
        setIsLoading(true);
        initializeXMTPConnection();
      }
    };

    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if ((window as any).ethereum) {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [needsWalletConnection]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
    };
  }, []);

  const handleSend = async () => {
    if (message.trim() && currentConversation) {
      try {
        // Send message via XMTP
        await currentConversation.send(message);
        setMessage("");
      } catch (err) {
        console.error("Failed to send message:", err);
        setError("Failed to send message");
      }
    } else if (!currentConversation) {
      setError("Conversation not initialized");
    }
  };

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
          userName={userName}
          userImage={userImage}
          rightIcon={showConversationList ? "/Chat-Section-Icons/Search_Magnifying_Glass.svg" : undefined}
          onBackClick={!showConversationList ? backToList : undefined}
        />

        <main className={styles.chatMain}>
        <div className={styles.messagesContainer}>
          {isLoading && (
            <div className={styles.RecievedMessage}>
              Loading XMTP client...
            </div>
          )}
          {error && (
            <div className={styles.RecievedMessage}>
              {error}
            </div>
          )}

          {/* Connect Wallet Prompt */}
          {needsWalletConnection && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "20px" }}>
              <div className={styles.RecievedMessage}>
                Connect your wallet to use chat
              </div>
              <ConnectButton />
            </div>
          )}

          {/* Welcome Message for First-Time Users */}
          {showWelcome && (
            <div className={styles.RecievedMessage} style={{ marginBottom: "12px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                🎉 Chat Enabled!
              </div>
              <div style={{ marginBottom: "8px" }}>
                You can now send and receive messages. Others can message you using your wallet address:
              </div>
              <div style={{
                background: "rgba(0,0,0,0.3)",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                wordBreak: "break-all",
                marginBottom: "8px"
              }}>
                {walletAddress}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>
                Share this address with friends so they can chat with you!
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                style={{
                  marginTop: "12px",
                  padding: "8px 16px",
                  background: "rgba(0,0,0,0.3)",
                  border: "none",
                  borderRadius: "20px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Got it
              </button>
            </div>
          )}

          {/* Conversations List View */}
          {!isLoading && !needsWalletConnection && showConversationList && (
            <>
              {/* Show user's own address */}
              {walletAddress && !showWelcome && (
                <div className={styles.sentMessage} style={{ marginBottom: "12px", fontSize: "12px" }}>
                  <div style={{ opacity: 0.7, marginBottom: "4px" }}>Your chat address:</div>
                  <div style={{ wordBreak: "break-all" }}>{walletAddress}</div>
                </div>
              )}

              {isLoadingConversations && (
                <div className={styles.RecievedMessage}>
                  Loading conversations...
                </div>
              )}

              {!isLoadingConversations && conversations.length === 0 && (
                <div className={styles.RecievedMessage}>
                  No conversations yet. Enter a wallet address below to start chatting!
                </div>
              )}

              {conversations.map((convo, idx) => (
                <div
                  key={idx}
                  className={styles.RecievedMessage}
                  style={{ cursor: "pointer" }}
                  onClick={() => xmtpClient && selectConversation(convo.conversation, xmtpClient)}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                    {truncateAddress(convo.peerInboxId)}
                  </div>
                  {convo.lastMessage && (
                    <div style={{ fontSize: "12px", opacity: 0.7 }}>
                      {convo.lastMessage.length > 50
                        ? convo.lastMessage.slice(0, 50) + "..."
                        : convo.lastMessage}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Single Conversation View */}
          {!isLoading && !showConversationList && currentConversation && (
            <>
              {messages.length === 0 && !error && (
                <div className={styles.RecievedMessage}>
                  No messages yet. Start a conversation!
                </div>
              )}

              {messages
                .filter(msg => {
                  // Filter out system/metadata messages
                  if (typeof msg.content === 'object' && msg.content !== null) {
                    // Skip membership update messages
                    if ('initiatedByInboxId' in msg.content) return false;
                    if ('membersAdded' in msg.content) return false;
                    if ('membersRemoved' in msg.content) return false;
                  }
                  return true;
                })
                .map((msg, idx) => {
                  // Extract text content
                  let displayContent = '';
                  if (typeof msg.content === 'string') {
                    displayContent = msg.content;
                  } else if (msg.content?.text) {
                    displayContent = msg.content.text;
                  } else if (msg.content?.content) {
                    displayContent = msg.content.content;
                  } else {
                    // Skip messages we can't display
                    return null;
                  }

                  if (!displayContent) return null;

                  return (
                    <div key={idx} className={msg.isSent ? styles.sentMessage : styles.RecievedMessage}>
                      <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>
                        {msg.isSent ? "You" : msg.senderName}
                      </div>
                      {displayContent}
                    </div>
                  );
                })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area - changes based on view */}
        <div className={styles.messageInputContainer}>
          <div className={styles.messageInput}>
            <img
              src="/Chat-Section-Icons/Frame.svg"
              alt="Frame"
              width={24}
              height={24}
              style={{ cursor: "pointer" }}
            />
            {showConversationList ? (
              // New chat input - enter wallet address
              <>
                <input
                  type="text"
                  placeholder="Enter wallet address to start chat..."
                  className={styles.input}
                  value={newRecipientAddress}
                  onChange={e => setNewRecipientAddress(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newRecipientAddress.trim()) startNewConversation(newRecipientAddress.trim()); }}
                  disabled={isLoading}
                />
                <span className={styles.chatInputIcons}>
                  <img
                    src="/contracts-Icons/Group 6.svg"
                    alt="Start Chat"
                    width={28}
                    height={28}
                    style={{ cursor: isLoading || !newRecipientAddress.trim() ? "not-allowed" : "pointer", opacity: isLoading || !newRecipientAddress.trim() ? 0.5 : 1 }}
                    onClick={() => newRecipientAddress.trim() && startNewConversation(newRecipientAddress.trim())}
                  />
                </span>
              </>
            ) : (
              // Message input - in conversation view
              <>
                <input
                  type="text"
                  placeholder={isLoading ? "Loading..." : "Message"}
                  className={styles.input}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                  disabled={isLoading || !currentConversation}
                />
                <span className={styles.chatInputIcons}>
                  <img
                    src="/contracts-Icons/Group 6.svg"
                    alt="Send"
                    width={28}
                    height={28}
                    style={{ cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1 }}
                    onClick={handleSend}
                  />
                </span>
              </>
            )}
          </div>
        </div>
      </main>
      </div>
    </Layout>
  );
};

export default Chat;