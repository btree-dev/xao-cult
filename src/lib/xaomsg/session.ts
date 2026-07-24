import * as secp from '@noble/secp256k1';
import { recoverMessageAddress, type Address, type Hex } from 'viem';
import type { SessionCert } from './types';

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('odd-length hex');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function createSessionKeypair(): Promise<{ privateKey: Hex; publicKey: Hex }> {
  const priv = secp.utils.randomPrivateKey();
  const pub = secp.getPublicKey(priv, true); // compressed (33 bytes)
  return {
    privateKey: ('0x' + bytesToHex(priv)) as Hex,
    publicKey: ('0x' + bytesToHex(pub)) as Hex,
  };
}

export interface ChallengeFields {
  walletAddress: Address;
  sessionPublicKeyHex: string;
  expiresAtUnixMs: number;
  chainId: number;
}

export function sessionChallengeString(f: ChallengeFields): string {
  // Plain-text challenge — readable in MetaMask. Locked format; do NOT change without a v2.
  return [
    'XaoMsg session v1',
    `wallet:${f.walletAddress.toLowerCase()}`,
    `session_pubkey:${f.sessionPublicKeyHex.toLowerCase()}`,
    `expires:${f.expiresAtUnixMs}`,
    `chain:${f.chainId}`,
  ].join('\n');
}

export async function mintSessionCert(args: ChallengeFields & {
  signMessage: (message: string) => Promise<Hex>;
}): Promise<SessionCert> {
  const message = sessionChallengeString(args);
  const walletSignature = await args.signMessage(message);
  return {
    v: 1,
    walletAddress: args.walletAddress,
    sessionPublicKeyHex: args.sessionPublicKeyHex,
    expiresAtUnixMs: args.expiresAtUnixMs,
    chainId: args.chainId,
    walletSignature,
  };
}

export async function verifySessionCert(cert: SessionCert): Promise<boolean> {
  if (cert.v !== 1) return false;
  try {
    const recovered = await recoverMessageAddress({
      message: sessionChallengeString({
        walletAddress: cert.walletAddress,
        sessionPublicKeyHex: cert.sessionPublicKeyHex,
        expiresAtUnixMs: cert.expiresAtUnixMs,
        chainId: cert.chainId,
      }),
      signature: cert.walletSignature,
    });
    return recovered.toLowerCase() === cert.walletAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function isExpired(cert: { expiresAtUnixMs: number }): boolean {
  return Date.now() >= cert.expiresAtUnixMs;
}

/** Sign an arbitrary 32-byte digest with the session private key. */
export async function signWithSession(digest: Hex, sessionPrivateKey: Hex): Promise<Hex> {
  const sig = await secp.signAsync(hexToBytes(digest), hexToBytes(sessionPrivateKey));
  // Compact 64-byte form: r||s
  return ('0x' + bytesToHex(sig.toCompactRawBytes())) as Hex;
}

export async function verifyWithSession(digest: Hex, signatureHex: Hex, sessionPublicKeyHex: Hex): Promise<boolean> {
  try {
    return secp.verify(hexToBytes(signatureHex), hexToBytes(digest), hexToBytes(sessionPublicKeyHex));
  } catch {
    return false;
  }
}

const STORAGE_KEY = (wallet: Address) => `xao-msg-session-${wallet.toLowerCase()}`;

export interface PersistedSession {
  cert: SessionCert;
  privateKeyHex: Hex;
}

// Some private-browsing modes throw on localStorage.setItem/getItem rather
// than just no-opping. This in-memory map keeps the session usable for the
// rest of the tab's lifetime in that case, instead of unlock() silently
// failing to persist and re-prompting on every navigation.
const memoryFallback = new Map<string, PersistedSession>();

export function loadSession(wallet: Address): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  const key = wallet.toLowerCase();
  try {
    const raw = localStorage.getItem(STORAGE_KEY(wallet));
    if (!raw) {
      const fallback = memoryFallback.get(key);
      return fallback && !isExpired(fallback.cert) ? fallback : null;
    }
    const parsed = JSON.parse(raw) as PersistedSession;
    if (isExpired(parsed.cert)) return null;
    return parsed;
  } catch {
    const fallback = memoryFallback.get(key);
    return fallback && !isExpired(fallback.cert) ? fallback : null;
  }
}

export function saveSession(wallet: Address, session: PersistedSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY(wallet), JSON.stringify(session));
  } catch {
    memoryFallback.set(wallet.toLowerCase(), session);
  }
}

export function clearSession(wallet: Address): void {
  if (typeof window === 'undefined') return;
  memoryFallback.delete(wallet.toLowerCase());
  try {
    localStorage.removeItem(STORAGE_KEY(wallet));
  } catch {
    // best-effort — nothing further to clean up if storage itself is unusable
  }
}
