import { useState, useEffect, useRef, useCallback } from "react";
import { Client, type DecodedMessage } from "@xmtp/browser-sdk";
import { useXMTPClient } from "../contexts/XMTPContext";

export interface MessageWithMetadata extends DecodedMessage<any> {
  senderName?: string;
  senderImage?: string;
  isSent?: boolean;
}

export interface UseXMTPConversationOptions {
  peerAddress: string | null;
}

export interface UseXMTPConversationResult {
  conversation: any | null;
  messages: MessageWithMetadata[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  syncMessages: () => Promise<void>;
  peerAddress: string | null;
  // Forwarded from useXMTPClient
  isClientReady: boolean;
  isClientLoading: boolean;
  clientError: string | null;
  showRevokeOption: boolean;
  handleRevokeAndRetry: () => Promise<void>;
  walletAddress: string | null;
}

// Truncate address for display
const truncateAddress = (address: string | unknown): string => {
  if (!address || typeof address !== "string") return "Unknown";
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
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

export function useXMTPConversation({
  peerAddress: peerAddressProp,
}: UseXMTPConversationOptions): UseXMTPConversationResult {
  const [conversation, setConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<MessageWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPeerAddress, setCurrentPeerAddress] = useState<string | null>(null);

  const streamAbortRef = useRef<AbortController | null>(null);
  const currentPeerRef = useRef<string | null>(null);
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

  // Load existing messages from conversation
  const loadMessages = useCallback(async (conv: any, client: Client<any>) => {
    try {
      const msgs = await conv.messages({ limit: BigInt(50) });

      // Resolve addresses from conversation members
      const addressMap = new Map<string, string>();
      try {
        if (typeof conv.members === "function") {
          const members = await conv.members();
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
            senderName:
              msg.senderInboxId === client.inboxId
                ? "You"
                : truncateAddress(senderAddress || "Unknown"),
            senderImage:
              msg.senderInboxId === client.inboxId
                ? undefined
                : "/Chat-Section-Icons/Image 1.svg",
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
  }, []);

  // Stream new messages in real-time
  const streamMessages = useCallback(
    async (conv: any, client: Client<any>, signal: AbortSignal) => {
      try {
        if (!conv.stream) {
          console.log("Stream not available for this conversation");
          return;
        }

        const stream = await conv.stream();

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
            senderName:
              msg.senderInboxId === client.inboxId
                ? "You"
                : truncateAddress(msg.senderInboxId),
            senderImage:
              msg.senderInboxId === client.inboxId
                ? undefined
                : "/Chat-Section-Icons/Image 1.svg",
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
    },
    []
  );

  // Initialize or find conversation with peer
  const initializeConversation = useCallback(
    async (peer: string, client: Client<any>) => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedPeer = peer.toLowerCase();
        setCurrentPeerAddress(normalizedPeer);

        // Sync conversations first
        await client.conversations.sync();

        // Try to find existing conversation
        const convos = await client.conversations.list();
        let conv = null;

        for (const convo of convos) {
          try {
            // Cast to any for flexible property access
            const convoAny = convo as any;

            // Check peer addresses
            if (
              convoAny.peerAddresses?.some(
                (addr: string) => addr.toLowerCase() === normalizedPeer
              )
            ) {
              conv = convo;
              break;
            }

            // Check members
            if (typeof convoAny.members === "function") {
              const members = await convoAny.members();
              const peerMember = members?.find((m: any) =>
                m.accountIdentifiers?.some(
                  (id: any) => id.identifier?.toLowerCase() === normalizedPeer
                )
              );
              if (peerMember) {
                conv = convo;
                break;
              }
            }

            // Check peerInboxId
            let peerInboxId = convoAny.peerInboxId;
            if (typeof peerInboxId === "function") peerInboxId = peerInboxId.call(convo);
            if (peerInboxId && typeof peerInboxId === "object" && "then" in peerInboxId)
              peerInboxId = await peerInboxId;
            if (String(peerInboxId).toLowerCase() === normalizedPeer) {
              conv = convo;
              break;
            }
          } catch (e) {
            // Continue checking other conversations
          }
        }

        // Create new conversation if not found
        if (!conv) {
          console.log("[useXMTPConversation] Creating new conversation with:", normalizedPeer);

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
          conv = await client.conversations.newDm(normalizedPeer as any);
          console.log("[useXMTPConversation] New conversation created");
        }

        // Set up conversation
        setConversation(conv);

        // Abort previous stream
        if (streamAbortRef.current) {
          streamAbortRef.current.abort();
        }

        // Load messages and start streaming
        await loadMessages(conv, client);

        streamAbortRef.current = new AbortController();
        streamMessages(conv, client, streamAbortRef.current.signal).catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Message stream error:", err);
          }
        });
      } catch (err: any) {
        console.error("[useXMTPConversation] Failed to initialize conversation:", err);
        setError(
          err.message || "Failed to start conversation. Make sure the recipient has XMTP enabled."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [loadMessages, streamMessages]
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !conversation) {
        return;
      }

      try {
        await conversation.send(content);
      } catch (err) {
        console.error("Failed to send message:", err);
        setError("Failed to send message");
      }
    },
    [conversation]
  );

  // Sync messages manually
  const syncMessages = useCallback(async () => {
    if (!conversation || !xmtpClient) return;

    setIsSyncing(true);
    try {
      await conversation.sync();
      await loadMessages(conversation, xmtpClient);
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [conversation, xmtpClient, loadMessages]);

  // Watch for peer changes and reinitialize
  useEffect(() => {
    // Reset state when no peer
    if (!peerAddressProp) {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
      setConversation(null);
      setMessages([]);
      setCurrentPeerAddress(null);
      setError(null);
      currentPeerRef.current = null;
      hasInitializedRef.current = false;
      return;
    }

    // Skip if XMTP client not ready
    if (!xmtpClient) {
      return;
    }

    const normalizedPeer = peerAddressProp.toLowerCase();

    // Skip if already initialized for this peer
    if (normalizedPeer === currentPeerRef.current) {
      return;
    }

    // Abort previous stream if peer changed
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }

    // Reset messages for new peer
    setMessages([]);
    setConversation(null);
    setError(null);

    // Initialize conversation with new peer
    currentPeerRef.current = normalizedPeer;
    initializeConversation(normalizedPeer, xmtpClient);
  }, [peerAddressProp, xmtpClient, initializeConversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }
    };
  }, []);

  return {
    conversation,
    messages,
    isLoading,
    isSyncing,
    error: error || xmtpError,
    sendMessage,
    syncMessages,
    peerAddress: currentPeerAddress,
    isClientReady: !!xmtpClient,
    isClientLoading: isXmtpLoading,
    clientError: xmtpError,
    showRevokeOption,
    handleRevokeAndRetry,
    walletAddress,
  };
}
