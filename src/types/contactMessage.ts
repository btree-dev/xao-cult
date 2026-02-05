/**
 * Contact Card Message Type
 *
 * Used for exchanging profile information between chat participants.
 * When a user starts a conversation, they send their contact card.
 * When the peer responds, they send theirs back.
 */

export interface ContactCardMessage {
  type: "contact-card";
  version: number;
  walletAddress: string;
  username: string;
  profilePictureUrl?: string;
  sentAt: number;
}

/**
 * Type guard to check if a message content is a contact card
 */
export function isContactCard(content: unknown): content is ContactCardMessage {
  return (
    typeof content === "object" &&
    content !== null &&
    (content as ContactCardMessage).type === "contact-card" &&
    typeof (content as ContactCardMessage).version === "number" &&
    typeof (content as ContactCardMessage).walletAddress === "string" &&
    typeof (content as ContactCardMessage).username === "string"
  );
}

/**
 * Factory function to create a contact card message
 */
export function createContactCard(
  walletAddress: string,
  username: string,
  profilePictureUrl?: string
): ContactCardMessage {
  return {
    type: "contact-card",
    version: 1,
    walletAddress,
    username,
    profilePictureUrl,
    sentAt: Date.now(),
  };
}
