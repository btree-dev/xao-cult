import type { Address, Hex } from 'viem';
import type { ContactCardPayload } from './types';

export function buildContactCardPayload(input: {
  walletAddress: Address;
  username: string;
  profilePictureUrl?: string;
}): ContactCardPayload {
  return {
    kind: 'contact-card',
    walletAddress: input.walletAddress,
    username: input.username,
    profilePictureUrl: input.profilePictureUrl,
    sentAt: Date.now(),
  };
}

/** Shape-compatible with `ProfileCacheContext`'s `CachedProfile` (structurally,
 *  not by import — lib/xaomsg stays UI-context-free; the caller assigns this
 *  into `setProfile()`). */
export function applyContactCard(payload: ContactCardPayload): {
  walletAddress: string;
  username: string;
  profilePictureUrl?: string;
  cachedAt: number;
} {
  return {
    walletAddress: payload.walletAddress,
    username: payload.username,
    profilePictureUrl: payload.profilePictureUrl,
    cachedAt: Date.now(),
  };
}

// Once-per-thread "have I sent my contact card yet" flag. localStorage-backed
// so a remount/reload doesn't re-send it every time the DM thread key loads.
const SENT_LS_KEY = 'xao-cult-dm-cardsent';

function readSentSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(SENT_LS_KEY) || '[]') as string[]); }
  catch { return new Set(); }
}
function writeSentSet(s: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SENT_LS_KEY, JSON.stringify(Array.from(s)));
}

export function hasSentContactCard(threadId: Hex): boolean {
  return readSentSet().has(threadId.toLowerCase());
}

export function markContactCardSent(threadId: Hex): void {
  const s = readSentSet();
  s.add(threadId.toLowerCase());
  writeSentSet(s);
}
