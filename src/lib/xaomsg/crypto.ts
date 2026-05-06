import { concat, keccak256, toBytes, type Address } from 'viem';

export async function generateThreadKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function encryptBody(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const merged = new Uint8Array(iv.length + ct.length);
  merged.set(iv, 0);
  merged.set(ct, iv.length);
  return btoa(String.fromCharCode(...Array.from(merged)));
}

export async function decryptBody(b64: string, key: CryptoKey): Promise<string> {
  const merged = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = merged.slice(0, 12);
  const ct = merged.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * PHASE-1 WEAK derivation: deterministic from the show address only. Anyone
 * who knows the show address derives the key. Documented in the limitations
 * doc; replaced by ECIES handshake in Plan 2.
 */
export async function deriveDeterministicThreadKey(showAddress: Address | string): Promise<CryptoKey> {
  const lower = showAddress.toLowerCase();
  const digest = keccak256(concat([toBytes('xao-thread-key-v1'), toBytes(lower)]));
  const raw = toBytes(digest); // 32 bytes
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}
