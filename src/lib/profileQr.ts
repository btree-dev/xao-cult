// Shared format for the personal "Me" QR: an app URL that, when scanned by ANY
// phone camera, opens the XAO app straight into a DM chat with that person — and
// which the in-app scanner also recognizes. Carries the owner's wallet address
// and (optionally) their username so the scanner can cache the display name.

const CHAT_PATH = '/chat-Section/Chat';

/** Build the absolute URL encoded in a user's profile QR. `origin` should be the
 *  app's own origin (e.g. window.location.origin) so the QR points at whatever
 *  domain the app is served from — no hardcoded host. */
export function buildProfileQrUrl(origin: string, address: string, username?: string): string {
  return `${origin}${CHAT_PATH}?peer=${address}${username ? `&u=${encodeURIComponent(username)}` : ''}`;
}

export interface ParsedProfileQr {
  address: `0x${string}`;
  username?: string;
}

/** Recognize a profile QR from decoded scanner text. Accepts a full app URL or a
 *  bare `/chat-Section/Chat?peer=…` path. Returns null for anything that isn't a
 *  valid profile QR (e.g. a ticket QR), so the caller can fall through to its
 *  existing handling. */
export function parseProfileQr(text: string): ParsedProfileQr | null {
  if (!text) return null;
  try {
    // Support both absolute URLs and bare paths/query strings.
    const url = text.startsWith('http')
      ? new URL(text)
      : new URL(text, 'https://placeholder.local');
    if (!url.pathname.includes(CHAT_PATH)) return null;
    const peer = url.searchParams.get('peer');
    if (!peer || !/^0x[a-fA-F0-9]{40}$/.test(peer)) return null;
    const username = url.searchParams.get('u') || undefined;
    return { address: peer as `0x${string}`, username };
  } catch {
    return null;
  }
}
