// src/lib/xaomsg/messagePreview.ts
import { ContentType, type ResolvedMessage } from './types';

const MAX_PREVIEW_LENGTH = 80;

function truncate(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_PREVIEW_LENGTH ? `${trimmed.slice(0, MAX_PREVIEW_LENGTH)}…` : trimmed;
}

/** Short list-preview text for a resolved message, or null for content types
 *  (e.g. contact cards) that shouldn't surface as a conversation-list preview. */
export function formatMessagePreview(resolved: ResolvedMessage): string | null {
  const { body } = resolved.envelope;
  switch (body.contentType) {
    case ContentType.TEXT:
      return truncate((body.payload as { text: string }).text);
    case ContentType.PROPOSAL:
      return 'Sent a proposal';
    case ContentType.COUNTER_PROPOSAL:
      return 'Sent a counter-proposal';
    case ContentType.ACCEPT:
      return 'Accepted the proposal';
    case ContentType.REJECT: {
      const reason = (body.payload as { reason?: string }).reason;
      return reason ? `Declined: ${truncate(reason)}` : 'Declined the proposal';
    }
    case ContentType.SYSTEM:
      return (body.payload as { event: string }).event === 'minted' ? 'Contract minted on-chain' : null;
    case ContentType.CONTACT_CARD:
      return null;
    default:
      return null;
  }
}
