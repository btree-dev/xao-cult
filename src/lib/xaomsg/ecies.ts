// src/lib/xaomsg/ecies.ts
import * as secp from '@noble/secp256k1';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

const KEK_INFO = 'xao-dm-kek-v1';
const KEK_SALT = new TextEncoder().encode('xao-dm-v1');
// Distinct info string from KEK_INFO so the two derived keys are
// cryptographically domain-separated — exposure of one must never help
// recover the other, even though both come from the same ECDH secret.
const CONVKEY_INFO = 'xao-dm-convkey-v1';

// Distinct info-string family from CONVKEY_INFO (the DM key) — and the
// draftId is folded directly into the HKDF info, not just the family name,
// so every concurrent draft between the same two people gets an
// independent key. A leaked event key exposes only that one draft.
const EVENT_CONVKEY_INFO_PREFIX = 'xao-event-convkey-v1:';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function b64encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(bytes)));
}
function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** ECDH(mine, theirs) is symmetric — both parties land on the same shared
 *  secret from nothing but public keys, so any key HKDF'd from it needs no
 *  transport or negotiation. getSharedSecret returns a 33-byte compressed
 *  point; we HKDF the 32-byte x-coordinate (drop the parity prefix byte). */
async function deriveSharedRaw(mySessionPrivHex: string, theirSessionPubHex: string, info: string): Promise<Uint8Array> {
  const shared = secp.getSharedSecret(hexToBytes(mySessionPrivHex), hexToBytes(theirSessionPubHex)); // 33 bytes
  const ikm = shared.slice(1); // 32-byte x-coordinate
  return new Uint8Array(hkdf(sha256, ikm, KEK_SALT, info, 32));
}

/** Derive a 32-byte AES-GCM key-encryption-key from the ECDH shared secret. */
async function deriveKek(mySessionPrivHex: string, theirSessionPubHex: string): Promise<CryptoKey> {
  const raw = await deriveSharedRaw(mySessionPrivHex, theirSessionPubHex, KEK_INFO);
  return crypto.subtle.importKey('raw', new Uint8Array(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Deterministic DM conversation key: both sides derive the identical raw
 *  32-byte key locally from ECDH(myPriv, theirPub) — no transport, no
 *  negotiation, no race between who "wins" generating the key. Domain-
 *  separated from the notice-wrapping KEK via CONVKEY_INFO. */
export async function deriveDmConversationKeyRaw(mySessionPrivHex: string, theirSessionPubHex: string): Promise<Uint8Array> {
  return deriveSharedRaw(mySessionPrivHex, theirSessionPubHex, CONVKEY_INFO);
}

/** Deterministic per-draft event-thread key: same ECDH shared secret as the
 *  DM key between this pair, but domain-separated by draftId so it never
 *  collides with their DM key or with any other draft between them. Used
 *  both pre- and post-mint — the event thread never switches keys at mint
 *  (see docs/superpowers/specs/2026-07-27-event-thread-separation-design.md §4). */
export async function deriveEventConversationKeyRaw(
  mySessionPrivHex: string,
  theirSessionPubHex: string,
  draftId: string,
): Promise<Uint8Array> {
  return deriveSharedRaw(mySessionPrivHex, theirSessionPubHex, EVENT_CONVKEY_INFO_PREFIX + draftId);
}

export async function wrapBytes(
  plaintext: Uint8Array,
  theirSessionPubHex: string,
  mySessionPrivHex: string,
): Promise<string> {
  const kek = await deriveKek(mySessionPrivHex, theirSessionPubHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, new Uint8Array(plaintext)));
  const merged = new Uint8Array(iv.length + ct.length);
  merged.set(iv, 0);
  merged.set(ct, iv.length);
  return b64encode(merged);
}

export async function unwrapBytes(
  wrappedB64: string,
  theirSessionPubHex: string,
  mySessionPrivHex: string,
): Promise<Uint8Array> {
  const kek = await deriveKek(mySessionPrivHex, theirSessionPubHex);
  const merged = b64decode(wrappedB64);
  const iv = merged.slice(0, 12);
  const ct = merged.slice(12);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, ct));
}
