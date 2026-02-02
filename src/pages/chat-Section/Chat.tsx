import React, { useEffect, useRef, useState } from "react";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { supabase } from "../../lib/supabase";
import RecipientSelector from "../../components/RecipientSelector";
import { Client, type Signer, type DecodedMessage } from "@xmtp/browser-sdk";
import { ethers } from "ethers";

interface MessageWithMetadata extends DecodedMessage<any> {
  senderName?: string;
  senderImage?: string;
  isSent?: boolean;
}

const Chat: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageWithMetadata[]>([]);
  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);
  const [xmtpClient, setXmtpClient] = useState<Client<any> | null>(null);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize XMTP Client
  const initializeXMTP = async (signer: Signer) => {
    try {
      setIsLoading(true);
      const client = await Client.create(signer, {
        env: "dev",
        appVersion: "xao-cult/1.0.0",
      });
      setXmtpClient(client);
      setError(null);
    } catch (err) {
      console.error("Failed to initialize XMTP client:", err);
      setError("Failed to initialize XMTP client");
    } finally {
      setIsLoading(false);
    }
  };

  // Create or fetch conversation
  const initializeConversation = async (client: Client<any>) => {
    try {
      const recipientInboxId = localStorage.getItem("chatRecipientInboxId");

      if (!recipientInboxId) {
        console.log("No recipient set. Please set XMTP recipient inbox ID.");
        setIsLoading(false);
        return null;
      }

      const dm = await client.conversations.newDm(recipientInboxId);
      setCurrentConversation(dm);
      conversationRef.current = dm;

      // Load existing messages
      await loadMessages(dm, client);

      // Cancel any existing stream before starting a new one
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
      streamAbortRef.current = new AbortController();

      // Stream new messages
      streamMessages(dm, client, streamAbortRef.current.signal).catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Stream error:", err);
        }
      });

      return dm;
    } catch (err) {
      console.error("Failed to initialize conversation:", err);
      setError("Failed to initialize conversation");
      return null;
    }
  };

  // Load existing messages from conversation
  const loadMessages = async (conversation: any, client: Client<any>) => {
    try {
      const msgs = await conversation.messages({ limit: 50n });
      const formattedMessages = msgs.map((msg: DecodedMessage<any>) => ({
        ...msg,
        senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : "Recipient",
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
      const stream = conversation.stream();

      // Handle abort signal
      signal.addEventListener('abort', () => {
        stream.return?.();
      });

      for await (const msg of stream) {
        if (signal.aborted) break;

        const messageWithMetadata: MessageWithMetadata = {
          ...msg,
          senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : "Recipient",
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
        // Check if MetaMask is available
        const provider = new ethers.providers.Web3Provider((window as any).ethereum);
        const signer = provider.getSigner();

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
        setError("Please connect your MetaMask wallet");
      }
    };

    initializeXMTPConnection();
  }, []);

  // Initialize conversation when client is ready
  useEffect(() => {
    if (xmtpClient && !currentConversation) {
      initializeConversation(xmtpClient);
    }

    // Cleanup stream on unmount
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
    };
  }, [xmtpClient, currentConversation]);

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
          <title>Notification Chat - XAO Cult</title>
          <meta name="description" content="Chat" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
          userName={userName}
          userImage={userImage}
          rightIcon="/Chat-Section-Icons/Search_Magnifying_Glass.svg"
        />

        {!currentConversation && !isLoading && (
          <div style={{ padding: "20px", textAlign: "center" }}>
            <p>Start by setting a recipient to begin chatting</p>
            <RecipientSelector
              onRecipientSelect={(inboxId) => {
                if (xmtpClient) {
                  initializeConversation(xmtpClient);
                }
              }}
            />
          </div>
        )}
        
        <main className={styles.chatMain}>
        <div className={styles.messagesContainer}>
          {isLoading && <div>Loading XMTP client...</div>}
          {error && <div style={{ color: "red", padding: "10px" }}>Error: {error}</div>}
          
          {!isLoading && messages.length === 0 && !error && (
            <div className={styles.RecievedMessage}>
              No messages yet. Start a conversation!
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.isSent ? styles.sentMessage : styles.RecievedMessage}>
              <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>
                {msg.senderName}
              </div>
              {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className={styles.messageInputContainer}>
          <div className={styles.messageInput}>
            <img
              src="/Chat-Section-Icons/Frame.svg"
              alt="Frame"
              width={24}
              height={24}
              style={{ cursor: "pointer" }}
            />
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
                alt="Group6"
                width={28}
                height={28}
                style={{ cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1 }}
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