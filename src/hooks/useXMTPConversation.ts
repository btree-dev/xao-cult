import { useState, useEffect, useRef, useCallback } from "react";
import { Client, type DecodedMessage } from "@xmtp/browser-sdk";
import { useXMTPClient } from "../contexts/XMTPContext";
import {
  ContactCardMessage,
  isContactCard,
  createContactCard,
} from "../types/contactMessage";
import {
  ContractProposalMessage,
  isContractProposal,
  createContractProposal,
} from "../types/contractMessage";
import { IContract } from "../backend/services/types/api";

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
  sendMessage: (content: string | object) => Promise<void>;
  sendContactCard: (username: string, profilePictureUrl?: string, force?: boolean) => Promise<void>;
  sendContractProposal: (
    contractData: Partial<IContract>,
    revisionNumber?: number
  ) => Promise<void>;
  syncMessages: () => Promise<void>;
  peerAddress: string | null;
  // Forwarded from useXMTPClient
  isClientReady: boolean;
  isClientLoading: boolean;
  clientError: string | null;
  showRevokeOption: boolean;
  handleRevokeAndRetry: () => Promise<void>;
  walletAddress: string | null;
  // Contact card tracking
  hasSentContactCard: boolean;
  receivedContactCard: ContactCardMessage | null;
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

// Try to parse message content as JSON (for structured messages like contact cards and proposals)
const parseMessageContent = (content: any): any => {
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      // Check if it's a structured message type we recognize
      if (parsed && typeof parsed === "object" && parsed.type) {
        return parsed;
      }
    } catch {
      // Not JSON, return as-is
    }
  }
  return content;
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
  const [hasSentContactCard, setHasSentContactCard] = useState(false);
  const [receivedContactCard, setReceivedContactCard] = useState<ContactCardMessage | null>(null);

  const streamAbortRef = useRef<AbortController | null>(null);
  const currentPeerRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const contactCardSentForPeerRef = useRef<string | null>(null);

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
      console.log("[XMTP] Loaded", msgs.length, "messages from conversation");

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

      // Check for contact cards and contract proposals in messages
      let foundContactCard: ContactCardMessage | null = null;
      let alreadySentOwnCard = false;
      for (const msg of msgs) {
        const parsedContent = parseMessageContent(msg.content);
        const isFromPeer = msg.senderInboxId !== client.inboxId;

        if (isFromPeer && isContactCard(parsedContent) && !foundContactCard) {
          foundContactCard = parsedContent;
        }

        if (!isFromPeer && isContactCard(parsedContent)) {
          alreadySentOwnCard = true;
        }
      }
      if (foundContactCard) {
        setReceivedContactCard(foundContactCard);
      }
      if (alreadySentOwnCard) {
        contactCardSentForPeerRef.current = currentPeerRef.current;
        setHasSentContactCard(true);
      }

      const formattedMessages = msgs
        .filter((msg: DecodedMessage<any>) => !isSystemMessage(msg.content))
        .map((msg: DecodedMessage<any>) => {
          const senderAddress = addressMap.get(msg.senderInboxId) || msg.senderInboxId;
          // Parse content to handle JSON-encoded structured messages
          const parsedContent = parseMessageContent(msg.content);
          return {
            ...msg,
            content: parsedContent,
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

      console.log("[XMTP] Formatted", formattedMessages.length, "messages for display");
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

          // Parse content to handle JSON-encoded structured messages
          const parsedContent = parseMessageContent(msg.content);
          const isFromPeer = msg.senderInboxId !== client.inboxId;

          console.log("[XMTP Stream] Received message:", {
            type: typeof parsedContent === "object" ? parsedContent?.type : "text",
            fromPeer: isFromPeer,
            contentPreview: typeof parsedContent === "string"
              ? parsedContent.slice(0, 50)
              : JSON.stringify(parsedContent).slice(0, 100),
          });

          // Check if this is a contact card from peer
          if (isFromPeer && isContactCard(parsedContent)) {
            console.log("[XMTP Stream] Received contact card from peer:", parsedContent.username);
            setReceivedContactCard(parsedContent);
            // Contact cards are processed but not added to visible messages
            continue;
          }

          // Log contract proposals
          if (isContractProposal(parsedContent)) {
            console.log("[XMTP Stream] Received contract proposal:", {
              revision: parsedContent.revisionNumber,
              fromPeer: isFromPeer,
            });
          }

          const messageWithMetadata: MessageWithMetadata = {
            ...msg,
            content: parsedContent,
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
            console.log("[XMTP Stream] Adding message to display");
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

          // Create new DM using identifier (address + kind)
          conv = await (client.conversations as any).newDmWithIdentifier(peerIdentifier);
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

  // Send message (supports both string and object content)
  const sendMessage = useCallback(
    async (content: string | object) => {
      if (!conversation) {
        return;
      }

      // For string content, check if empty
      if (typeof content === "string" && !content.trim()) {
        return;
      }

      try {
        // XMTP requires text - serialize objects to JSON string
        const messageContent = typeof content === "string"
          ? content
          : JSON.stringify(content);
        await conversation.send(messageContent);
      } catch (err) {
        console.error("Failed to send message:", err);
        setError("Failed to send message");
      }
    },
    [conversation]
  );

  // Send contact card (force=true to re-send even if already sent)
  const sendContactCard = useCallback(
    async (username: string, profilePictureUrl?: string, force: boolean = false) => {
      if (!conversation || !walletAddress) {
        console.log("[XMTP] Cannot send contact card: no conversation or wallet");
        return;
      }
      if (!force && contactCardSentForPeerRef.current === currentPeerRef.current) {
        // Already sent contact card to this peer
        console.log("[XMTP] Contact card already sent to this peer");
        return;
      }

      try {
        const card = createContactCard(walletAddress, username, profilePictureUrl);
        console.log("[XMTP] Sending contact card:", card);

        // Send with timeout to handle hanging promises
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Send timeout")), 5000)
        );

        try {
          const result = await Promise.race([
            conversation.send(JSON.stringify(card)),
            timeoutPromise,
          ]);
          console.log("[XMTP] Send result:", result);
        } catch (sendErr: any) {
          console.warn("[XMTP] Send issue (may still succeed):", sendErr?.message || sendErr);
        }

        // Mark as sent regardless - the XMTP warning doesn't mean failure
        contactCardSentForPeerRef.current = currentPeerRef.current;
        setHasSentContactCard(true);
        console.log("[XMTP] Contact card marked as sent");
      } catch (err: any) {
        console.error("[XMTP] Failed to send contact card:", err);
        // Still mark as sent to update UI
        setHasSentContactCard(true);
      }
    },
    [conversation, walletAddress]
  );

  // Send contract proposal
  const sendContractProposal = useCallback(
    async (contractData: Partial<IContract>, revisionNumber: number = 1) => {
      if (!conversation || !walletAddress) {
        console.error("Cannot send proposal: no conversation or wallet address");
        return;
      }

      try {
        const proposal = createContractProposal(
          contractData,
          walletAddress,
          revisionNumber
        );
        // Serialize to JSON for XMTP
        await conversation.send(JSON.stringify(proposal));
        console.log("[XMTP] Contract proposal sent, revision:", revisionNumber);
      } catch (err) {
        console.error("Failed to send contract proposal:", err);
        setError("Failed to send contract proposal");
      }
    },
    [conversation, walletAddress]
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
      setHasSentContactCard(false);
      setReceivedContactCard(null);
      currentPeerRef.current = null;
      hasInitializedRef.current = false;
      contactCardSentForPeerRef.current = null;
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

    // Reset messages and contact card state for new peer
    setMessages([]);
    setConversation(null);
    setError(null);
    setHasSentContactCard(false);
    setReceivedContactCard(null);
    contactCardSentForPeerRef.current = null;

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
    sendContactCard,
    sendContractProposal,
    syncMessages,
    peerAddress: currentPeerAddress,
    isClientReady: !!xmtpClient,
    isClientLoading: isXmtpLoading,
    clientError: xmtpError,
    showRevokeOption,
    handleRevokeAndRetry,
    walletAddress,
    hasSentContactCard,
    receivedContactCard,
  };
}
