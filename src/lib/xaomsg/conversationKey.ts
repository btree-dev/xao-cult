// src/lib/xaomsg/conversationKey.ts
import type { Hex } from 'viem';

// v2: the pre-ECDH scheme could cache a key one side generated independently
// of the other (see useXaoDm's old negotiateKey), permanently diverging the
// two sides' views of a thread. Renaming the storage key orphans any such
// stale/divergent v1 entries rather than trusting them.
//
// v3: session keys became deterministic in 8a8891d (2026-07-30), four days
// after v2 shipped (cb570d4, 2026-07-26) — every v2 entry cached in that
// window (or earlier) was ECDH-derived from the OLD random/rotating
// session.privateKeyHex, not the wallet's permanent deterministic one.
// loadConversationKeyRaw short-circuits before ever re-deriving, so those
// entries would otherwise silently and permanently decrypt-fail for that
// thread (history AND future live messages) rather than self-heal. Renaming
// again orphans them, same as the v1 -> v2 move above.
//
// v4 (2026-09-14): `queryPeerKeyBundle` (inbox.ts) had its own bug fixed in
// this same debugging pass — it could pick a stale, non-current cert for a
// peer instead of their newest-published one (see inbox.ts's comment). Any
// v3 entry cached BEFORE that fix landed was derived against whatever
// wrong/stale peer pubkey that bug handed back, and — same short-circuit
// problem as v2 -> v3 above — never gets re-derived on its own. Confirmed
// live: two browsers for the same thread logged completely different raw
// keys for the same ciphertext. Renaming again forces one fresh negotiation
// per thread against the now-corrected peer-cert lookup.
const LS_KEY = 'xao-cult-dm-convkeys-v4';

type ConvKeyMap = Record<string, string>; // threadId -> base64 raw 32-byte key

function readMap(): ConvKeyMap {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as ConvKeyMap; }
  catch { return {}; }
}
function writeMap(m: ConvKeyMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(m));
}
function b64encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...Array.from(bytes))); }
function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

/** Debug-only: hex-dumps a raw key so it can be eyeballed/diffed across two
 *  browsers (sender vs. receiver) while chasing a key-negotiation mismatch. */
export function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateRawConversationKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function saveConversationKeyRaw(threadId: Hex, raw: Uint8Array): void {
  const m = readMap();
  m[threadId.toLowerCase()] = b64encode(raw);
  writeMap(m);
}

export function loadConversationKeyRaw(threadId: Hex): Uint8Array | null {
  const v = readMap()[threadId.toLowerCase()];
  return v ? b64decode(v) : null;
}

export function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new Uint8Array(raw), 'AES-GCM', true, ['encrypt', 'decrypt']);
}
