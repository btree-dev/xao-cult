import React from "react";
import { ContactCardMessage } from "../../types/contactMessage";
import styles from "../../styles/CreateContract.module.css";

interface ContactCardDisplayProps {
  contact: ContactCardMessage;
  isSent: boolean;
  sentAt?: Date | string | number | bigint;
}

// Format timestamp for display
const formatTime = (sentAt: Date | string | number | bigint | undefined): string => {
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

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ContactCardDisplay: React.FC<ContactCardDisplayProps> = ({
  contact,
  isSent,
  sentAt,
}) => {
  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div
      className={isSent ? styles.sentMessage : styles.RecievedMessage}
      style={{
        padding: "12px 16px",
        maxWidth: "280px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: "10px",
          opacity: 0.7,
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{isSent ? "You shared your profile" : "Profile shared"}</span>
        <span>{formatTime(sentAt)}</span>
      </div>

      {/* Contact Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: contact.profilePictureUrl
              ? `url(${contact.profilePictureUrl}) center/cover`
              : "linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "16px",
            flexShrink: 0,
          }}
        >
          {!contact.profilePictureUrl && contact.username?.[0]?.toUpperCase()}
        </div>

        {/* Name and Address */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: "600",
              fontSize: "14px",
              color: "white",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contact.username || "Unknown"}
          </div>
          <div
            style={{
              fontSize: "11px",
              opacity: 0.7,
              color: "white",
            }}
          >
            {truncateAddress(contact.walletAddress)}
          </div>
        </div>
      </div>

      {/* Badge */}
      <div
        style={{
          marginTop: "8px",
          padding: "4px 8px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          fontSize: "10px",
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.8)",
        }}
      >
        👤 Contact Card
      </div>
    </div>
  );
};

export default ContactCardDisplay;
