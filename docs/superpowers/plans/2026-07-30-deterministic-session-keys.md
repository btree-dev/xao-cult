# Deterministic Wallet-Derived Session Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace XaoMsg's random-per-unlock session keypair with one deterministically derived from two wallet signatures, so the same wallet always re-derives the identical session keypair on any device/origin.

**Architecture:** `session.ts`'s `deriveSessionKeypair` signs a secret, never-transmitted "derivation message" to seed a deterministic secp256k1 keypair (HKDF-SHA256 → `secp.etc.hashToPrivateKey`), then signs a second, public "cert challenge" over the resulting pubkey to produce the broadcastable `SessionCert`. `SessionCert` drops `expiresAtUnixMs`/`chainId` entirely — the key is permanent, so expiry is not a real security boundary once introduced. `useXaoMsgSession.unlock()` becomes a two-signature-prompt flow; its mount effect re-verifies a cached cert against the new format and discards it (triggering a fresh `unlock()`) if it doesn't check out. `inbox.ts`'s `queryPeerKeyBundle` drops its publish-time ranking logic, since every valid cert for a wallet now carries the same pubkey.

**Tech Stack:** TypeScript, `@noble/secp256k1@2.1.0` (`secp.etc.hashToPrivateKey`, already a dependency), `@noble/hashes/hkdf` + `/sha256` (already used in `ecies.ts`), `viem`/`viem/accounts` (`recoverMessageAddress`, `privateKeyToAccount` in tests), Vitest.

## Global Constraints

- No `SessionCert.v: 2` — redefine `v: 1` in place. Pre-launch, no dual-version support (per `docs/superpowers/specs/2026-07-30-deterministic-session-keys-design.md` §2 fact 4, §12).
- No rotation mechanism of any kind — permanent deterministic key is the accepted trade-off (spec §7, §12).
- The derivation signature (`sessionKeyDerivationMessage`) must never be transmitted, persisted separately, or published — only its locally-derived keypair output is persisted (spec §2 fact 1).
- `chainId` is dropped from both signed messages (spec §3, §12).
- Every step below that touches test files must leave `yarn test:unit` green before its commit.

---

## Task 1: Rewrite `session.ts` for deterministic derivation

**Files:**
- Modify: `src/lib/xaomsg/types.ts:44-56` (`SessionCert` interface + doc comment)
- Modify: `src/lib/xaomsg/session.ts` (full rewrite of the derivation/cert surface; storage functions largely unchanged)
- Test: `src/lib/xaomsg/session.test.ts` (full rewrite)

**Interfaces:**
- Produces: `deriveSessionKeypair(walletAddress: Address, signMessage: (message: string) => Promise<Hex>): Promise<{ privateKey: Hex; publicKey: Hex; cert: SessionCert }>` — replaces `createSessionKeypair()` + `mintSessionCert(...)`.
- Produces: `sessionCertChallenge(walletAddress: Address, sessionPublicKeyHex: string): string` — replaces `sessionChallengeString(...)`, drops `expiresAtUnixMs`/`chainId` params.
- Produces: `sessionKeyDerivationMessage(walletAddress: Address): string` — new, exported (the message text itself isn't sensitive; only signing it and publishing that signature would be).
- Produces: `verifySessionCert(cert: SessionCert): Promise<boolean>` — same name/signature, no longer checks expiry.
- Produces: `signWithSession`, `verifyWithSession`, `loadSession`, `saveSession`, `clearSession`, `type PersistedSession` — unchanged signatures.
- Removes: `createSessionKeypair`, `mintSessionCert`, `sessionChallengeString`, `isExpired`, `SESSION_DURATION_MS`, `type ChallengeFields`.
- Consumes: nothing from other tasks (this is the foundation task).

- [ ] **Step 1: Update the `SessionCert` type**

Edit `src/lib/xaomsg/types.ts`, replacing lines 43-56:

```ts
/**
 * SessionCert authorises a session keypair on behalf of a wallet. The
 * keypair is deterministically derived from the wallet (see session.ts's
 * deriveSessionKeypair) — the same wallet always reproduces the same
 * keypair and the same cert, on any device. The wallet signs a fixed-format
 * challenge string; verifiers ecrecover it. No expiry: a compromised key
 * can't be rotated away per-user anyway once it's deterministic, so an
 * expiry field would be a control that looks real but isn't — see
 * docs/superpowers/specs/2026-07-30-deterministic-session-keys-design.md.
 */
export interface SessionCert {
  v: 1;
  walletAddress: Address;
  sessionPublicKeyHex: string;     // 33-byte compressed secp256k1 pubkey, hex with 0x prefix
  /** EIP-191 personal-sign signature over `sessionCertChallenge(...)`. */
  walletSignature: Hex;
}
```

- [ ] **Step 2: Write the failing test file**

Replace `src/lib/xaomsg/session.test.ts` in full:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import {
  deriveSessionKeypair,
  sessionCertChallenge,
  sessionKeyDerivationMessage,
  verifySessionCert,
  signWithSession,
  verifyWithSession,
  loadSession,
  saveSession,
  clearSession,
  type PersistedSession,
} from './session';
import type { Address } from 'viem';

function signer(account: ReturnType<typeof privateKeyToAccount>) {
  return (message: string) => account.signMessage({ message });
}

describe('session', () => {
  it('deriveSessionKeypair produces a valid 32/33-byte secp256k1 pair', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { privateKey, publicKey } = await deriveSessionKeypair(account.address, signer(account));
    expect(privateKey.length).toBe(2 + 64);   // 0x + 32 bytes
    expect(publicKey.length).toBe(2 + 66);    // 0x + 33 bytes (compressed)
  });

  it('is fully deterministic: two independent derivations for the same wallet are byte-identical', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const first = await deriveSessionKeypair(account.address, signer(account));
    const second = await deriveSessionKeypair(account.address, signer(account));
    expect(second.privateKey).toBe(first.privateKey);
    expect(second.publicKey).toBe(first.publicKey);
    expect(second.cert).toEqual(first.cert);
  });

  it('different wallets derive different keypairs', async () => {
    const a = privateKeyToAccount(generatePrivateKey());
    const b = privateKeyToAccount(generatePrivateKey());
    const derivedA = await deriveSessionKeypair(a.address, signer(a));
    const derivedB = await deriveSessionKeypair(b.address, signer(b));
    expect(derivedA.privateKey).not.toBe(derivedB.privateKey);
  });

  it('the derivation message and the cert challenge are distinct strings', () => {
    // Regression guard: if these ever collapsed into one signed message, the
    // cert's public walletSignature (broadcast in every envelope and key
    // bundle) would BE the secret used to derive the private key.
    const addr = '0x000000000000000000000000000000000000dead' as Address;
    const derivation = sessionKeyDerivationMessage(addr);
    const challenge = sessionCertChallenge(addr, '0x' + 'aa'.repeat(33));
    expect(derivation).not.toBe(challenge);
  });

  it('sessionCertChallenge includes wallet and session pubkey, no expiry or chain', () => {
    const s = sessionCertChallenge(
      '0x000000000000000000000000000000000000dead',
      '0x' + 'aa'.repeat(33),
    );
    expect(s).toContain('wallet:0x000000000000000000000000000000000000dead');
    expect(s).toContain('session_pubkey:0x' + 'aa'.repeat(33));
    expect(s).not.toContain('expires:');
    expect(s).not.toContain('chain:');
  });

  it('deriveSessionKeypair + verifySessionCert round-trip via a viem account', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { cert } = await deriveSessionKeypair(account.address, signer(account));
    expect(await verifySessionCert(cert)).toBe(true);
  });

  it('verifySessionCert rejects a cert whose pubkey was swapped after signing', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { cert } = await deriveSessionKeypair(account.address, signer(account));
    const tampered = { ...cert, sessionPublicKeyHex: '0x02' + 'ff'.repeat(32) };
    expect(await verifySessionCert(tampered)).toBe(false);
  });

  it('verifySessionCert rejects a cert claiming a different wallet', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const impostor = privateKeyToAccount(generatePrivateKey());
    const { cert } = await deriveSessionKeypair(account.address, signer(account));
    const tampered = { ...cert, walletAddress: impostor.address };
    expect(await verifySessionCert(tampered)).toBe(false);
  });

  it('signWithSession + verifyWithSession round-trip', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { privateKey, publicKey } = await deriveSessionKeypair(account.address, signer(account));
    const digest = ('0x' + 'cd'.repeat(32)) as `0x${string}`;
    const sig = await signWithSession(digest, privateKey);
    expect(await verifyWithSession(digest, sig, publicKey)).toBe(true);
    const otherAccount = privateKeyToAccount(generatePrivateKey());
    const wrongPub = (await deriveSessionKeypair(otherAccount.address, signer(otherAccount))).publicKey;
    expect(await verifyWithSession(digest, sig, wrongPub)).toBe(false);
  });
});

describe('session storage (localStorage-backed, permanent — no expiry)', () => {
  const WALLET = '0x000000000000000000000000000000000000dead' as Address;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loadSession returns null when nothing is stored', () => {
    expect(loadSession(WALLET)).toBeNull();
  });

  it('saveSession + loadSession round-trip via localStorage', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    saveSession(WALLET, persisted);
    expect(loadSession(WALLET)).toEqual(persisted);
    // Persisted in localStorage specifically, not sessionStorage.
    expect(localStorage.getItem(`xao-msg-session-${WALLET}`)).not.toBeNull();
    expect(sessionStorage.getItem(`xao-msg-session-${WALLET}`)).toBeNull();
  });

  it('clearSession removes the persisted entry', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    saveSession(WALLET, persisted);
    clearSession(WALLET);
    expect(loadSession(WALLET)).toBeNull();
  });

  it('falls back to an in-memory session when localStorage.setItem throws', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled');
    });
    try {
      saveSession(WALLET, persisted);
      expect(loadSession(WALLET)).toEqual(persisted);
    } finally {
      spy.mockRestore();
    }
  });
});
```

- [ ] **Step 3: Run the test file to verify it fails**

Run: `yarn test:unit -- session.test.ts`
Expected: FAIL — `deriveSessionKeypair`, `sessionCertChallenge`, `sessionKeyDerivationMessage` are not exported by `./session` yet (old exports `createSessionKeypair`/`mintSessionCert`/`sessionChallengeString`/`isExpired`/`SESSION_DURATION_MS` still present).

- [ ] **Step 4: Rewrite `session.ts`**

Replace `src/lib/xaomsg/session.ts` in full:

```ts
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
```

- [ ] **Step 5: Run the test file to verify it passes**

Run: `yarn test:unit -- session.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/xaomsg/types.ts src/lib/xaomsg/session.ts src/lib/xaomsg/session.test.ts
git commit -m "feat(xaomsg): derive session keypair deterministically from wallet signatures"
```

---

## Task 2: `useXaoMsgSession.ts` — two-signature unlock + staleness-checked mount

**Files:**
- Modify: `src/hooks/useXaoMsgSession.ts` (full rewrite)

**Interfaces:**
- Consumes (from Task 1): `deriveSessionKeypair(walletAddress, signMessage)`, `loadSession(wallet)`, `saveSession(wallet, session)`, `clearSession(wallet)`, `verifySessionCert(cert)`, `type PersistedSession` — all from `../lib/xaomsg/session`.
- Produces: `UseXaoMsgSessionResult` — same shape as before (`session`, `isUnlocking`, `error`, `unlock`, `isWalletReady`); no consumer-facing signature change, so no other file needs to change.

No dedicated test file exists for this hook today (confirmed: no `useXaoMsgSession.test.ts` in the repo) — this task is verified by typecheck + the manual smoke check in Task 7, matching the existing lack of hook-test infrastructure for this file. Do not introduce new mocking infrastructure for wagmi hooks as part of this task — out of scope.

- [ ] **Step 1: Rewrite the hook**

Replace `src/hooks/useXaoMsgSession.ts` in full:

```ts
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import {
  deriveSessionKeypair,
  loadSession,
  saveSession,
  clearSession,
  verifySessionCert,
  type PersistedSession,
} from '../lib/xaomsg/session';

export interface UseXaoMsgSessionResult {
  session: PersistedSession | null;
  isUnlocking: boolean;
  error: string | null;
  unlock: () => Promise<void>;
  /** True once wagmi's wallet client has hydrated for the connected account.
   *  `useWalletClient()` resolves asynchronously — `address`/`chainId` can be
   *  populated a render or two before this flips true, so callers that need
   *  to know unlock() will actually attempt a signature (rather than silently
   *  no-op on a not-yet-ready client) should gate on this instead of just
   *  `address`. */
  isWalletReady: boolean;
}

export function useXaoMsgSession(): UseXaoMsgSessionResult {
  const { address } = useAccount();
  // chainId is read for isWalletReady/unlock gating elsewhere in the app;
  // it is no longer part of the signed session-derivation or cert messages
  // (chat identity is chain-independent).
  useChainId();
  const { data: walletClient } = useWalletClient();
  const [session, setSession] = useState<PersistedSession | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore from localStorage on mount/wallet change, but only trust it once
  // it re-verifies under the current (deterministic) cert format — a cached
  // entry from before this change, or otherwise corrupted, must not be used
  // silently. An invalid cached session is cleared outright so the rest of
  // the app's existing "no session yet" path (prompt unlock()) handles it,
  // rather than adding a second not-quite-ready state.
  useEffect(() => {
    if (!address) {
      setSession(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const cached = loadSession(address);
      const stillValid =
        !!cached &&
        cached.cert.walletAddress.toLowerCase() === address.toLowerCase() &&
        (await verifySessionCert(cached.cert));
      if (cancelled) return;
      if (stillValid) {
        setSession(cached);
      } else {
        if (cached) clearSession(address);
        setSession(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const unlock = useCallback(async () => {
    if (!walletClient || !address) return;
    setIsUnlocking(true);
    setError(null);
    try {
      const { privateKey, cert } = await deriveSessionKeypair(address, (message) =>
        walletClient.signMessage({ account: address, message }),
      );
      const persisted: PersistedSession = { cert, privateKeyHex: privateKey };
      saveSession(address, persisted);
      setSession(persisted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUnlocking(false);
    }
  }, [walletClient, address]);

  return { session, isUnlocking, error, unlock, isWalletReady: !!walletClient };
}
```

Note: `chainId` is still read via `useChainId()` because it's a cheap, side-effect-free hook call and removing it entirely is out of scope for this task (nothing else in this file used it besides the old `mintSessionCert` call, which is gone) — kept only to avoid an unrelated diff to callers that might expect the hook to re-render on chain change. If a later cleanup finds it genuinely unused, that's a separate, small follow-up.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `useXaoMsgSession.ts` or `session.ts`'s old export names (`createSessionKeypair`, `mintSessionCert`, `SESSION_DURATION_MS`, `isExpired`, `ChallengeFields`, `sessionChallengeString`). (Other files still importing these will fail here too — expected until Tasks 3-5 land; re-run after each subsequent task.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useXaoMsgSession.ts
git commit -m "feat(xaomsg): two-signature unlock flow with cert staleness check on mount"
```

---

## Task 3: `envelope.ts` — drop expiry check from `verifyEnvelope`

**Files:**
- Modify: `src/lib/xaomsg/envelope.ts:3,89-96`
- Test: `src/lib/xaomsg/envelope.test.ts` (update `seal()` helper, remove the expired-cert test)

**Interfaces:**
- Consumes (from Task 1): `verifySessionCert` from `./session` (already imported); `isExpired` import removed.
- Produces: `verifyEnvelope(envelope: OnWireEnvelope): Promise<boolean>` — same signature, one fewer internal check. No other file's call sites change.

- [ ] **Step 1: Update the test file first**

In `src/lib/xaomsg/envelope.test.ts`:

Replace the import line:
```ts
import { deriveSessionKeypair } from './session';
```

Replace the `seal()` helper (lines 14-34):
```ts
async function seal(text = 'hello') {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const { privateKey: sk, cert } = await deriveSessionKeypair(account.address, (m) => account.signMessage({ message: m }));
  const body = buildUnsignedBody({
    threadId: ('0x' + 'aa'.repeat(32)) as Hex,
    contentType: ContentType.TEXT,
    payload: { kind: 'text', text },
    parentHash: ('0x' + '00'.repeat(32)) as Hex,
    sender: account.address,
  });
  const envelope = await buildEnvelope(body, sk, cert);
  return { account, cert, sk, body, envelope };
}
```

Delete the "rejects when the cert is expired" test (lines 61-68):
```ts
  it('rejects when the cert is expired', async () => {
    const { envelope } = await seal();
    const tampered = {
      ...envelope,
      cert: { ...envelope.cert, expiresAtUnixMs: Date.now() - 1, walletSignature: envelope.cert.walletSignature },
    };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });
```

In the "verifies after a JSON round-trip even when the payload has undefined-valued keys" test (originally lines 70-102), replace its inline cert-minting block:
```ts
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { privateKey: sk, cert } = await deriveSessionKeypair(account.address, (m) => account.signMessage({ message: m }));
```
(drop the separate `mintSessionCert(...)` call that followed it in the original — `cert` now comes directly from `deriveSessionKeypair`).

In the "verifies after a JSON round-trip when the payload contains a Date object" test (originally lines 104-134), apply the same replacement.

- [ ] **Step 2: Run the test file to verify it fails**

Run: `yarn test:unit -- envelope.test.ts`
Expected: FAIL — `deriveSessionKeypair` not yet exported the way the test expects is already covered by Task 1, so the actual expected failure here is a TS/import error only if Task 1 wasn't already committed. Since Task 1 is already done, this should mostly compile; the real "fails" signal here is: run it BEFORE Step 3 and confirm nothing currently breaks it (i.e. this step confirms the test file change is self-consistent) — if it unexpectedly passes fully, proceed straight to Step 3, since `verifyEnvelope` still has the old `isExpired` check which is now dead code but does not fail the remaining tests (no test exercises it anymore after the deletion in Step 1). Note this explicitly rather than skipping: the meaningful failing signal for this task is TypeScript, not a runtime assertion — confirm via typecheck instead:

Run: `npx tsc --noEmit 2>&1 | grep envelope`
Expected: no output (no compile errors in `envelope.ts`/`envelope.test.ts`) once Step 1 is applied — `envelope.ts` itself hasn't changed yet, so this passes already; the remaining work is removing dead code, done next.

- [ ] **Step 3: Remove the expiry check from `envelope.ts`**

Edit `src/lib/xaomsg/envelope.ts` line 3:
```ts
import { signWithSession, verifyWithSession, verifySessionCert } from './session';
```

Edit lines 89-96 (`verifyEnvelope`):
```ts
export async function verifyEnvelope(envelope: OnWireEnvelope): Promise<boolean> {
  if (!(await verifySessionCert(envelope.cert))) return false;
  if (envelope.body.sender.toLowerCase() !== envelope.cert.walletAddress.toLowerCase()) return false;
  const recomputed = payloadDigest(envelope.body);
  if (recomputed !== envelope.payloadHash) return false;
  return verifyWithSession(envelope.payloadHash, envelope.signature, envelope.cert.sessionPublicKeyHex as Hex);
}
```

- [ ] **Step 4: Run the test suite to verify it passes**

Run: `yarn test:unit -- envelope.test.ts`
Expected: PASS, all remaining tests green (one fewer test than before — the deleted expiry test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/envelope.ts src/lib/xaomsg/envelope.test.ts
git commit -m "feat(xaomsg): remove cert-expiry check from verifyEnvelope"
```

---

## Task 4: `inbox.ts` — drop expiry checks, simplify `queryPeerKeyBundle`

**Files:**
- Modify: `src/lib/xaomsg/inbox.ts:7,73,113-149,164`
- Test: `src/lib/xaomsg/inbox.test.ts` (extensive update — see below)

**Interfaces:**
- Consumes (from Task 1): `verifySessionCert` from `./session`; `isExpired` import removed.
- Produces: `queryPeerKeyBundle(peer: Address): Promise<SessionCert | null>` — same signature, simplified body (no publish-time ranking). `tryDecodeThreadNotice`, `subscribeInbox` — same signatures, no expiry checks internally.

- [ ] **Step 1: Rewrite `inbox.test.ts`**

Replace `src/lib/xaomsg/inbox.test.ts` in full:

```ts
// src/lib/xaomsg/inbox.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as secp from '@noble/secp256k1';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

vi.mock('./waku', () => ({
  publishToTopic: vi.fn(async () => {}),
  subscribeToTopic: vi.fn(),
  queryHistory: vi.fn(async () => {}),
}));

import {
  encodeKeyBundle,
  tryDecodeKeyBundle,
  encodeThreadNotice,
  tryDecodeThreadNotice,
  queryPeerKeyBundle,
  subscribeInbox,
  queryInboxNotices,
  eventBackfillDedupeKey,
  type ThreadNotice,
} from './inbox';
import { deriveSessionKeypair } from './session';
import { queryHistory, subscribeToTopic } from './waku';
import { wrapBytes } from './ecies';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';
import type { SessionCert } from './types';

const hex = (b: Uint8Array) => '0x' + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
function keypair() {
  const priv = secp.utils.randomPrivateKey();
  return { privHex: hex(priv), pubHex: hex(secp.getPublicKey(priv, true)) };
}
const cert: SessionCert = {
  v: 1,
  walletAddress: '0x1111111111111111111111111111111111111111',
  sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
  walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
};

async function makeGenuineCertWithKey(): Promise<{ cert: SessionCert; privateKeyHex: string }> {
  const account = privateKeyToAccount(generatePrivateKey());
  const { privateKey, cert: genuineCert } = await deriveSessionKeypair(account.address, (message) =>
    account.signMessage({ message }),
  );
  return { cert: genuineCert, privateKeyHex: privateKey };
}

async function makeGenuineCert(): Promise<SessionCert> {
  return (await makeGenuineCertWithKey()).cert;
}

// A forged cert: same claimed wallet, but the pubkey was swapped after
// signing, so the signature no longer covers it — verifySessionCert fails.
function forgeCert(base: SessionCert): SessionCert {
  return { ...base, sessionPublicKeyHex: '0x02' + 'ff'.repeat(32) };
}

// A single macrotask tick isn't always enough here: tryDecodeThreadNotice's
// chain (verifySessionCert, then ECIES unwrapBytes -> crypto.subtle
// importKey + decrypt) can take multiple event-loop turns to settle under
// happy-dom's WebCrypto, empirically measured at up to ~3 ticks. Loop a
// handful of ticks so subscribeInbox's fire-and-forget async callback has
// settled before assertions run.
const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
};

// ---- eventBackfillDedupeKey (Fix-round-3 regression: dedupe-set must not
// collapse a draft's pre-mint and mint notices onto the same slot) ----
describe('eventBackfillDedupeKey', () => {
  it('produces different keys for the same draftId with and without a contractAddress', () => {
    const preMint = eventBackfillDedupeKey('draft-1', undefined);
    const mint = eventBackfillDedupeKey('draft-1', '0x2222222222222222222222222222222222222222');
    expect(preMint).not.toBe(mint);
  });

  it('reproduces the "honest user misses the mint notice" scenario: a dedupe Set seeded with the pre-mint key still admits the mint key for the same draftId', () => {
    const seen = new Set<string>();
    const draftId = 'draft-1';
    const contractAddress = '0x2222222222222222222222222222222222222222';

    const preMintKey = eventBackfillDedupeKey(draftId, undefined);
    expect(seen.has(preMintKey)).toBe(false);
    seen.add(preMintKey);

    const mintKey = eventBackfillDedupeKey(draftId, contractAddress);
    expect(seen.has(mintKey)).toBe(false);
  });

  it('produces the same key for repeated calls with identical inputs (idempotent within one mint state)', () => {
    const a = eventBackfillDedupeKey('draft-1', '0x2222222222222222222222222222222222222222');
    const b = eventBackfillDedupeKey('draft-1', '0x2222222222222222222222222222222222222222');
    expect(a).toBe(b);
  });

  it('produces different keys for different draftIds even with the same contractAddress presence', () => {
    const a = eventBackfillDedupeKey('draft-1', undefined);
    const b = eventBackfillDedupeKey('draft-2', undefined);
    expect(a).not.toBe(b);
  });
});

describe('inbox key bundle', () => {
  it('round-trips a key bundle', () => {
    const out = tryDecodeKeyBundle(encodeKeyBundle(cert));
    expect(out?.sessionPublicKeyHex).toBe(cert.sessionPublicKeyHex);
  });
  it('returns null for a thread-notice message', async () => {
    const owner = keypair();
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, sender.privateKeyHex, sender.cert);
    expect(tryDecodeKeyBundle(bytes)).toBeNull();
  });
});

describe('inbox thread notice (dm kind)', () => {
  it('round-trips an encrypted notice to the owner', async () => {
    const owner = keypair();
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = {
      kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, preview: 'hi', ts: 42,
    };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, sender.privateKeyHex, sender.cert);
    const out = await tryDecodeThreadNotice(bytes, owner.privHex);
    expect(out).toEqual(notice);
  });

  it('returns null when decrypted by the wrong owner', async () => {
    const owner = keypair();
    const sender = await makeGenuineCertWithKey();
    const mallory = keypair();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, sender.privateKeyHex, sender.cert);
    expect(await tryDecodeThreadNotice(bytes, mallory.privHex)).toBeNull();
  });

  it("returns null when the cert's wallet does not match the claimed sender", async () => {
    const owner = keypair();
    const senderA = await makeGenuineCertWithKey();
    const walletB = privateKeyToAccount(generatePrivateKey()).address;
    const notice: ThreadNotice = { kind: 'dm', from: walletB, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, senderA.privateKeyHex, senderA.cert);
    expect(await tryDecodeThreadNotice(bytes, owner.privHex)).toBeNull();
  });

  it('returns null when the sender cert fails signature verification', async () => {
    const owner = keypair();
    const genuine = await makeGenuineCertWithKey();
    const forged = forgeCert(genuine.cert);
    const notice: ThreadNotice = { kind: 'dm', from: forged.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, genuine.privateKeyHex, forged);
    expect(await tryDecodeThreadNotice(bytes, owner.privHex)).toBeNull();
  });
});

// ---- key-bundle trust logic (mocked Waku layer) ----

beforeEach(() => {
  vi.mocked(queryHistory).mockReset().mockImplementation(async () => {});
  vi.mocked(subscribeToTopic).mockReset();
});

function scriptHistory(messages: Uint8Array[]) {
  vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
    for (const m of messages) onMessage(m);
  });
}

describe('queryPeerKeyBundle', () => {
  it('returns the genuine bundle even when a forged bundle (bad signature) is in history', async () => {
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine);
    scriptHistory([encodeKeyBundle(forged), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('is not locked out by a malformed bundle (missing pubkey) appearing first', async () => {
    const genuine = await makeGenuineCert();
    const malformed = { ...genuine, sessionPublicKeyHex: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(malformed), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('returns null when only forged/invalid bundles exist', async () => {
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine);
    const malformed = { ...genuine, sessionPublicKeyHex: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(forged), encodeKeyBundle(malformed)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toBeNull();
  });

  it('returns null on an empty history', async () => {
    scriptHistory([]);
    const out = await queryPeerKeyBundle('0x1111111111111111111111111111111111111111');
    expect(out).toBeNull();
  });

  it('rejects a validly-signed cert for a different wallet posted on the peer topic', async () => {
    const attacker = await makeGenuineCert();
    const peer = '0x9999999999999999999999999999999999999999' as const;
    scriptHistory([encodeKeyBundle(attacker)]);
    const out = await queryPeerKeyBundle(peer);
    expect(out).toBeNull();
  });

  it('still returns the peer bundle when an attacker cert for another wallet sorts first', async () => {
    const genuine = await makeGenuineCert();
    const attacker = await makeGenuineCert();
    scriptHistory([encodeKeyBundle(attacker), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  // Regression-replacement for the 2026-07-29 publish-time-selection bug:
  // that fix is no longer needed because every genuinely-signed cert for a
  // wallet now carries the identical, deterministically-derived pubkey —
  // there is nothing left to disambiguate by order or timestamp.
  it('accepts the peer\'s cert regardless of duplicate entries in its history', async () => {
    const genuine = await makeGenuineCert();
    scriptHistory([encodeKeyBundle(genuine), encodeKeyBundle(genuine), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });
});

describe('subscribeInbox key-bundle verification', () => {
  function captureSubscription() {
    let deliver: ((bytes: Uint8Array) => void) | undefined;
    vi.mocked(subscribeToTopic).mockImplementation(async (_topic, onMessage) => {
      deliver = onMessage;
      return async () => {};
    });
    return () => deliver!;
  }

  it('does not invoke onKeyBundle for a shape-valid but unverified cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine);
    await subscribeInbox(genuine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(forged));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('invokes onKeyBundle for a genuine cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const genuine = await makeGenuineCert();
    await subscribeInbox(genuine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(genuine));
    await flush();
    expect(onKeyBundle).toHaveBeenCalledTimes(1);
    expect(onKeyBundle).toHaveBeenCalledWith(genuine);
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('ignores a validly-signed cert for a different wallet but accepts my own', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const mine = await makeGenuineCert();
    const foreign = await makeGenuineCert();
    await subscribeInbox(mine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(foreign));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
    getDeliver()(encodeKeyBundle(mine));
    await flush();
    expect(onKeyBundle).toHaveBeenCalledTimes(1);
    expect(onKeyBundle).toHaveBeenCalledWith(mine);
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('delivers a valid dm-kind notice via onThreadNotice', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: dmThreadId(myAddress, sender.cert.walletAddress), ts: 1 };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).toHaveBeenCalledWith(notice);
  });

  it('rejects a dm-kind notice whose threadId does not match dmThreadId(me, from)', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '99'.repeat(32)) as any, ts: 1 };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('delivers a valid event-kind notice via onThreadNotice, including a contractAddress mint pairing', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const draftId = 'draft-abc';
    const notice: ThreadNotice = {
      kind: 'event', from: sender.cert.walletAddress, threadId: threadIdForDraft(draftId), draftId,
      contractAddress: '0x2222222222222222222222222222222222222222', ts: 1,
    };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).toHaveBeenCalledWith(notice);
  });

  it('rejects an event-kind notice with a draftId/threadId mismatch', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = {
      kind: 'event', from: sender.cert.walletAddress, threadId: threadIdForDraft('draft-xyz'), draftId: 'draft-abc', ts: 1,
    };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('rejects an event-kind notice with no draftId at all', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice = {
      kind: 'event', from: sender.cert.walletAddress, threadId: threadIdForDraft('draft-abc'), ts: 1,
    } as ThreadNotice;
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });
});

// ---- queryInboxNotices completeness (Finding 1) ----
describe('queryInboxNotices completeness', () => {
  it('does not resolve until every matching, decodable notice has been delivered', async () => {
    const owner = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender1 = await makeGenuineCertWithKey();
    const sender2 = await makeGenuineCertWithKey();
    const sender3 = await makeGenuineCertWithKey();

    const notice1: ThreadNotice = { kind: 'dm', from: sender1.cert.walletAddress, threadId: dmThreadId(myAddress, sender1.cert.walletAddress), ts: 100 };
    const notice2: ThreadNotice = { kind: 'dm', from: sender2.cert.walletAddress, threadId: dmThreadId(myAddress, sender2.cert.walletAddress), ts: 200 };
    const notice3: ThreadNotice = { kind: 'dm', from: sender3.cert.walletAddress, threadId: dmThreadId(myAddress, sender3.cert.walletAddress), ts: 300 };

    const bytes1 = await encodeThreadNotice(notice1, owner.pubHex, sender1.privateKeyHex, sender1.cert);
    const bytes2 = await encodeThreadNotice(notice2, owner.pubHex, sender2.privateKeyHex, sender2.cert);
    const bytes3 = await encodeThreadNotice(notice3, owner.pubHex, sender3.privateKeyHex, sender3.cert);

    vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
      for (const m of [bytes1, bytes2, bytes3]) {
        await onMessage(m);
      }
    });

    const onThreadNotice = vi.fn();
    await queryInboxNotices(myAddress, owner.privHex, onThreadNotice);

    expect(onThreadNotice).toHaveBeenCalledTimes(3);
    expect(onThreadNotice).toHaveBeenCalledWith(notice1);
    expect(onThreadNotice).toHaveBeenCalledWith(notice2);
    expect(onThreadNotice).toHaveBeenCalledWith(notice3);
  });

  it('delivers a well-formed event notice alongside dm notices in the same replay', async () => {
    const owner = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const dmSender = await makeGenuineCertWithKey();
    const eventSender = await makeGenuineCertWithKey();
    const draftId = 'draft-42';

    const dmNotice: ThreadNotice = { kind: 'dm', from: dmSender.cert.walletAddress, threadId: dmThreadId(myAddress, dmSender.cert.walletAddress), ts: 100 };
    const eventNotice: ThreadNotice = { kind: 'event', from: eventSender.cert.walletAddress, threadId: threadIdForDraft(draftId), draftId, ts: 200 };

    const bytes1 = await encodeThreadNotice(dmNotice, owner.pubHex, dmSender.privateKeyHex, dmSender.cert);
    const bytes2 = await encodeThreadNotice(eventNotice, owner.pubHex, eventSender.privateKeyHex, eventSender.cert);

    vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
      for (const m of [bytes1, bytes2]) await onMessage(m);
    });

    const onThreadNotice = vi.fn();
    await queryInboxNotices(myAddress, owner.privHex, onThreadNotice);

    expect(onThreadNotice).toHaveBeenCalledTimes(2);
    expect(onThreadNotice).toHaveBeenCalledWith(dmNotice);
    expect(onThreadNotice).toHaveBeenCalledWith(eventNotice);
  });
});

// ---- queryInboxNotices isolation from malformed decrypted notices ----
describe('queryInboxNotices isolation from malformed decrypted notices', () => {
  const testEnc = new TextEncoder();
  const myAddress = '0x1111111111111111111111111111111111111111' as const;

  async function encodeMalformedNotice(
    malformedPlaintext: unknown,
    ownerSessionPubHex: string,
    mySessionPrivHex: string,
    myCert: SessionCert,
  ): Promise<Uint8Array> {
    const encBlob = await wrapBytes(testEnc.encode(JSON.stringify(malformedPlaintext)), ownerSessionPubHex, mySessionPrivHex);
    return testEnc.encode(JSON.stringify({ t: 'dm', cert: myCert, enc: encBlob }));
  }

  it('delivers both well-formed notices even when a malformed-but-decryptable one sits between them', async () => {
    const owner = keypair();
    const sender1 = await makeGenuineCertWithKey();
    const attacker = await makeGenuineCertWithKey();
    const sender2 = await makeGenuineCertWithKey();

    const notice1: ThreadNotice = { kind: 'dm', from: sender1.cert.walletAddress, threadId: dmThreadId(myAddress, sender1.cert.walletAddress), ts: 100 };
    const malformed = { kind: 'dm', from: attacker.cert.walletAddress, ts: 999 };
    const notice2: ThreadNotice = { kind: 'dm', from: sender2.cert.walletAddress, threadId: dmThreadId(myAddress, sender2.cert.walletAddress), ts: 200 };

    const bytes1 = await encodeThreadNotice(notice1, owner.pubHex, sender1.privateKeyHex, sender1.cert);
    const malformedBytes = await encodeMalformedNotice(malformed, owner.pubHex, attacker.privateKeyHex, attacker.cert);
    const bytes2 = await encodeThreadNotice(notice2, owner.pubHex, sender2.privateKeyHex, sender2.cert);

    vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
      for (const m of [bytes1, malformedBytes, bytes2]) {
        await onMessage(m);
      }
    });

    const onThreadNotice = vi.fn();

    await expect(queryInboxNotices(myAddress, owner.privHex, onThreadNotice)).resolves.toBeUndefined();

    expect(onThreadNotice).toHaveBeenCalledTimes(2);
    expect(onThreadNotice).toHaveBeenCalledWith(notice1);
    expect(onThreadNotice).toHaveBeenCalledWith(notice2);
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `yarn test:unit -- inbox.test.ts`
Expected: FAIL — `inbox.ts` still imports `isExpired` from `./session` (removed in Task 1), so this is a compile-time failure, and `queryPeerKeyBundle`'s old implementation still filters on `cert.expiresAtUnixMs`, which no longer exists on `SessionCert` (TS error).

- [ ] **Step 3: Update `inbox.ts`**

Edit `src/lib/xaomsg/inbox.ts` line 7:
```ts
import { verifySessionCert } from './session';
```

Edit `tryDecodeThreadNotice` (originally lines 67-81) — remove the `isExpired` check:
```ts
export async function tryDecodeThreadNotice(bytes: Uint8Array, mySessionPrivHex: string): Promise<ThreadNotice | null> {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'dm' || !o.cert || !o.enc) return null;
    const senderCert = o.cert as SessionCert;
    if (!(await verifySessionCert(senderCert))) return null;
    const plain = await unwrapBytes(o.enc, senderCert.sessionPublicKeyHex, mySessionPrivHex);
    const notice = JSON.parse(dec.decode(plain)) as ThreadNotice;
    if (typeof notice.from !== 'string' || notice.from.toLowerCase() !== senderCert.walletAddress.toLowerCase()) {
      return null;
    }
    return notice;
  } catch { return null; }
}
```

Replace `queryPeerKeyBundle` (originally lines 111-149):
```ts
/** Fetch the peer's session cert (their session pubkey) from their inbox
 *  topic history. Returns null if the peer has never published one (→
 *  caller blocks the cold DM).
 *
 *  The inbox topic is publicly writable, so any bundle in history is
 *  attacker-controlled until its wallet signature verifies. Because the
 *  session keypair is now a deterministic function of the wallet
 *  (session.ts), every genuinely-signed cert for a given wallet carries the
 *  identical session pubkey — there is no "which one is the current
 *  session" ambiguity left to resolve (see the 2026-07-29 publish-time fix
 *  this replaces, described in docs/architecture/xaomsg-messaging.md), so
 *  this just needs to find ANY structurally-matching, signature-valid cert
 *  for the peer's address. */
export async function queryPeerKeyBundle(peer: Address): Promise<SessionCert | null> {
  const peerLower = peer.toLowerCase();
  const candidates: SessionCert[] = [];
  await queryHistory(inboxTopicForAddress(peer), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (!cert) return;
    // A cert can be genuinely self-signed by a wallet that is NOT the peer —
    // anyone can post their own cert onto the peer's public topic. Only a
    // cert whose walletAddress matches the queried peer proves ownership.
    if (cert.walletAddress?.toLowerCase() !== peerLower) return;
    candidates.push(cert);
  });
  for (const cert of candidates) {
    if (await verifySessionCert(cert)) return cert;
  }
  return null;
}
```

Edit `subscribeInbox`'s key-bundle branch (originally lines 160-171) — remove the `isExpired` check:
```ts
  return subscribeToTopic(inboxTopicForAddress(myAddress), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (cert) {
      // Never surface an unverified cert — the topic is publicly writable.
      // Only my own cert belongs on my topic (publishKeyBundle publishes a
      // wallet's cert to its own topic); a validly self-signed cert for a
      // different wallet is off-invariant and must not reach the callback.
      if (cert.walletAddress?.toLowerCase() !== myAddress.toLowerCase()) return;
      void verifySessionCert(cert).then((ok) => { if (ok) onKeyBundle(cert); });
      return;
    }
    void tryDecodeThreadNotice(bytes, mySessionPrivHex).then((n) => {
      if (!n || !isValidThreadNotice(myAddress, n)) return;
      onThreadNotice(n);
    });
  });
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `yarn test:unit -- inbox.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/inbox.ts src/lib/xaomsg/inbox.test.ts
git commit -m "feat(xaomsg): drop cert-expiry checks and publish-time ranking from inbox.ts"
```

---

## Task 5: Mechanical fixture updates — `sync.test.ts`, `draftSync.test.ts`, `merge.test.ts`

**Files:**
- Modify: `src/lib/xaomsg/sync.test.ts:30,38-48` (helper rewrite, real behavior unaffected)
- Modify: `src/lib/xaomsg/draftSync.test.ts:31-38` (drop two fields, no behavior change)
- Modify: `src/lib/xaomsg/merge.test.ts:21-28` (drop two fields, no behavior change)

**Interfaces:**
- Consumes (from Task 1): `deriveSessionKeypair` from `./session` (only `sync.test.ts` imports session helpers directly).

- [ ] **Step 1: Update `sync.test.ts`**

Replace the import on line 30:
```ts
import { deriveSessionKeypair } from './session';
```

Replace `makeSession` (originally lines 38-48):
```ts
async function makeSession(account: Account): Promise<PersistedSession> {
  const { privateKey, cert } = await deriveSessionKeypair(account.address, (message) => account.signMessage({ message }));
  return { cert, privateKeyHex: privateKey };
}
```

- [ ] **Step 2: Update `draftSync.test.ts`**

In `makeResolved` (around line 31-38), remove the two expiry/chain lines from the inline `cert` object:
```ts
      cert: {
        v: 1,
        walletAddress: overrides.sender,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as Hex,
      },
```

- [ ] **Step 3: Update `merge.test.ts`**

In `msg()` (around line 21-28), remove the two expiry/chain lines from the inline `cert` object:
```ts
      cert: {
        v: 1,
        walletAddress: '0x0000000000000000000000000000000000000001',
        sessionPublicKeyHex: '0x00',
        walletSignature: '0x00' as Hex,
      },
```

- [ ] **Step 4: Run all three test files**

Run: `yarn test:unit -- sync.test.ts draftSync.test.ts merge.test.ts`
Expected: PASS, all tests green (no behavioral assertions changed — this task is purely fixture upkeep so the suite compiles against the new `SessionCert` shape).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/sync.test.ts src/lib/xaomsg/draftSync.test.ts src/lib/xaomsg/merge.test.ts
git commit -m "test(xaomsg): update SessionCert fixtures for dropped expiry/chainId fields"
```

---

## Task 6: Update docs and stale comments

**Files:**
- Modify: `docs/architecture/xaomsg-messaging.md` (Identity & encryption section; "peer key-bundle selection" and "mint continuity" Gotchas)
- Modify: `src/hooks/useXaoEvent.ts:39-44` (stale comment referencing `SESSION_DURATION_MS`/cert expiry)

- [ ] **Step 1: Update `docs/architecture/xaomsg-messaging.md`**

In the "Identity & encryption" section, replace the "Session keypair" bullet (originally the line starting `- **Session keypair**:`) with:

```markdown
- **Session keypair**: `session.ts`'s `deriveSessionKeypair(walletAddress, signMessage)` deterministically derives a secp256k1 keypair from two wallet signatures — one secret (`sessionKeyDerivationMessage`, seeds the keypair via HKDF-SHA256 → `secp.etc.hashToPrivateKey`, never transmitted) and one public (`sessionCertChallenge`, becomes the broadcastable `SessionCert.walletSignature`). The same wallet reproduces the identical keypair and cert on any device/origin — no randomness, no per-device divergence, no expiry. This is a deliberate trade-off: the key can never be rotated per-user (only a hard-coded derivation-message version change would ever change it for everyone), mirroring the trust model DM/event conversation keys already use (deterministic ECDH, also no rotation). See `docs/superpowers/specs/2026-07-30-deterministic-session-keys-design.md`.
```

Replace the "Duration & storage — current" bullet with:
```markdown
- **Duration & storage — current**: no expiry. `{cert, privateKeyHex}` persisted indefinitely in `localStorage` under `xao-msg-session-<wallet lowercased>` (only explicit logout, `localStorage` clearing, or the two-signature `unlock()` flow re-running clears/regenerates it — regenerating always reproduces the same bytes for the same wallet). Falls back to an in-memory `Map` if `localStorage` throws (some private-browsing modes) — session then only lasts the tab's lifetime.
```

In the Gotchas section, replace the "Peer key-bundle selection is by publish time..." entry with:
```markdown
- **Peer key-bundle selection no longer needs publish-time ranking (fixed 2026-07-30 via deterministic keys).** `queryPeerKeyBundle` used to rank candidate certs by Waku publish timestamp rather than self-declared expiry, working around the fact that a wallet with more than one random session in its inbox history could have several simultaneously-valid, differently-pubkeyed certs (see the 2026-07-29 fix this superseded). Now that session keypairs are deterministically derived from the wallet (`docs/superpowers/specs/2026-07-30-deterministic-session-keys-design.md`), every genuinely-signed cert for a wallet carries the identical pubkey — `queryPeerKeyBundle` just accepts the first structurally-valid, signature-verified cert found, order-independent.
```

Replace the "Mint continuity does not survive a genuinely fresh device..." entry with:
```markdown
- **Mint continuity now survives a fresh device or session rotation (fixed 2026-07-30).** Previously, inbox notices (including the mint-pairing notice) were ECIES-encrypted to whichever *random* session pubkey was current when the sender looked up the recipient — undecryptable by any other device or a rotated session. Since session keypairs are now deterministically derived from the wallet, every device/origin re-derives the identical keypair, so a notice encrypted to "the wallet's session pubkey" is decryptable everywhere that wallet unlocks XaoMsg, including a genuinely fresh device. The remaining bound is Waku's store retention window itself (a session logging in after a given notice has aged out of Store history still falls back to the legacy `threadIdForShow` path) — not session/device identity anymore.
```

- [ ] **Step 2: Fix the stale comment in `useXaoEvent.ts`**

Edit `src/hooks/useXaoEvent.ts` lines 39-44:
```ts
// Cache is checked FIRST, before any network call — unlike a naive
// "always fetch the peer's cert" order, this means a thread whose key we
// already hold stays readable even without a live network round-trip to
// re-fetch the peer's cert. Session keys are now deterministically derived
// from the wallet (session.ts) and never expire, so this is purely a perf
// optimization, not a correctness dependency on cert freshness.
async function negotiateKey(
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/xaomsg-messaging.md src/hooks/useXaoEvent.ts
git commit -m "docs(xaomsg): update architecture doc and stale comments for deterministic session keys"
```

---

## Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. In particular, confirm nothing outside the files touched in Tasks 1-6 still references `createSessionKeypair`, `mintSessionCert`, `sessionChallengeString`, `isExpired`, `SESSION_DURATION_MS`, or `ChallengeFields`:

Run: `grep -rn "createSessionKeypair\|mintSessionCert\|sessionChallengeString\|SESSION_DURATION_MS\|ChallengeFields" src/ --include="*.ts" --include="*.tsx"`
Expected: no output.

- [ ] **Step 2: Full test suite**

Run: `yarn test:unit`
Expected: all suites PASS, no regressions outside the files this plan touched.

- [ ] **Step 3: Lint**

Run: `npx eslint src/lib/xaomsg/session.ts src/lib/xaomsg/inbox.ts src/lib/xaomsg/envelope.ts src/hooks/useXaoMsgSession.ts src/hooks/useXaoEvent.ts`
Expected: no errors.

- [ ] **Step 4: Manual smoke check (no automated hook-test coverage exists for `useXaoMsgSession`)**

With the dev server running (check first per `CLAUDE.md`: `pgrep -af "next dev|yarn dev"`), in a browser:
1. Connect a wallet, land on `/unlock-chat`, confirm exactly **two** wallet signature prompts appear (not one, not three) before landing on `/dashboard`.
2. Open the browser's Application/Storage panel, confirm `localStorage['xao-msg-session-<address>']` contains a cert with no `expiresAtUnixMs`/`chainId` field.
3. Reload the page — confirm no new signature prompt fires (cached session re-verifies silently).
4. Clear `localStorage` for that origin, reload, unlock again — confirm the newly persisted `privateKeyHex`/`sessionPublicKeyHex` are byte-identical to what was cleared (proves determinism end-to-end through the real wallet, not just the unit tests' local-account simulation).
5. If a second browser/origin is available for the same wallet (e.g. `localhost:3000` vs the Vercel deployment, matching the original bug report): confirm both now derive the same `sessionPublicKeyHex` after unlocking on each.

This step has no `- [ ]` sub-checkbox automation because it requires a live wallet and (for step 5) two origins — record the outcome in the PR description rather than as a commit.

- [ ] **Step 5: Final commit (only if Step 4 required any fixups)**

If the manual smoke check surfaces a fixup, make the minimal corresponding code change, re-run Steps 1-3, then:
```bash
git add -A
git commit -m "fix(xaomsg): address smoke-test finding in deterministic session key flow"
```
If no fixup was needed, this task produces no additional commit.

---

## Self-Review Notes (completed during plan authoring)

- **Spec coverage:** §3 (derivation) → Task 1. §4 (cert shape) → Task 1. §5 (unlock flow) → Task 2. §6 (queryPeerKeyBundle cleanup) → Task 4. §7 (no-rotation trade-off) → reflected in Task 1's doc comments, no separate task needed (it's a property of the design, not a code path). §8 (no migration) → Task 2's staleness-check-then-clear behavior. §9 (testing) → Tasks 1, 4. §10 (files touched) → matches Tasks 1-6 exactly, plus `envelope.ts`/`envelope.test.ts` and `useXaoEvent.ts`'s comment, which the spec's §10 list didn't enumerate but are required consequences of §4/§6 (any `isExpired` importer must adapt) — added here as Tasks 3 and part of 6.
- **Placeholder scan:** no TBD/TODO; Task 7 Step 4 is intentionally manual (no hook-test infra exists) rather than a placeholder — this is stated explicitly, not glossed over.
- **Type consistency:** `deriveSessionKeypair`'s return shape (`{privateKey, publicKey, cert}`) is used identically in Tasks 1, 2, 3, 4, 5. `PersistedSession { cert, privateKeyHex }` unchanged throughout. `SessionCert` fields (`v, walletAddress, sessionPublicKeyHex, walletSignature`) match across every file that constructs one (Tasks 1, 4, 5).
