import React, { useEffect, useRef, useState } from "react";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { supabase } from "../../lib/supabase";
import { Client, type Signer, type DecodedMessage, type Identifier } from "@xmtp/browser-sdk";
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
  peerAddress?: string;
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
  const [showRevokeOption, setShowRevokeOption] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<any>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const clientRef = useRef<Client<any> | null>(null);
  const signerRef = useRef<Signer | null>(null);
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
  const truncateAddress = (address: string | unknown): string => {
    if (!address || typeof address !== 'string') return "Unknown";
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Format timestamp for message display
  const formatMessageTime = (sentAt: Date | string | number | bigint | undefined): string => {
    if (!sentAt) return "";

    let timestamp: number;

    // Handle BigInt (nanoseconds from XMTP)
    if (typeof sentAt === 'bigint') {
      timestamp = Number(sentAt / BigInt(1000000)); // Convert ns to ms
    } else if (typeof sentAt === 'number') {
      // Check if it's in nanoseconds (very large number) or milliseconds
      timestamp = sentAt > 1e15 ? sentAt / 1000000 : sentAt > 1e12 ? sentAt : sentAt * 1000;
    } else if (typeof sentAt === 'string') {
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

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return timeStr;
    } else if (isYesterday) {
      return `Yesterday ${timeStr}`;
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
    }
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
  const initializeXMTP = async (signer: Signer, forceRevoke = false) => {
    try {
      setIsLoading(true);

      // Get wallet address first for db path
      const identifierResult = await signer.getIdentifier();
      const address = identifierResult.identifier.toLowerCase();
      setWalletAddress(address);

      // Use wallet-specific database path for persistent installation
      const dbPath = `xmtp-${address}`;

      // Create identifier for Client.build (to restore existing installation)
      const identifier: Identifier = {
        identifier: address,
        identifierKind: "Ethereum",
      };

      let client: Client<any>;
      let needsCreate = false;

      // Try to restore existing client from database first (avoids creating new installation)
      // Note: Client.build() takes an Identifier, not a Signer - this allows reusing
      // the existing installation without requiring a new signature
      try {
        client = await Client.build(identifier, {
          env: "dev",
          appVersion: "xao-cult/1.0.0",
          dbPath,
        });

        // Verify the client has a valid identity by checking inboxId
        if (!client.inboxId) {
          console.log("Client.build() returned client without valid identity, falling back to create");
          needsCreate = true;
        } else {
          console.log("Restored existing XMTP client from database, inboxId:", client.inboxId);
        }
      } catch (buildErr) {
        // If build fails (no existing installation), create a new one with signer
        console.log("Client.build() failed, will create new client:", buildErr);
        needsCreate = true;
      }

      // Create new client if build failed or returned invalid client
      if (needsCreate) {
        client = await Client.create(signer, {
          env: "dev",
          appVersion: "xao-cult/1.0.0",
          dbPath,
        });
        console.log("Created new XMTP client, inboxId:", client.inboxId);
      }

      // If we were asked to revoke old installations, do it now
      if (forceRevoke) {
        try {
          console.log("Revoking old XMTP installations...");
          await client.revokeAllOtherInstallations();
          console.log("Successfully revoked old installations");
        } catch (revokeErr) {
          console.error("Failed to revoke installations:", revokeErr);
        }
      }

      setXmtpClient(client);
      setError(null);

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
      if (err.message?.includes("installations") || err.message?.includes("10/10")) {
        showCliInstructions();
        setError("Too many devices registered (10/10 limit). Click below to try clearing local data, or use XMTP CLI (see browser console for instructions).");
        setShowRevokeOption(true);
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
            // Get more messages to find the last non-system message
            const msgs = await convo.messages({ limit: BigInt(10) });
            // Find the first message that isn't a system message
            for (const msg of msgs) {
              if (typeof msg.content === 'object' && msg.content !== null) {
                if ('initiatedByInboxId' in msg.content) continue;
                if ('membersAdded' in msg.content) continue;
                if ('membersRemoved' in msg.content) continue;
              }
              // Extract text content
              if (typeof msg.content === 'string') {
                lastMessage = msg.content;
              } else if (msg.content?.text) {
                lastMessage = msg.content.text;
              } else if (msg.content?.content) {
                lastMessage = msg.content.content;
              } else {
                continue; // Skip if we can't extract text
              }
              lastMessageTime = msg.sentAt ? new Date(msg.sentAt) : undefined;
              break;
            }
          } catch (e) {
            console.error("Error loading last message:", e);
          }

          // Get peer inbox ID (the other participant)
          // Note: peerInboxId might be a getter method or async in some XMTP SDK versions
          let peerInboxId: string = "Unknown";
          try {
            let rawPeerInboxId = convo.peerInboxId;
            // Handle if it's a function (getter method)
            if (typeof rawPeerInboxId === 'function') {
              rawPeerInboxId = rawPeerInboxId.call(convo);
            }
            // Handle if it's a Promise
            if (rawPeerInboxId && typeof rawPeerInboxId === 'object' && 'then' in rawPeerInboxId) {
              rawPeerInboxId = await rawPeerInboxId;
            }
            peerInboxId = String(rawPeerInboxId || convo.id || "Unknown");
          } catch (e) {
            peerInboxId = String(convo.id || "Unknown");
          }

          // Try to resolve inbox ID to wallet address
          let peerAddress: string | undefined;
          try {
            // First check if conversation has peer addresses directly
            if (convo.peerAddresses && convo.peerAddresses.length > 0) {
              peerAddress = convo.peerAddresses[0];
            }
            // Try members() if available (for group chats or DMs)
            else if (typeof convo.members === 'function') {
              const members = await convo.members();
              const otherMember = members?.find((m: any) => m.inboxId !== client.inboxId);
              // XMTP SDK uses accountIdentifiers[].identifier for wallet addresses
              if (otherMember?.accountIdentifiers?.length > 0) {
                peerAddress = otherMember.accountIdentifiers[0].identifier;
              }
            }
          } catch (e) {
            // Silently fail - we'll fall back to showing inbox ID
            console.debug("Could not resolve inbox ID to address:", e);
          }

          return {
            conversation: convo,
            peerInboxId,
            peerAddress,
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

  // List all IndexedDB databases to find XMTP ones
  const findXmtpDatabases = async (): Promise<string[]> => {
    try {
      if ('databases' in indexedDB) {
        const dbs = await indexedDB.databases();
        return dbs
          .map(db => db.name)
          .filter((name): name is string => !!name && name.includes('xmtp'));
      }
    } catch (e) {
      console.error("Failed to list databases:", e);
    }
    return [];
  };

  // Handle revoking old installations and retrying
  const handleRevokeAndRetry = async () => {
    if (!signerRef.current) {
      setError("No wallet connected. Please refresh and try again.");
      return;
    }

    setShowRevokeOption(false);
    setError("Clearing old installations... This may take a moment.");
    setIsLoading(true);

    try {
      // Find all existing XMTP databases
      const existingDbs = await findXmtpDatabases();
      console.log("Found XMTP databases:", existingDbs);

      // Delete all XMTP IndexedDB databases to start fresh
      for (const dbName of existingDbs) {
        try {
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => {
              console.warn(`Database ${dbName} delete blocked, continuing...`);
              resolve();
            };
          });
          console.log(`Deleted database: ${dbName}`);
        } catch (e) {
          console.error(`Failed to delete ${dbName}:`, e);
        }
      }

      // Also try common XMTP database names
      const commonDbNames = [
        `xmtp-${walletAddress?.toLowerCase()}`,
        'xmtp',
        'xmtp-dev',
        'xmtp-production',
      ];

      for (const dbName of commonDbNames) {
        if (!existingDbs.includes(dbName)) {
          try {
            await new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(dbName);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            });
          } catch (e) {
            // Ignore errors
          }
        }
      }

      // Clear encryption key to generate fresh one
      localStorage.removeItem("xmtp_encryption_key");

      // Brief delay to ensure DB cleanup completes
      await new Promise(resolve => setTimeout(resolve, 1000));

      setError(null);

      // Reinitialize - this will create a fresh installation
      // Note: If still at 10/10 limit, user needs to use XMTP CLI
      await initializeXMTP(signerRef.current, true);
    } catch (err: any) {
      console.error("Failed during cleanup:", err);
      setError("Cleanup failed. See console for XMTP CLI instructions.");
      setIsLoading(false);
      showCliInstructions();
    }
  };

  // Show instructions for using XMTP CLI to revoke installations
  const showCliInstructions = () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  XMTP Installation Limit Reached - Manual Cleanup Required     ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Your wallet has 10/10 XMTP installations registered.          ║
║  To fix this, you need to revoke old installations.            ║
║                                                                ║
║  Option 1: Use a different wallet address                      ║
║                                                                ║
║  Option 2: Use XMTP CLI to revoke installations:               ║
║    1. Install: npm install -g @xmtp/cli                        ║
║    2. Run: xmtp auth                                           ║
║    3. Run: xmtp installations revoke-all-other                 ║
║    4. Refresh this page                                        ║
║                                                                ║
║  Option 3: Wait for installations to expire (30 days)          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
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

  // Cache for resolved addresses to avoid repeated lookups
  const addressCacheRef = useRef<Map<string, string>>(new Map());

  // Resolve inbox ID to wallet address using conversation members
  const resolveInboxIdToAddress = async (client: Client<any>, inboxId: string, conversation?: any): Promise<string> => {
    if (!inboxId || inboxId === client.inboxId) return inboxId;

    // Check cache first
    if (addressCacheRef.current.has(inboxId)) {
      return addressCacheRef.current.get(inboxId)!;
    }

    try {
      // Try to get address from conversation members
      if (conversation && typeof conversation.members === 'function') {
        const members = await conversation.members();
        const member = members?.find((m: any) => m.inboxId === inboxId);
        if (member?.accountIdentifiers?.length > 0) {
          const address = member.accountIdentifiers[0].identifier;
          addressCacheRef.current.set(inboxId, address);
          return address;
        }
      }
    } catch (e) {
      console.debug("Could not resolve inbox ID to address:", e);
    }
    return inboxId; // Fallback to inbox ID
  };

  // Load existing messages from conversation
  const loadMessages = async (conversation: any, client: Client<any>) => {
    try {
      const msgs = await conversation.messages({ limit: BigInt(50) });

      // Resolve addresses from conversation members
      const addressMap = new Map<string, string>();
      try {
        if (typeof conversation.members === 'function') {
          const members = await conversation.members();
          members?.forEach((member: any) => {
            if (member.inboxId && member.accountIdentifiers?.length > 0) {
              const address = member.accountIdentifiers[0].identifier;
              addressMap.set(member.inboxId, address);
              // Also cache it
              addressCacheRef.current.set(member.inboxId, address);
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
        // Sort by sentAt timestamp (oldest first for chat display)
        .sort((a, b) => {
          const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
          const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
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

        // Resolve sender address for received messages
        let senderAddress = msg.senderInboxId || "Unknown";
        if (msg.senderInboxId && msg.senderInboxId !== client.inboxId) {
          senderAddress = await resolveInboxIdToAddress(client, msg.senderInboxId, conversation);
        }

        const messageWithMetadata: MessageWithMetadata = {
          ...msg,
          senderName: msg.senderInboxId === client.inboxId ? userNameRef.current : truncateAddress(senderAddress),
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

        signerRef.current = signerObj;
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
                      width: "100%"
                    }}
                  >
                    Try Clearing Local Data
                  </button>
                  <div style={{ marginTop: "16px", fontSize: "12px", opacity: 0.9 }}>
                    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>If that doesn&apos;t work, use XMTP CLI:</div>
                    <code style={{
                      display: "block",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "8px",
                      marginBottom: "4px"
                    }}>
                      npm install -g @xmtp/cli
                    </code>
                    <code style={{
                      display: "block",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "8px",
                      marginBottom: "4px"
                    }}>
                      xmtp auth
                    </code>
                    <code style={{
                      display: "block",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "8px"
                    }}>
                      xmtp installations revoke-all-other
                    </code>
                  </div>
                </>
              )}
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

              <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                {conversations.map((convo, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 16px",
                      cursor: "pointer",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.05)",
                      transition: "background 0.2s ease",
                    }}
                    onClick={() => xmtpClient && selectConversation(convo.conversation, xmtpClient)}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: "12px",
                      flexShrink: 0,
                    }}>
                      <span style={{ color: "white", fontWeight: "bold", fontSize: "14px" }}>
                        {(convo.peerAddress || convo.peerInboxId || "?").slice(2, 4).toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px"
                      }}>
                        <span style={{ fontWeight: "600", color: "#fff", fontSize: "14px" }}>
                          {truncateAddress(convo.peerAddress || convo.peerInboxId)}
                        </span>
                        {convo.lastMessageTime && (
                          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginLeft: "8px", flexShrink: 0 }}>
                            {formatMessageTime(convo.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {convo.lastMessage && (
                        <div style={{
                          fontSize: "13px",
                          color: "rgba(255,255,255,0.6)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {convo.lastMessage}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <div style={{ marginLeft: "8px", color: "rgba(255,255,255,0.3)" }}>
                      ›
                    </div>
                  </div>
                ))}
              </div>
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

                  // Get timestamp - XMTP SDK may use sentAt, sentAtNs, or timestamp
                  const msgTimestamp = msg.sentAt || msg.sentAtNs || (msg as any).timestamp || (msg as any).createdAt;

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