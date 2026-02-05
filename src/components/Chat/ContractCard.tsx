import React from "react";
import { ContractProposalMessage } from "../../types/contractMessage";
import styles from "./ContractCard.module.css";

interface ContractCardProps {
  proposal: ContractProposalMessage;
  isSent: boolean;
  senderName?: string;
  sentAt?: bigint | number | Date;
  onViewEdit?: () => void;
}

// Truncate address for display
const truncateAddress = (address: string | undefined): string => {
  if (!address) return "Unknown";
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

// Format timestamp for display
const formatTime = (sentAt: bigint | number | Date | undefined): string => {
  if (!sentAt) return "";

  let timestamp: number;

  if (typeof sentAt === "bigint") {
    timestamp = Number(sentAt / BigInt(1000000));
  } else if (typeof sentAt === "number") {
    timestamp = sentAt > 1e15 ? sentAt / 1000000 : sentAt > 1e12 ? sentAt : sentAt * 1000;
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

const ContractCard: React.FC<ContractCardProps> = ({
  proposal,
  isSent,
  senderName,
  sentAt,
  onViewEdit,
}) => {
  const { data, revisionNumber } = proposal;

  // Extract summary info from contract data
  const venueName = data.location?.venueName;
  const showDate = data.datesAndTimes?.showDate;
  const party1 = data.party1;
  const party2 = data.party2;

  const cardClass = `${styles.contractCard} ${
    isSent ? styles.contractCardSent : styles.contractCardReceived
  }`;

  const buttonClass = `${styles.viewButton} ${
    isSent ? styles.viewButtonSent : styles.viewButtonReceived
  }`;

  return (
    <div className={cardClass} onClick={onViewEdit}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardSender}>{senderName || "Unknown"}</span>
        <span className={styles.cardTime}>{formatTime(sentAt)}</span>
      </div>

      {/* Title */}
      <div className={styles.cardTitle}>
        <div className={styles.cardIcon}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <span className={styles.cardTitleText}>Contract Proposal</span>
        <span className={styles.revisionBadge}>Rev. {revisionNumber}</span>
      </div>

      {/* Summary */}
      <div className={styles.cardSummary}>
        {venueName && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Venue:</span>
            <span className={styles.summaryValue}>{venueName}</span>
          </div>
        )}
        {showDate && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Date:</span>
            <span className={styles.summaryValue}>{showDate}</span>
          </div>
        )}
        {party1 && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Party 1:</span>
            <span className={styles.summaryValue}>{truncateAddress(party1)}</span>
          </div>
        )}
        {party2 && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Party 2:</span>
            <span className={styles.summaryValue}>{truncateAddress(party2)}</span>
          </div>
        )}
        {!venueName && !showDate && !party1 && !party2 && (
          <div className={styles.summaryRow}>
            <span className={styles.summaryValue}>Contract details attached</span>
          </div>
        )}
      </div>

      {/* View/Edit Button */}
      <button className={buttonClass} onClick={(e) => { e.stopPropagation(); onViewEdit?.(); }}>
        <svg
          className={styles.viewButtonIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        View / Edit Contract
      </button>
    </div>
  );
};

export default ContractCard;
