import * as secp from '@noble/secp256k1';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { recoverMessageAddress, type Address, type Hex } from 'viem';
import type { SessionCert } from './types';

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

const DERIVATION_SALT = new TextEncoder().encode('xao-session-key-v1');
const DERIVATION_INFO = 'xao-session-keyseed-v1';

/** Secret, wallet-scoped message signed once to derive the session keypair.
 *  This signature must NEVER be transmitted or published anywhere — unlike
 *  the cert challenge below (public by design), this one's bytes are hashed
 *  directly into the private key: anyone who saw it could re-derive the key.
 *  Fixed format, no variable fields besides the wallet address, so the same
 *  wallet always reproduces the same signature (EOA wallets sign
 *  deterministically per RFC 6979) and therefore the same keypair, on any
 *  device. Exported because the message text itself isn't sensitive — only
 *  signing it and publishing that signature would be. */
export function sessionKeyDerivationMessage(walletAddress: Address): string {
  return `XaoMsg session key derivation v1\nwallet:${walletAddress.toLowerCase()}`;
}

/** Public challenge — the wallet's signature over this becomes
 *  cert.walletSignature and is broadcast in every envelope and key bundle.
 *  Locked format; do NOT change without a v2. */
export function sessionCertChallenge(walletAddress: Address, sessionPublicKeyHex: string): string {
  return [
    'XaoMsg session v1',
    `wallet:${walletAddress.toLowerCase()}`,
    `session_pubkey:${sessionPublicKeyHex.toLowerCase()}`,
  ].join('\n');
}

/** Derives this wallet's session keypair + cert deterministically via two
 *  wallet signatures: one secret (seeds the keypair, never transmitted) and
 *  one public (becomes the broadcastable cert). The same wallet reproduces
 *  the identical keypair and cert on any device/origin — no randomness, no
 *  per-device divergence. See
 *  docs/superpowers/specs/2026-07-30-deterministic-session-keys-design.md. */
export async function deriveSessionKeypair(
  walletAddress: Address,
  signMessage: (message: string) => Promise<Hex>,
): Promise<{ privateKey: Hex; publicKey: Hex; cert: SessionCert }> {
  const derivationSig = await signMessage(sessionKeyDerivationMessage(walletAddress));
  const seed = hkdf(sha256, hexToBytes(derivationSig), DERIVATION_SALT, DERIVATION_INFO, 40);
  const privBytes = secp.etc.hashToPrivateKey(seed);
  const privateKey = ('0x' + bytesToHex(privBytes)) as Hex;
  const publicKey = ('0x' + bytesToHex(secp.getPublicKey(privBytes, true))) as Hex;

  const walletSignature = await signMessage(sessionCertChallenge(walletAddress, publicKey));
  const cert: SessionCert = {
    v: 1,
    walletAddress,
    sessionPublicKeyHex: publicKey,
    walletSignature,
  };
  return { privateKey, publicKey, cert };
}

export async function verifySessionCert(cert: SessionCert): Promise<boolean> {
  if (cert.v !== 1) return false;
  try {
    const recovered = await recoverMessageAddress({
      message: sessionCertChallenge(cert.walletAddress, cert.sessionPublicKeyHex),
      signature: cert.walletSignature,
    });
    return recovered.toLowerCase() === cert.walletAddress.toLowerCase();
  } catch {
    return false;
  }
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

/** Reads whatever is cached, with no validity filtering — the derived
 *  keypair is permanent, so there's no expiry to check here. The caller
 *  (useXaoMsgSession's mount effect) verifies the cert still checks out
 *  under the current derivation before trusting it, since a cached entry
 *  could be a stale pre-deterministic-key session. */
export function loadSession(wallet: Address): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  const key = wallet.toLowerCase();
  try {
    const raw = localStorage.getItem(STORAGE_KEY(wallet));
    if (!raw) return memoryFallback.get(key) ?? null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return memoryFallback.get(key) ?? null;
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
