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

// Per-thread "hash of the profile I last sent a contact card for" map.
// localStorage-backed so a remount/reload doesn't re-send it every time the
// DM thread key loads — but re-sends when username OR avatar changes since
// the last send, unlike a plain once-per-thread flag.
const SENT_LS_KEY = 'xao-cult-dm-cardsent';

function readSentMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(SENT_LS_KEY) || '{}') as Record<string, string>; }
  catch { return {}; }
}
function writeSentMap(m: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SENT_LS_KEY, JSON.stringify(m));
}

/** Cheap FNV-1a hash of the profile fields a contact card carries, so we can
 *  detect "has this changed since I last sent it" without diffing/storing
 *  the (potentially large, base64-image) profilePictureUrl itself. */
export function hashContactCardProfile(username: string, profilePictureUrl?: string): string {
  const separator = String.fromCharCode(0);
  const input = `${username}${separator}${profilePictureUrl ?? ''}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/** Hash of the profile we last sent a contact card for on this thread, or
 *  undefined if we've never sent one. */
export function lastSentContactCardHash(threadId: Hex): string | undefined {
  return readSentMap()[threadId.toLowerCase()];
}

export function markContactCardSent(threadId: Hex, profileHash: string): void {
  const m = readSentMap();
  m[threadId.toLowerCase()] = profileHash;
  writeSentMap(m);
}
