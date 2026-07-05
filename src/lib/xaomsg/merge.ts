import type { ResolvedMessage } from './types';

/**
 * Insert a resolved message into a thread list, deduped by messageId and kept
 * sorted by `sentAt`. Idempotent: re-inserting a message already present
 * returns the same array reference so React can bail out of a re-render.
 *
 * Every path that adds a message — optimistic send, live filter, and store
 * backfill — must go through here. In particular the optimistic insert relies
 * on the dedupe: Waku echoes a light-pushed message back through the caller's
 * own filter subscription, and that echo can land *before* the optimistic
 * insert runs, so a naive append would show the sender's message twice.
 */
export function mergeResolved(prev: ResolvedMessage[], next: ResolvedMessage): ResolvedMessage[] {
  if (prev.some((m) => m.envelope.body.messageId === next.envelope.body.messageId)) {
    return prev;
  }
  return [...prev, next].sort((a, b) => a.envelope.body.sentAt - b.envelope.body.sentAt);
}
