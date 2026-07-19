// src/lib/xaomsg/ecies.ts
import * as secp from '@noble/secp256k1';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

const KEK_INFO = 'xao-dm-kek-v1';
const KEK_SALT = new TextEncoder().encode('xao-dm-v1');

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

/** Derive a 32-byte AES-GCM key-encryption-key from the ECDH shared secret.
 *  getSharedSecret returns a 33-byte compressed point; we HKDF the 32-byte
 *  x-coordinate (drop the parity prefix byte). */
async function deriveKek(mySessionPrivHex: string, theirSessionPubHex: string): Promise<CryptoKey> {
  const shared = secp.getSharedSecret(hexToBytes(mySessionPrivHex), hexToBytes(theirSessionPubHex)); // 33 bytes
  const ikm = shared.slice(1); // 32-byte x-coordinate
  const raw = new Uint8Array(hkdf(sha256, ikm, KEK_SALT, KEK_INFO, 32));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
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
