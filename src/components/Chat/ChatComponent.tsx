import React, { useEffect, useRef, useState } from "react";
import styles from "../../styles/CreateContract.module.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useXMTPConversation, MessageWithMetadata } from "../../hooks/useXMTPConversation";
import { isContactCard } from "../../types/contactMessage";
import { isContractProposal, ContractProposalMessage } from "../../types/contractMessage";
import { useProfileCache } from "../../contexts/ProfileCacheContext";
import ContractCard from "./ContractCard";

export interface ChatComponentProps {
  peerAddress: string | null;
  onBack?: () => void;
  embedded?: boolean;
  onMessageSent?: (msg: string) => void;
  onContractProposalSelect?: (proposal: ContractProposalMessage) => void;
}

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

// Check if message is a system/metadata message (should be hidden)
const isHiddenMessage = (content: any): boolean => {
  if (typeof content === "object" && content !== null) {
    if ("initiatedByInboxId" in content) return true;
    if ("membersAdded" in content) return true;
    if ("membersRemoved" in content) return true;
  }
  return false;
};

const ChatComponent: React.FC<ChatComponentProps> = ({
  peerAddress,
  onBack,
  embedded = false,
  onMessageSent,
  onContractProposalSelect,
}) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    conversation,
    messages,
    isLoading,
    isSyncing,
    error,
    sendMessage,
    sendContactCard,
    syncMessages,
    isClientReady,
    isClientLoading,
    showRevokeOption,
    handleRevokeAndRetry,
    receivedContactCard,
    hasSentContactCard,
  } = useXMTPConversation({ peerAddress });

  // Profile cache for contact cards
  const { currentUserProfile, setProfile, getProfile } = useProfileCache();

  // Get peer display name from profile cache
  const peerDisplayName = peerAddress
    ? getProfile(peerAddress)?.username || undefined
    : undefined;

  // Save received contact card to profile cache
  useEffect(() => {
    if (receivedContactCard) {
      setProfile({
        walletAddress: receivedContactCard.walletAddress,
        username: receivedContactCard.username,
        profilePictureUrl: receivedContactCard.profilePictureUrl,
        cachedAt: Date.now(),
      });
    }
  }, [receivedContactCard, setProfile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (message.trim() && conversation) {
      const msgContent = message;
      setMessage("");
      await sendMessage(msgContent);
      onMessageSent?.(msgContent);
      // Keep focus on input to prevent keyboard from closing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Combined loading state
  const isLoadingState = isClientLoading || isLoading;
  const needsWalletConnection = !isClientReady && !isClientLoading && !error;
  const noPeerProvided = !peerAddress && !isLoadingState && isClientReady;

  // Container class based on embedded mode
  const containerClass = embedded ? styles.chatContainer : styles.chatMain;

  return (
    <div className={containerClass}>
      {/* Action buttons - positioned in messages area */}
      {isClientReady && peerAddress && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            padding: "8px 16px",
            marginTop: embedded ? "0" : "70px",
          }}
        >
          <button
            onClick={async () => {
              if (currentUserProfile) {
                await sendContactCard(currentUserProfile.username, currentUserProfile.profilePictureUrl, true);
              }
            }}
            disabled={!currentUserProfile || isLoadingState}
            title={hasSentContactCard ? "Click to re-send your profile" : "Share your profile"}
            style={{
              padding: "6px 12px",
              background: hasSentContactCard
                ? "rgba(100, 200, 100, 0.3)"
                : "rgba(0, 0, 0, 0.5)",
              border: hasSentContactCard
                ? "1px solid rgba(100, 200, 100, 0.5)"
                : "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "16px",
              color: "white",
              cursor: !currentUserProfile || isLoadingState ? "not-allowed" : "pointer",
              fontSize: "12px",
              opacity: !currentUserProfile || isLoadingState ? 0.6 : 1,
            }}
          >
            {hasSentContactCard ? "✓ Shared" : "👤 Share"}
          </button>
          <button
            onClick={() => syncMessages()}
            disabled={isSyncing || isLoadingState}
            title="Sync messages"
            style={{
              padding: "6px 12px",
              background: "rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "16px",
              color: "white",
              cursor: isSyncing || isLoadingState ? "not-allowed" : "pointer",
              fontSize: "12px",
              opacity: isSyncing || isLoadingState ? 0.6 : 1,
            }}
          >
            {isSyncing ? "Syncing..." : "↻ Sync"}
          </button>
        </div>
      )}

      <div className={styles.messagesContainer}>
        {isLoadingState && (
          <div className={styles.RecievedMessage}>
            {isClientLoading ? "Loading XMTP client..." : "Loading conversation..."}
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
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    If that doesn&apos;t work, use XMTP CLI:
                  </div>
                  <code
                    style={{
                      display: "block",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    npm install -g @xmtp/cli
                  </code>
                  <code
                    style={{
                      display: "block",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    xmtp auth
                  </code>
                  <code
                    style={{
                      display: "block",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "8px",
                    }}
                  >
                    xmtp installations revoke-all-other
                  </code>
                </div>
              </>
            )}
          </div>
        )}

        {needsWalletConnection && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            <div className={styles.RecievedMessage}>Connect your wallet to use chat</div>
            <ConnectButton />
          </div>
        )}

        {noPeerProvided && (
          <div className={styles.RecievedMessage}>
            <div style={{ marginBottom: "12px" }}>
              {embedded
                ? "Enter the other party's wallet address to start chatting."
                : "No conversation selected."}
            </div>
            {onBack && !embedded && (
              <button
                onClick={onBack}
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
            )}
          </div>
        )}

        {/* Chat Messages */}
        {!isLoadingState && !noPeerProvided && conversation && (
          <>
            {messages.length === 0 && !error && (
              <div className={styles.RecievedMessage}>No messages yet. Start a conversation!</div>
            )}

            {messages
              .filter((msg) => !isHiddenMessage(msg.content) && !isContactCard(msg.content))
              .map((msg: MessageWithMetadata, idx) => {
                const msgTimestamp = msg.sentAtNs || (msg as any).sentAt || (msg as any).timestamp;

                // Check if this is a contract proposal
                if (isContractProposal(msg.content)) {
                  return (
                    <ContractCard
                      key={msg.id || idx}
                      proposal={msg.content}
                      isSent={msg.isSent || false}
                      senderName={msg.isSent ? "You" : (peerDisplayName || msg.senderName)}
                      sentAt={msgTimestamp}
                      onViewEdit={() => {
                        if (onContractProposalSelect) {
                          onContractProposalSelect(msg.content);
                        }
                      }}
                    />
                  );
                }

                // Regular text message
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

                return (
                  <div
                    key={msg.id || idx}
                    className={msg.isSent ? styles.sentMessage : styles.RecievedMessage}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        opacity: 0.8,
                        marginBottom: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{msg.isSent ? "You" : (peerDisplayName || msg.senderName)}</span>
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
          <img
            src="/Chat-Section-Icons/Frame.svg"
            alt="Frame"
            width={24}
            height={24}
            style={{ cursor: "pointer" }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={isLoadingState ? "Loading..." : "Message"}
            className={styles.input}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoadingState || !conversation}
          />
          <span className={styles.chatInputIcons}>
            <img
              src="/contracts-Icons/Group 6.svg"
              alt="Send"
              width={28}
              height={28}
              style={{
                cursor: isLoadingState || !conversation ? "not-allowed" : "pointer",
                opacity: isLoadingState || !conversation ? 0.5 : 1,
              }}
              onClick={handleSend}
            />
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
