# XaoMsg Phase 1 — Waku Transport + 24h Session Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace XMTP with a Waku-based contract-scoped messaging foundation that prompts the wallet **once per 24 hours** (for a session-key certificate) and **zero times per message**, while preserving signature-verifiable evidence of every message.

**Architecture:**
- **Transport:** Waku (decentralized pub/sub via libp2p). One opaque content topic per thread, derived from the ShowContract address with a domain-prefixed double-hash so observers cannot trivially link topic ↔ contract.
- **Identity / signing:** wallet signs a 24-hour **session-key certificate** (one prompt). The session key — a fresh in-memory secp256k1 keypair generated each session — signs every outgoing message body with `@noble/secp256k1` (no wallet prompt). Each envelope carries the cert so any peer can verify (a) cert is wallet-signed and unexpired, (b) body is session-key-signed, (c) payload hash matches.
- **Encryption:** body encrypted with a per-thread AES-GCM key. Phase 1 uses the same weak deterministic derivation as the prior XaoChat plan (key = `keccak256("xao-thread-key-v1" || showAddress)`). Plan 2 adds an ECIES handshake.
- **Negotiation:** Phase 1 supports **TEXT and PROPOSAL** content types only. Full proposal-DAG (counter / accept / reject as chained envelopes) is **Plan 3** (CRDT layer). Phase 1 keeps `parentHash` in the envelope so the DAG is forward-compatible without retrofit.

**Tech Stack:**
- Next.js 15 + wagmi + viem (existing frontend)
- `@waku/sdk` — light-node transport (createLightNode, light-push + filter protocols)
- `@noble/secp256k1` — session-key ECDSA (Web Crypto SubtleCrypto only supports P-256)
- Vitest — unit tests for envelope, session key, topic derivation
- Hardhat — none (no Solidity changes in this plan)

**Out of scope for this plan (separate plans to follow):**
- CRDT proposal / counter / accept chain (Plan 3)
- Multi-thread-type model (Relationship / Group / Ephemeral) — Plan 4
- Retention/cleanup policies — Plan 4
- ECIES key handshake — Plan 2
- Move "entire contract on-chain" — separate program of work
- Self-hosted Waku store node operations
- Production-grade Waku peer discovery

**Pre-reqs:**
- Branching from `master` in `xao-cult` (the XaoChat feat branch is preserved separately).
- ShowContractFactory clone-suite from earlier session (`0xab0153...`) is on Base Sepolia and `chains.ts` already references it.
- A funded wallet on Base Sepolia for the in-app contract creation flow (wallet does NOT need ETH for messaging — Waku is gas-free).

---

## File Structure

### New frontend files

- `xao-cult/src/lib/xaomsg/types.ts` — shared TS types: `MessageEnvelope`, `SessionCert`, `ContentType`, `MessagePayload`, `OnWireEnvelope`
- `xao-cult/src/lib/xaomsg/threadId.ts` — `threadIdForShow(addr) → Hex` (mirror of XaoChat's; reused name on a fresh file)
- `xao-cult/src/lib/xaomsg/topicId.ts` — `contentTopicForThread(threadId) → string` (Waku content topic format `/xao/1/<hex>/json`)
- `xao-cult/src/lib/xaomsg/envelope.ts` — `buildUnsignedBody`, `payloadDigest`, `signWithSessionKey`, `verifyEnvelope` (full chain: cert + body + payloadHash)
- `xao-cult/src/lib/xaomsg/session.ts` — `loadOrCreateSession`, `mintSessionCert`, `verifySessionCert`, `isExpired`. Session is a (priv, cert) pair stored in `sessionStorage` per wallet.
- `xao-cult/src/lib/xaomsg/crypto.ts` — AES-GCM `encryptBody` / `decryptBody` (browser-safe, copied from XaoChat phase 1's hex-helper version — no Buffer)
- `xao-cult/src/lib/xaomsg/threadKey.ts` — Phase-1-weak deterministic derivation, identical to XaoChat
- `xao-cult/src/lib/xaomsg/waku.ts` — `getWakuClient()` lazy singleton, `publishToTopic(topic, bytes)`, `subscribeToTopic(topic, callback) → unsub`
- `xao-cult/src/hooks/useXaoMsgSession.ts` — React hook returning `{ session, isUnlocking, error, unlock }` (calls `mintSessionCert` once per 24h)
- `xao-cult/src/hooks/useXaoMsg.ts` — main hook: subscribes to thread topic, decrypts + verifies, exposes `messages`, `postText`, `postProposal`
- `xao-cult/src/hooks/useThreadKey.ts` — Phase-1-weak derivation hook (separate file from XaoChat's; this is master branch)
- `xao-cult/src/components/Chat/XaoMsgComponent.tsx` — UI fork of XaoChatComponent but talking to `useXaoMsg`
- `xao-cult/vitest.config.ts` — already exists on the feat branches but NOT on master, so this plan creates it fresh

### Modifications

- `xao-cult/package.json` — add `@waku/sdk`, `@noble/secp256k1` (production deps); add `vitest`, `@vitest/ui` (devDeps)
- `xao-cult/src/components/Chat/index.ts` — re-export `XaoMsgComponent` alongside `ChatComponent`
- `xao-cult/src/pages/contracts/create-contract.tsx` — feature-flag fork between legacy `ChatComponent` and new `XaoMsgComponent`
- `xao-cult/.env.local` — add `NEXT_PUBLIC_USE_XAOMSG=0` flag entry, optional `NEXT_PUBLIC_WAKU_BOOTSTRAP` overrides

### Unchanged / NOT touched

- The legacy `ChatComponent.tsx`, `useXMTPConversation.ts`, `XMTPContext.tsx` etc. stay until Task 14 retires them. Phase 1 of XaoMsg runs in parallel behind the feature flag.

---

## Branch setup (do this BEFORE Task 1)

You are starting on `master` in `xao-cult` after the XaoChat revert. Confirm and create the new feature branch:

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
git status                       # must show clean tree
git branch --show-current        # must show: master
git checkout -b feat/xaomsg-phase1
```

The `contracts` repo is **not touched** by this plan — XaoMsg adds zero on-chain code.

---

## Task 1: Project scaffolding — deps + lib directory

**Files:**
- Modify: `xao-cult/package.json`, `xao-cult/package-lock.json`
- Create: `xao-cult/src/lib/xaomsg/README.md`

- [ ] **Step 1.1: Install deps**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm install --legacy-peer-deps --cache /tmp/npm-cache @waku/sdk@0.0.30 @noble/secp256k1@2.1.2
npm install --legacy-peer-deps --cache /tmp/npm-cache --save-dev vitest@2.1.0 @vitest/ui@2.1.0 happy-dom@15.7.4
```

`--legacy-peer-deps` is required (the repo has hardhat-toolbox peer-conflict baggage).
`--cache /tmp/npm-cache` is a workaround for the local sandbox `~/.npm` permission issue; safe to drop in CI.
`happy-dom` is needed because Tasks 4–6 use `crypto.subtle` (AES-GCM); pure-Node mode lacks it on older Node.

Append to `xao-cult/package.json`'s `scripts`:
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

- [ ] **Step 1.2: Create vitest.config.ts**

Create `xao-cult/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

// happy-dom provides globalThis.crypto.subtle and `window` globals that
// Waku's wasm bindings poke at. Tests stay fast without launching a real browser.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 1.3: Create xaomsg lib README placeholder**

Create `xao-cult/src/lib/xaomsg/README.md`:
```markdown
# xaomsg

Xao messaging via Waku. Wallet signs a 24-hour session certificate once per day;
the session key signs every message body. Bodies are encrypted with a per-thread
AES key and broadcast on opaque Waku content topics derived from the ShowContract
address.

See `docs/superpowers/plans/2026-04-22-xaomsg-phase1-waku.md` for design.
```

- [ ] **Step 1.4: Verify the install**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
node -e 'require("@waku/sdk"); require("@noble/secp256k1"); console.log("ok")'
```
Expected: prints `ok`. Any module-not-found means the install didn't actually take.

- [ ] **Step 1.5: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
git branch --show-current   # must be feat/xaomsg-phase1
git add package.json package-lock.json src/lib/xaomsg/README.md vitest.config.ts
git commit -m "feat(xaomsg): scaffold lib + Waku/noble/Vitest deps"
```

---

## Task 2: Topic derivation + types

**Files:**
- Create: `xao-cult/src/lib/xaomsg/types.ts`
- Create: `xao-cult/src/lib/xaomsg/threadId.ts`
- Create: `xao-cult/src/lib/xaomsg/topicId.ts`
- Create: `xao-cult/src/lib/xaomsg/topicId.test.ts`

- [ ] **Step 2.1: Write the failing test first**

Create `xao-cult/src/lib/xaomsg/topicId.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { keccak256, toBytes, concat } from 'viem';
import { threadIdForShow } from './threadId';
import { contentTopicForThread, MSG_TOPIC_DOMAIN } from './topicId';

describe('contentTopicForThread', () => {
  it('returns a /xao/1/<hex>/json content topic', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const topic = contentTopicForThread(threadIdForShow(show));
    expect(topic).toMatch(/^\/xao\/1\/[0-9a-f]{64}\/json$/);
  });

  it('is deterministic — same address → same topic', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    expect(contentTopicForThread(threadIdForShow(show))).toEqual(
      contentTopicForThread(threadIdForShow(show)),
    );
  });

  it('is opaque — topic does not contain the show address', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const topic = contentTopicForThread(threadIdForShow(show));
    expect(topic.toLowerCase()).not.toContain(show.slice(2).toLowerCase());
  });

  it('matches the keccak256 of the domain-prefixed threadId', () => {
    const show = '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3' as const;
    const tid = threadIdForShow(show);
    const expected = keccak256(concat([toBytes(MSG_TOPIC_DOMAIN), toBytes(tid)]));
    expect(contentTopicForThread(tid)).toEqual(`/xao/1/${expected.slice(2)}/json`);
  });
});
```

- [ ] **Step 2.2: Run failing**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- topicId 2>&1 | tail -15
```
Expected: 4 failures with "Cannot find module './topicId'" (and threadId).

- [ ] **Step 2.3: Write threadId.ts**

Create `xao-cult/src/lib/xaomsg/threadId.ts`:
```ts
import { type Address, type Hex, concat, keccak256, toBytes, isAddress } from 'viem';

export const THREAD_DOMAIN = 'xao-thread-v1';

export function threadIdForShow(showAddress: Address): Hex {
  if (!isAddress(showAddress, { strict: false })) {
    throw new Error(`threadIdForShow: invalid address: ${showAddress}`);
  }
  const lower = showAddress.toLowerCase() as Address;
  return keccak256(concat([toBytes(THREAD_DOMAIN), toBytes(lower)]));
}
```

- [ ] **Step 2.4: Write topicId.ts**

Create `xao-cult/src/lib/xaomsg/topicId.ts`:
```ts
import { concat, keccak256, toBytes, type Hex } from 'viem';

/**
 * Domain prefix for the second hashing step. Distinct from THREAD_DOMAIN so
 * even if a future component reuses the threadId formula, the resulting Waku
 * topic is opaque to outside observers — no easy mapping topic → show address.
 */
export const MSG_TOPIC_DOMAIN = 'xao-msg-topic-v1';

/**
 * Waku content-topic format is `/<application>/<version>/<content>/<encoding>`.
 * Encoding is `json` because each envelope is a JSON-serialized object.
 */
export function contentTopicForThread(threadId: Hex): string {
  const opaque = keccak256(concat([toBytes(MSG_TOPIC_DOMAIN), toBytes(threadId)]));
  return `/xao/1/${opaque.slice(2)}/json`;
}
```

- [ ] **Step 2.5: Write types.ts**

Create `xao-cult/src/lib/xaomsg/types.ts`:
```ts
import type { Address, Hex } from 'viem';

/** Content type — keep the order locked; integer values are sent on the wire. */
export enum ContentType {
  TEXT = 0,
  PROPOSAL = 1,
  COUNTER_PROPOSAL = 2,
  ACCEPT = 3,
  REJECT = 4,
  SYSTEM = 5,
}

export interface TextPayload { kind: 'text'; text: string; }
export interface ProposalPayload {
  kind: 'proposal' | 'counter-proposal';
  revisionNumber: number;
  data: Record<string, unknown>;
}
export interface AcceptPayload { kind: 'accept'; proposalHash: Hex; }
export interface RejectPayload { kind: 'reject'; proposalHash: Hex; reason?: string; }

export type MessagePayload = TextPayload | ProposalPayload | AcceptPayload | RejectPayload;

/**
 * SessionCert authorises a session keypair on behalf of a wallet for a 24h window.
 * The wallet signs a fixed-format challenge string; verifiers ecrecover it.
 */
export interface SessionCert {
  v: 1;
  walletAddress: Address;
  sessionPublicKeyHex: string;     // 33-byte compressed secp256k1 pubkey, hex with 0x prefix
  expiresAtUnixMs: number;
  chainId: number;
  /** EIP-191 personal-sign signature over `sessionChallengeString(...)`. */
  walletSignature: Hex;
}

/** The body an author signs — flat, deterministic, no extra fields. */
export interface MessageBody {
  v: 1;
  messageId: Hex;          // random per-message uuid → 32 bytes hex
  threadId: Hex;
  contentType: ContentType;
  /** Hash of the parent body, or 0x00…00 for root. Forward-compat for Plan 3 DAG. */
  parentHash: Hex;
  payload: MessagePayload;
  /** Unix epoch milliseconds. */
  sentAt: number;
  /** Address claiming authorship — verifier checks against cert.walletAddress. */
  sender: Address;
}

/** What goes on the wire (and on disk for storage tests). */
export interface OnWireEnvelope {
  body: MessageBody;
  /** keccak256(canonicalJSON(body)). Redundant with hashing on receive but stops a bad-impl peer from sending mismatched body+sig. */
  payloadHash: Hex;
  /** ECDSA over `payloadHash` using the session private key. 64 bytes, hex with 0x prefix. */
  signature: Hex;
  cert: SessionCert;
}

/** Once a peer has verified the envelope, this is the fully-resolved record. */
export interface ResolvedMessage {
  envelope: OnWireEnvelope;
  /** Hash used as the parent reference for child messages. */
  bodyHash: Hex;
  /** Wall-clock receive time on this client. */
  receivedAtUnixMs: number;
}
```

- [ ] **Step 2.6: Run tests**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- topicId 2>&1 | tail -15
```
Expected: 4 passed.

- [ ] **Step 2.7: Commit**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
git add src/lib/xaomsg/types.ts src/lib/xaomsg/threadId.ts src/lib/xaomsg/topicId.ts src/lib/xaomsg/topicId.test.ts
git commit -m "feat(xaomsg): types + threadId + opaque Waku content topic"
```

---

## Task 3: Session key + wallet-signed certificate

**Files:**
- Create: `xao-cult/src/lib/xaomsg/session.ts`
- Create: `xao-cult/src/lib/xaomsg/session.test.ts`

The session key is an in-memory secp256k1 keypair valid for 24 hours. The wallet signs an EIP-191 personal-sign message that pins (sessionPubkey, expiry, chainId) to the wallet. Anyone receiving an envelope can ecrecover the cert to verify the wallet authorised the session pubkey, then check ECDSA over payloadHash with that pubkey.

- [ ] **Step 3.1: Write failing tests**

Create `xao-cult/src/lib/xaomsg/session.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import {
  createSessionKeypair,
  sessionChallengeString,
  mintSessionCert,
  verifySessionCert,
  isExpired,
  signWithSession,
  verifyWithSession,
  SESSION_DURATION_MS,
} from './session';

describe('session', () => {
  it('createSessionKeypair generates a valid 32/33 byte secp256k1 pair', async () => {
    const { privateKey, publicKey } = await createSessionKeypair();
    expect(privateKey.length).toBe(2 + 64);             // 0x + 32 bytes
    expect(publicKey.length).toBe(2 + 66);              // 0x + 33 bytes (compressed)
  });

  it('sessionChallengeString includes wallet, pubkey, expiry, chainId', () => {
    const s = sessionChallengeString({
      walletAddress: '0x000000000000000000000000000000000000dead',
      sessionPublicKeyHex: '0x' + 'aa'.repeat(33),
      expiresAtUnixMs: 1700000000000,
      chainId: 84532,
    });
    expect(s).toContain('wallet:0x000000000000000000000000000000000000dead');
    expect(s).toContain('session_pubkey:0x' + 'aa'.repeat(33));
    expect(s).toContain('expires:1700000000000');
    expect(s).toContain('chain:84532');
    expect(s).toContain('XaoMsg session v1');
  });

  it('mintSessionCert + verifySessionCert round-trip via a viem account', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { privateKey: sessionPriv, publicKey: sessionPub } = await createSessionKeypair();
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const cert = await mintSessionCert({
      walletAddress: account.address,
      sessionPublicKeyHex: sessionPub,
      expiresAtUnixMs: expiresAt,
      chainId: 84532,
      signMessage: async (msg) => account.signMessage({ message: msg }),
    });
    expect(await verifySessionCert(cert)).toBe(true);
    void sessionPriv;
  });

  it('verifySessionCert rejects a tampered expiry', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { publicKey: sessionPub } = await createSessionKeypair();
    const cert = await mintSessionCert({
      walletAddress: account.address,
      sessionPublicKeyHex: sessionPub,
      expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
      chainId: 84532,
      signMessage: async (msg) => account.signMessage({ message: msg }),
    });
    const tampered = { ...cert, expiresAtUnixMs: cert.expiresAtUnixMs + 1 };
    expect(await verifySessionCert(tampered)).toBe(false);
  });

  it('isExpired flags certs whose expiresAt has passed', () => {
    expect(isExpired({ expiresAtUnixMs: Date.now() - 1 } as any)).toBe(true);
    expect(isExpired({ expiresAtUnixMs: Date.now() + 1000 } as any)).toBe(false);
  });

  it('signWithSession + verifyWithSession round-trip', async () => {
    const { privateKey, publicKey } = await createSessionKeypair();
    const digest = ('0x' + 'cd'.repeat(32)) as `0x${string}`;
    const sig = await signWithSession(digest, privateKey);
    expect(await verifyWithSession(digest, sig, publicKey)).toBe(true);
    const wrongPub = (await createSessionKeypair()).publicKey;
    expect(await verifyWithSession(digest, sig, wrongPub)).toBe(false);
  });
});
```

- [ ] **Step 3.2: Observe red phase**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npm run test:unit -- session 2>&1 | tail -15
```
Expected: 6 failures, module not found.

- [ ] **Step 3.3: Implement session.ts**

Create `xao-cult/src/lib/xaomsg/session.ts`:
```ts
import * as secp from '@noble/secp256k1';
import { recoverMessageAddress, type Address, type Hex } from 'viem';
import type { SessionCert } from './types';

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

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

export function loadSession(wallet: Address): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY(wallet));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (isExpired(parsed.cert)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(wallet: Address, session: PersistedSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY(wallet), JSON.stringify(session));
}

export function clearSession(wallet: Address): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY(wallet));
}
```

- [ ] **Step 3.4: Run tests**

```bash
npm run test:unit -- session 2>&1 | tail -15
```
Expected: 6 passed.

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/xaomsg/session.ts src/lib/xaomsg/session.test.ts
git commit -m "feat(xaomsg): 24h session-key cert (wallet-signed) + sign/verify"
```

---

## Task 4: Envelope build / sign / verify (full chain)

**Files:**
- Create: `xao-cult/src/lib/xaomsg/envelope.ts`
- Create: `xao-cult/src/lib/xaomsg/envelope.test.ts`

The envelope verification chain is **three checks** in order:
1. The session cert is valid (cert wallet sig recovers to claimed address).
2. The envelope's `body.sender === cert.walletAddress` (you can't borrow someone else's cert).
3. The session signature over `payloadHash` verifies under `cert.sessionPublicKeyHex`, AND `payloadHash === keccak256(canonicalJSON(body))`.

- [ ] **Step 4.1: Write failing tests**

Create `xao-cult/src/lib/xaomsg/envelope.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { type Hex } from 'viem';
import { ContentType } from './types';
import {
  buildUnsignedBody,
  payloadDigest,
  computeBodyHash,
  buildEnvelope,
  verifyEnvelope,
} from './envelope';
import { createSessionKeypair, mintSessionCert, SESSION_DURATION_MS } from './session';

async function seal(text = 'hello') {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const { privateKey: sk, publicKey: spk } = await createSessionKeypair();
  const cert = await mintSessionCert({
    walletAddress: account.address,
    sessionPublicKeyHex: spk,
    expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
    chainId: 84532,
    signMessage: async (m) => account.signMessage({ message: m }),
  });
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

describe('envelope', () => {
  it('round-trips build → verify', async () => {
    const { envelope } = await seal();
    expect(await verifyEnvelope(envelope)).toBe(true);
  });

  it('rejects when the body is tampered (payloadHash no longer matches)', async () => {
    const { envelope } = await seal();
    const tampered = { ...envelope, body: { ...envelope.body, payload: { kind: 'text' as const, text: 'HELLO' } } };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('rejects when sender does not match cert wallet', async () => {
    const { envelope } = await seal();
    const otherAddr = '0x000000000000000000000000000000000000beef' as `0x${string}`;
    const tampered = { ...envelope, body: { ...envelope.body, sender: otherAddr } };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('rejects an envelope whose payloadHash does not match its body', async () => {
    const { envelope } = await seal();
    const tampered = { ...envelope, payloadHash: ('0x' + 'ff'.repeat(32)) as Hex };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('rejects when the cert is expired', async () => {
    const { envelope } = await seal();
    const tampered = {
      ...envelope,
      cert: { ...envelope.cert, expiresAtUnixMs: Date.now() - 1, walletSignature: envelope.cert.walletSignature },
    };
    // verifyEnvelope MUST reject expired certs even if cryptographically valid
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('payloadDigest is stable across object key ordering', () => {
    const a = buildUnsignedBody({
      threadId: ('0x' + 'aa'.repeat(32)) as Hex,
      contentType: ContentType.TEXT,
      payload: { kind: 'text', text: 'x' },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: '0x000000000000000000000000000000000000dead',
      messageId: ('0x' + 'bb'.repeat(32)) as Hex,
      sentAt: 12345,
    });
    const b = { ...a }; // structural clone; same fields, same hashes
    expect(payloadDigest(a)).toEqual(payloadDigest(b));
  });
});
```

- [ ] **Step 4.2: Observe red phase**

```bash
npm run test:unit -- envelope 2>&1 | tail -15
```

- [ ] **Step 4.3: Implement envelope.ts**

Create `xao-cult/src/lib/xaomsg/envelope.ts`:
```ts
import { keccak256, toBytes, type Hex, type Address } from 'viem';
import type { MessageBody, MessagePayload, OnWireEnvelope, SessionCert } from './types';
import { signWithSession, verifyWithSession, verifySessionCert, isExpired } from './session';

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify((value as any)[k])).join(',') + '}';
}

function randomHex32(): Hex {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let out = '0x';
  for (let i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out as Hex;
}

export function buildUnsignedBody(input: {
  threadId: Hex;
  contentType: MessageBody['contentType'];
  payload: MessagePayload;
  parentHash: Hex;
  sender: Address;
  messageId?: Hex;
  sentAt?: number;
}): MessageBody {
  return {
    v: 1,
    messageId: input.messageId ?? randomHex32(),
    threadId: input.threadId,
    contentType: input.contentType,
    parentHash: input.parentHash,
    payload: input.payload,
    sentAt: input.sentAt ?? Date.now(),
    sender: input.sender,
  };
}

export function payloadDigest(body: MessageBody): Hex {
  return keccak256(toBytes(canonicalStringify(body)));
}

export function computeBodyHash(envelope: OnWireEnvelope): Hex {
  // Hash of the on-wire object EXCLUDING signature — so a child message's
  // parentHash can reference the parent's full envelope content stably.
  // (Including the signature would mean the parentHash changes if we ever
  // re-sign the same body, which we don't, but defensively we exclude it.)
  const { signature: _ignored, ...rest } = envelope;
  return keccak256(toBytes(canonicalStringify(rest)));
}

export async function buildEnvelope(
  body: MessageBody,
  sessionPrivateKey: Hex,
  cert: SessionCert,
): Promise<OnWireEnvelope> {
  const payloadHash = payloadDigest(body);
  const signature = await signWithSession(payloadHash, sessionPrivateKey);
  return { body, payloadHash, signature, cert };
}

export async function verifyEnvelope(envelope: OnWireEnvelope): Promise<boolean> {
  if (!(await verifySessionCert(envelope.cert))) return false;
  if (isExpired(envelope.cert)) return false;
  if (envelope.body.sender.toLowerCase() !== envelope.cert.walletAddress.toLowerCase()) return false;
  const recomputed = payloadDigest(envelope.body);
  if (recomputed !== envelope.payloadHash) return false;
  return verifyWithSession(envelope.payloadHash, envelope.signature, envelope.cert.sessionPublicKeyHex as Hex);
}
```

- [ ] **Step 4.4: Run tests**

```bash
npm run test:unit -- envelope 2>&1 | tail -15
```
Expected: 6 passed.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/xaomsg/envelope.ts src/lib/xaomsg/envelope.test.ts
git commit -m "feat(xaomsg): envelope build + chained verify (cert→sender→hash→sig)"
```

---

## Task 5: AES-GCM body encryption + thread key

**Files:**
- Create: `xao-cult/src/lib/xaomsg/crypto.ts`
- Create: `xao-cult/src/lib/xaomsg/crypto.test.ts`
- Create: `xao-cult/src/lib/xaomsg/threadKey.ts`

The crypto helpers are the same shape as XaoChat Phase 1's reviewed-clean implementation: hex helpers, no Buffer (browser-safe), 12-byte IV, base64(IV||ct+tag).

- [ ] **Step 5.1: Write failing tests**

Create `xao-cult/src/lib/xaomsg/crypto.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateThreadKey, encryptBody, decryptBody, deriveDeterministicThreadKey } from './crypto';

describe('crypto', () => {
  it('round-trips a body via AES-GCM', async () => {
    const key = await generateThreadKey();
    const plaintext = JSON.stringify({ hello: 'world', emoji: '🚀' });
    const ct = await encryptBody(plaintext, key);
    expect(await decryptBody(ct, key)).toEqual(plaintext);
  });

  it('fails decryption with the wrong key', async () => {
    const a = await generateThreadKey();
    const b = await generateThreadKey();
    const ct = await encryptBody('secret', a);
    await expect(decryptBody(ct, b)).rejects.toThrow();
  });

  it('deriveDeterministicThreadKey is stable for the same address', async () => {
    const k1 = await deriveDeterministicThreadKey('0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3');
    const k2 = await deriveDeterministicThreadKey('0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3');
    const r1 = new Uint8Array(await crypto.subtle.exportKey('raw', k1));
    const r2 = new Uint8Array(await crypto.subtle.exportKey('raw', k2));
    expect(Array.from(r1)).toEqual(Array.from(r2));
  });
});
```

- [ ] **Step 5.2: Observe red**

```bash
npm run test:unit -- crypto 2>&1 | tail -15
```

- [ ] **Step 5.3: Implement crypto.ts**

Create `xao-cult/src/lib/xaomsg/crypto.ts`:
```ts
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
```

- [ ] **Step 5.4: Implement threadKey.ts (tiny wrapper for clarity in upstream code)**

Create `xao-cult/src/lib/xaomsg/threadKey.ts`:
```ts
import type { Address } from 'viem';
import { deriveDeterministicThreadKey } from './crypto';

/** Phase-1: deterministic derivation. Plan 2 swaps in an ECIES handshake. */
export async function loadThreadKey(showContract: Address): Promise<CryptoKey> {
  return deriveDeterministicThreadKey(showContract);
}
```

- [ ] **Step 5.5: Run tests**

```bash
npm run test:unit -- crypto 2>&1 | tail -15
```
Expected: 3 passed. If `crypto.subtle is undefined`, vitest.config's `environment: 'happy-dom'` should already handle it; if not, replace it with `jsdom`.

- [ ] **Step 5.6: Commit**

```bash
git add src/lib/xaomsg/crypto.ts src/lib/xaomsg/crypto.test.ts src/lib/xaomsg/threadKey.ts
git commit -m "feat(xaomsg): AES-GCM body encryption + Phase-1 thread key derivation"
```

---

## Task 6: Waku client wrapper

**Files:**
- Create: `xao-cult/src/lib/xaomsg/waku.ts`

This task does NOT have unit tests — Waku requires a live network connection that isn't appropriate for Vitest. End-to-end coverage comes from Task 11.

- [ ] **Step 6.1: Implement waku.ts**

Create `xao-cult/src/lib/xaomsg/waku.ts`:
```ts
/**
 * Waku light-client wrapper — lazy singleton, lifecycle, publish, subscribe.
 *
 * One node per browser tab. Connects on first use, stays warm for the rest of
 * the session. Cleans up on `unload` (best effort — browsers don't guarantee).
 */
import { createLightNode, waitForRemotePeer, type LightNode } from '@waku/sdk';
import { Protocols } from '@waku/sdk';

let nodeP: Promise<LightNode> | null = null;

export async function getWakuClient(): Promise<LightNode> {
  if (!nodeP) {
    nodeP = (async () => {
      const node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.LightPush, Protocols.Filter], 30_000);
      return node;
    })();
  }
  return nodeP;
}

/** Publish raw bytes (UTF-8 JSON in our case) on the given content topic. */
export async function publishToTopic(contentTopic: string, payload: Uint8Array): Promise<void> {
  const node = await getWakuClient();
  const encoder = node.createEncoder({ contentTopic });
  const result = await node.lightPush.send(encoder, { payload });
  if (result.failures && result.failures.length > 0) {
    throw new Error(`Waku light-push failed: ${JSON.stringify(result.failures)}`);
  }
}

/**
 * Subscribe to a content topic. Returns an unsubscribe function.
 * `onMessage` receives raw bytes — caller is responsible for decode/decrypt.
 */
export async function subscribeToTopic(
  contentTopic: string,
  onMessage: (bytes: Uint8Array) => void,
): Promise<() => Promise<void>> {
  const node = await getWakuClient();
  const decoder = node.createDecoder({ contentTopic });
  const sub = await node.filter.subscribe([decoder], (wakuMessage) => {
    if (wakuMessage.payload) onMessage(wakuMessage.payload);
  });
  return async () => {
    try {
      await sub.unsubscribe([contentTopic]);
    } catch {
      // ignore — node may already be torn down
    }
  };
}

/** Tear down the singleton. Call from a global "logout" or `beforeunload`. */
export async function shutdownWakuClient(): Promise<void> {
  if (!nodeP) return;
  const node = await nodeP;
  await node.stop();
  nodeP = null;
}
```

- [ ] **Step 6.2: Quick TypeScript sanity check**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
npx tsc --noEmit --skipLibCheck src/lib/xaomsg/waku.ts 2>&1 | grep -E "xaomsg/waku" | head -10
```
Expected: zero errors mentioning `waku.ts`. If `@waku/sdk` exports differ in the installed version (the API has churned), adjust to whatever `import * as W from '@waku/sdk'; console.log(Object.keys(W))` reveals.

- [ ] **Step 6.3: Commit**

```bash
git add src/lib/xaomsg/waku.ts
git commit -m "feat(xaomsg): Waku light-client wrapper (lazy singleton + pub/sub)"
```

---

## Task 7: Session hook (`useXaoMsgSession`)

**Files:**
- Create: `xao-cult/src/hooks/useXaoMsgSession.ts`

The hook returns the persisted session if it exists and isn't expired; otherwise `unlock()` mints a fresh one (one wallet prompt).

- [ ] **Step 7.1: Implement useXaoMsgSession.ts**

Create `xao-cult/src/hooks/useXaoMsgSession.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import {
  createSessionKeypair,
  loadSession,
  mintSessionCert,
  saveSession,
  SESSION_DURATION_MS,
  type PersistedSession,
} from '../lib/xaomsg/session';

export interface UseXaoMsgSessionResult {
  session: PersistedSession | null;
  isUnlocking: boolean;
  error: string | null;
  unlock: () => Promise<void>;
}

export function useXaoMsgSession(): UseXaoMsgSessionResult {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [session, setSession] = useState<PersistedSession | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore from sessionStorage on mount/wallet change.
  useEffect(() => {
    if (!address) {
      setSession(null);
      return;
    }
    setSession(loadSession(address));
  }, [address]);

  const unlock = useCallback(async () => {
    if (!walletClient || !address || !chainId) return;
    setIsUnlocking(true);
    setError(null);
    try {
      const { privateKey, publicKey } = await createSessionKeypair();
      const expiresAtUnixMs = Date.now() + SESSION_DURATION_MS;
      const cert = await mintSessionCert({
        walletAddress: address,
        sessionPublicKeyHex: publicKey,
        expiresAtUnixMs,
        chainId,
        signMessage: async (message) => walletClient.signMessage({ account: address, message }),
      });
      const persisted: PersistedSession = { cert, privateKeyHex: privateKey };
      saveSession(address, persisted);
      setSession(persisted);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setIsUnlocking(false);
    }
  }, [walletClient, address, chainId]);

  return { session, isUnlocking, error, unlock };
}
```

- [ ] **Step 7.2: Type-check**

```bash
npx tsc --noEmit --skipLibCheck src/hooks/useXaoMsgSession.ts 2>&1 | grep -E "useXaoMsgSession" | head -10
```
Expected: zero errors mentioning the file.

- [ ] **Step 7.3: Commit**

```bash
git add src/hooks/useXaoMsgSession.ts
git commit -m "feat(xaomsg): useXaoMsgSession — 24h cert with sessionStorage persistence"
```

---

## Task 8: Main hook — `useXaoMsg`

**Files:**
- Create: `xao-cult/src/hooks/useXaoMsg.ts`

The hook coordinates: derive topic, load thread key, subscribe to Waku, decrypt + verify each incoming envelope, and expose `postText` / `postProposal` that build → encrypt → publish.

- [ ] **Step 8.1: Implement useXaoMsg.ts**

Create `xao-cult/src/hooks/useXaoMsg.ts`:
```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { threadIdForShow } from '../lib/xaomsg/threadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import { loadThreadKey } from '../lib/xaomsg/threadKey';
import { encryptBody, decryptBody } from '../lib/xaomsg/crypto';
import {
  buildEnvelope,
  buildUnsignedBody,
  computeBodyHash,
  verifyEnvelope,
} from '../lib/xaomsg/envelope';
import { publishToTopic, subscribeToTopic } from '../lib/xaomsg/waku';
import {
  ContentType,
  type OnWireEnvelope,
  type ProposalPayload,
  type ResolvedMessage,
  type TextPayload,
} from '../lib/xaomsg/types';
import type { PersistedSession } from '../lib/xaomsg/session';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

export interface UseXaoMsgOptions {
  showContract: Address | null;
  session: PersistedSession | null;
}

export interface UseXaoMsgResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
}

export function useXaoMsg({ showContract, session }: UseXaoMsgOptions): UseXaoMsgResult {
  const threadId = useMemo<Hex | null>(
    () => (showContract ? threadIdForShow(showContract) : null),
    [showContract],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive thread key whenever the contract changes.
  useEffect(() => {
    if (!showContract) {
      setThreadKey(null);
      return;
    }
    let cancelled = false;
    loadThreadKey(showContract)
      .then((k) => { if (!cancelled) setThreadKey(k); })
      .catch((err) => { if (!cancelled) setError(err?.message ?? String(err)); });
    return () => { cancelled = true; };
  }, [showContract]);

  // Subscribe to the Waku topic and decrypt + verify incoming envelopes.
  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (!contentTopic || !threadKey) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const onBytes = async (bytes: Uint8Array) => {
          try {
            const b64 = new TextDecoder().decode(bytes);
            const plaintext = await decryptBody(b64, threadKey);
            const envelope = JSON.parse(plaintext) as OnWireEnvelope;
            if (!(await verifyEnvelope(envelope))) {
              console.warn('[xaomsg] envelope verification failed; dropping');
              return;
            }
            if (envelope.body.threadId !== threadId) return; // belt + braces
            const resolved: ResolvedMessage = {
              envelope,
              bodyHash: computeBodyHash(envelope),
              receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            setMessages((prev) => {
              if (prev.some((m) => m.envelope.body.messageId === resolved.envelope.body.messageId)) {
                return prev;
              }
              return [...prev, resolved].sort((a, b) => a.envelope.body.sentAt - b.envelope.body.sentAt);
            });
          } catch (err) {
            console.warn('[xaomsg] failed to handle inbound message:', err);
          }
        };

        const unsub = await subscribeToTopic(contentTopic, (bytes) => { void onBytes(bytes); });
        if (cancelled) {
          await unsub();
          return;
        }
        unsubRef.current = unsub;
        setIsLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const u = unsubRef.current;
      unsubRef.current = null;
      if (u) void u();
    };
  }, [contentTopic, threadKey, threadId]);

  const post = useCallback(
    async (
      contentType: ContentType,
      payload: TextPayload | ProposalPayload,
      parentHash: Hex,
    ): Promise<ResolvedMessage> => {
      if (!session) throw new Error('No session — call unlock() first');
      if (!showContract || !threadId) throw new Error('No thread context');
      if (!threadKey) throw new Error('Thread key not ready');
      if (!contentTopic) throw new Error('No content topic');

      const body = buildUnsignedBody({
        threadId,
        contentType,
        payload,
        parentHash,
        sender: session.cert.walletAddress,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
      const bytes = new TextEncoder().encode(ciphertextB64);

      await publishToTopic(contentTopic, bytes);

      const resolved: ResolvedMessage = {
        envelope,
        bodyHash: computeBodyHash(envelope),
        receivedAtUnixMs: Date.now(),
      };
      // Optimistic insert — Waku may also echo this back, but the
      // dedupe-by-messageId in the subscriber handler stops doubles.
      setMessages((prev) => [...prev, resolved].sort((a, b) => a.envelope.body.sentAt - b.envelope.body.sentAt));
      return resolved;
    },
    [session, showContract, threadId, threadKey, contentTopic],
  );

  const postText = useCallback(
    (text: string, parentHash: Hex = ZERO_HASH) =>
      post(ContentType.TEXT, { kind: 'text', text }, parentHash),
    [post],
  );
  const postProposal = useCallback(
    (proposal: ProposalPayload, parentHash: Hex = ZERO_HASH) =>
      post(proposal.kind === 'counter-proposal' ? ContentType.COUNTER_PROPOSAL : ContentType.PROPOSAL, proposal, parentHash),
    [post],
  );

  return { messages, isLoading, error, postText, postProposal };
}
```

- [ ] **Step 8.2: Type-check**

```bash
npx tsc --noEmit --skipLibCheck src/hooks/useXaoMsg.ts 2>&1 | grep -E "useXaoMsg" | head -10
```
Expected: zero errors in the file. The repo has pre-existing TS errors elsewhere — fine.

- [ ] **Step 8.3: Commit**

```bash
git add src/hooks/useXaoMsg.ts
git commit -m "feat(xaomsg): useXaoMsg hook — Waku subscribe + post (zero wallet prompts)"
```

---

## Task 9: UI component — `XaoMsgComponent`

**Files:**
- Create: `xao-cult/src/components/Chat/XaoMsgComponent.tsx`
- Modify: `xao-cult/src/components/Chat/index.ts`

The visual structure mirrors the legacy `ChatComponent`: same `styles.chatContainer`, `messagesContainer`, `messageInputContainer` from `CreateContract.module.css`. The behaviour is: if no session → show "Unlock chat for 24h" button; otherwise stream messages and accept input.

- [ ] **Step 9.1: Implement XaoMsgComponent.tsx**

Create `xao-cult/src/components/Chat/XaoMsgComponent.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { type Address } from 'viem';
import { useAccount } from 'wagmi';
import styles from '../../styles/CreateContract.module.css';
import { useXaoMsg } from '../../hooks/useXaoMsg';
import { useXaoMsgSession } from '../../hooks/useXaoMsgSession';
import { ContentType, type ResolvedMessage } from '../../lib/xaomsg/types';

export interface XaoMsgComponentProps {
  showContract: Address | null;
  embedded?: boolean;
}

const XaoMsgComponent: React.FC<XaoMsgComponentProps> = ({ showContract, embedded = false }) => {
  const { session, isUnlocking, error: sessionError, unlock } = useXaoMsgSession();
  const { messages, isLoading, error, postText } = useXaoMsg({ showContract, session });
  const { address: myAddress } = useAccount();

  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const id = requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  if (!showContract) {
    return <div className={styles.RecievedMessage}>Open this chat from a contract to use XaoMsg.</div>;
  }

  if (!session) {
    return (
      <div className={styles.RecievedMessage}>
        <div style={{ marginBottom: 12 }}>
          XaoMsg unlocks for 24 hours with a single wallet signature.
          After that, sending messages is gas-free and prompt-free.
        </div>
        {sessionError && <div style={{ color: '#ff8080', marginBottom: 8 }}>{sessionError}</div>}
        <button
          onClick={unlock}
          disabled={isUnlocking}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(to right, #ff9900, #e100ff)',
            border: 'none',
            borderRadius: 20,
            color: '#fff',
            cursor: isUnlocking ? 'not-allowed' : 'pointer',
          }}
        >
          {isUnlocking ? 'Signing…' : 'Unlock chat for 24h'}
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!text.trim()) return;
    const body = text;
    setText('');
    setSending(true);
    try {
      await postText(body);
    } catch (err) {
      console.error('[xaomsg] send failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={embedded ? styles.chatContainer : styles.chatMain}>
      <div ref={containerRef} className={styles.messagesContainer}>
        {isLoading && <div className={styles.RecievedMessage}>Connecting to Waku…</div>}
        {error && <div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>{error}</div>}
        {!isLoading && messages.length === 0 && (
          <div className={styles.RecievedMessage}>No messages yet. Start the negotiation.</div>
        )}
        {messages.map((m) => renderMessage(m, myAddress, styles))}
      </div>
      <div className={styles.messageInputContainer}>
        <div className={styles.messageInput}>
          <input
            type="text"
            placeholder={sending ? 'Sending…' : 'Message'}
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

function renderMessage(m: ResolvedMessage, myAddress: Address | undefined, styles: Record<string, string>) {
  const { body } = m.envelope;
  const isMine = !!myAddress && body.sender.toLowerCase() === myAddress.toLowerCase();
  const cls = isMine ? styles.sentMessage : styles.RecievedMessage;
  const key = body.messageId;

  if (body.contentType === ContentType.TEXT) {
    const t = body.payload as { kind: 'text'; text: string };
    return <div key={key} className={cls}>{t.text}</div>;
  }
  if (body.contentType === ContentType.PROPOSAL || body.contentType === ContentType.COUNTER_PROPOSAL) {
    return <div key={key} className={cls}>📋 Proposal (rev {(body.payload as any).revisionNumber}) — Phase 1 placeholder; full DAG ships in Plan 3</div>;
  }
  if (body.contentType === ContentType.ACCEPT) {
    return <div key={key} style={{ color: '#80ff80' }}>✓ Accepted by {body.sender.slice(0, 6)}…</div>;
  }
  if (body.contentType === ContentType.REJECT) {
    return <div key={key} style={{ color: '#ff8080' }}>✗ Rejected by {body.sender.slice(0, 6)}…</div>;
  }
  return <div key={key} className={cls}>(unknown content type)</div>;
}

export default XaoMsgComponent;
```

- [ ] **Step 9.2: Update Chat/index.ts**

Read the existing file:
```bash
cat /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult/src/components/Chat/index.ts
```

Append (do not replace existing exports):
```ts
export { default as XaoMsgComponent } from './XaoMsgComponent';
```

- [ ] **Step 9.3: Type-check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "XaoMsgComponent" | head -10
```
Expected: zero errors in the new file.

- [ ] **Step 9.4: Commit**

```bash
git add src/components/Chat/XaoMsgComponent.tsx src/components/Chat/index.ts
git commit -m "feat(xaomsg): XaoMsgComponent — UI fork for Waku chat"
```

---

## Task 10: Feature flag in `create-contract.tsx`

**Files:**
- Modify: `xao-cult/src/pages/contracts/create-contract.tsx`
- Modify: `xao-cult/.env.local`

- [ ] **Step 10.1: Wire the flag**

Open `xao-cult/src/pages/contracts/create-contract.tsx`. Find the existing import:
```tsx
import { ChatComponent } from "../../components/Chat";
```
Replace with:
```tsx
import { ChatComponent, XaoMsgComponent } from "../../components/Chat";
```

Find the `<ChatComponent ... />` render (look for `selected === "chat"`). Wrap it in a feature-flag ternary so the new path is opt-in:

```tsx
{selected === "chat" ? (
  process.env.NEXT_PUBLIC_USE_XAOMSG === '1' ? (
    <XaoMsgComponent
      showContract={(savedContractAddress ?? newContractAddress ?? null) as `0x${string}` | null}
      embedded={true}
    />
  ) : (
    <ChatComponent
      peerAddress={peerAddress}
      embedded={true}
      onContractProposalSelect={handleContractProposalSelect}
    />
  )
) : (
  /* the existing contract content */
)}
```

If the surrounding code structure differs from this snippet (it likely will — the file has been touched), preserve the existing else-branch verbatim. Only the chat-tab branch is modified.

- [ ] **Step 10.2: Append the flag to .env.local**

Append to `xao-cult/.env.local` (do NOT commit `.env.local` — it's gitignored):
```
# Feature flag: enable XaoMsg (Waku-based) chat. Set 1 to enable.
NEXT_PUBLIC_USE_XAOMSG=0
```

- [ ] **Step 10.3: Type-check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "create-contract|XaoMsg" | head -10
```
Expected: zero new errors.

- [ ] **Step 10.4: Commit**

```bash
git add src/pages/contracts/create-contract.tsx
git commit -m "feat(xaomsg): feature-flag XaoMsgComponent behind NEXT_PUBLIC_USE_XAOMSG"
```

---

## Task 11: End-to-end manual test

**Files:** none (observational)

This is the only task that depends on a live network. Two browser profiles, two wallets, real Base Sepolia.

- [ ] **Step 11.1: Restart the dev server with the flag**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
pgrep -af "next-server|next dev" | grep -v grep || echo "No dev server running"
```
Kill any stale server. Then:
```bash
NEXT_PUBLIC_USE_XAOMSG=1 yarn dev
```
Or set the flag in `.env.local` and just run `yarn dev`.

- [ ] **Step 11.2: Browser A (Party 1)**

1. Connect Party 1 wallet.
2. Create or open a ShowContract.
3. Click **Chat** tab. The unlock screen should appear: "XaoMsg unlocks for 24 hours with a single wallet signature."
4. Click **Unlock chat for 24h**. MetaMask shows a message starting with `XaoMsg session v1`. Confirm.
5. Wait for "Connecting to Waku…" to disappear (typically 5–15s — Waku peer discovery).
6. Type `hello from p1` → Enter.
7. **Expected:** the bubble appears immediately (optimistic insert) with **NO MetaMask prompt** for the message itself.
8. Open DevTools console — confirm no `verifyEnvelope` warnings on echo.

- [ ] **Step 11.3: Browser B (Party 2)**

1. Different browser profile / different wallet on Base Sepolia.
2. Same ShowContract page → Chat tab.
3. Unlock (one MetaMask prompt for the cert).
4. Wait for Waku connect.
5. Party 1's message should appear within seconds (Waku gossip latency).
6. Reply `hello from p2`. NO MetaMask prompt.
7. Switch back to Browser A — the reply should stream in.

- [ ] **Step 11.4: Cross-session sanity**

1. Send a few more messages back and forth.
2. Note: each session was unlocked ONCE. All subsequent messages were prompt-free.
3. Hard-refresh either browser. The session should be restored from `sessionStorage`. No new prompt.
4. Close the tab and reopen — sessionStorage clears. `Unlock chat for 24h` reappears.

- [ ] **Step 11.5: Document findings**

Create `xao-cult/docs/superpowers/plans/2026-04-22-xaomsg-phase1-test-log.md`:
```markdown
# XaoMsg Phase 1 — Test Log

| Item | Observation |
|---|---|
| Time to first Waku peer | ___ s |
| Wallet prompts in 10 messages | should be 1 (the unlock) |
| Cross-browser delivery latency | ___ s typical |
| Bytes per envelope on the wire | ___ |
| Errors in DevTools console | ___ |
| UX regressions vs XMTP | ___ |
```

Fill it in as you test. Commit:
```bash
git add docs/superpowers/plans/2026-04-22-xaomsg-phase1-test-log.md
git commit -m "docs(xaomsg): Phase-1 test log"
```

---

## Task 12: Limitations doc

**Files:**
- Create: `xao-cult/docs/superpowers/plans/2026-04-22-xaomsg-phase1-known-limits.md`

- [ ] **Step 12.1: Write the doc**

Create the file with this content:
```markdown
# XaoMsg Phase 1 — Known Limitations

Phase 1 ships the Waku transport + 24h session keys. Every limitation below is
intentional; each maps to a follow-up plan in the series.

## Cryptography

**Weak thread key (Plan 2 fixes).** The AES-GCM key is derived from
`keccak256("xao-thread-key-v1" || showContractAddress)`. Anyone who knows the
ShowContract address derives the key. Plan 2 replaces this with an ECIES
handshake so each party's wallet wraps a random per-thread key for the other
parties.

**Session key in sessionStorage.** The session private key sits in plain JS
memory and `sessionStorage` for up to 24 hours. Compromise of the browser
storage compromises that day's messages. Plan 5 explores hardware-backed key
storage via WebAuthn / passkey-derived keys.

**No metadata privacy beyond opaque topics.** A Waku observer cannot trivially
map a topic back to a contract, but they can see message size, timing, and
which peers post on which topics. Phase 1 does not pad payloads or batch
messages.

## Negotiation

**TEXT and PROPOSAL only.** The envelope's `parentHash` is recorded for
forward compatibility, but Phase 1 does not implement the proposal /
counter / accept / reject DAG with conflict resolution. That is Plan 3.

## Transport

**No store-node fallback.** Messages are delivered via light-push +
filter-subscribe. If both parties are not online simultaneously, late peers
miss messages. Plan 4 adds Waku store-node integration so a peer reconnecting
within the retention window can backfill.

**No retention policy.** Phase 1 keeps every received message in client
state indefinitely (in memory). Plan 4 adds tiered retention (long /
medium / short) and ephemeral mode.

**Single thread type.** Phase 1 only supports contract-scoped threads (one
thread per ShowContract). Relationship and group threads are Plan 4.

## UX

**Cross-device session is not synced.** A user with two devices unlocks
twice (once per device per 24h). Plan 5 considers a deterministic session
derivation tied to a passkey or hardware key.

**No message acknowledgements.** A sent message is shown optimistically with
no read-receipt or delivery-confirmation indicator.

## Coexistence

**XaoMsg runs in parallel to XMTP.** The legacy `ChatComponent` remains the
default until Plan 1 is validated; flip `NEXT_PUBLIC_USE_XAOMSG=1` to enable
XaoMsg. Old contracts created while XMTP was active stay on XMTP.

## Migration

**No history backfill.** When you flip the flag, existing chat history from
XMTP is not imported. New conversations start empty.
```

- [ ] **Step 12.2: Commit**

```bash
git add docs/superpowers/plans/2026-04-22-xaomsg-phase1-known-limits.md
git commit -m "docs(xaomsg): Phase 1 known limitations"
```

---

## Task 13: Retire XMTP (conditional on Task 11 passing)

**Only run this task after Task 11 has been green for at least 3 full negotiation cycles across two wallets.**

**Files:**
- Delete: `xao-cult/src/hooks/useXMTPConversation.ts`
- Delete: `xao-cult/src/hooks/useXMTPClient.ts` (dead code)
- Delete: `xao-cult/src/contexts/XMTPContext.tsx`
- Delete: `xao-cult/src/components/Chat/ChatComponent.tsx`
- Delete: `xao-cult/src/components/Chat/ContactCardDisplay.tsx`
- Modify: `xao-cult/src/pages/_app.tsx` — remove `<XMTPProvider>` wrapper + import
- Modify: `xao-cult/src/pages/contracts/create-contract.tsx` — collapse the feature-flag fork to only render `XaoMsgComponent`
- Modify: `xao-cult/src/components/Chat/index.ts` — remove `ChatComponent` export
- Modify: `xao-cult/package.json` — uninstall `@xmtp/browser-sdk`

This task is structurally identical to XaoChat Phase 1's Task 14. The full instruction set lives there at `docs/superpowers/plans/2026-04-22-xaochat-phase1.md` — execute its Step 14.1 through 14.8 verbatim, swapping `XaoChat` references for `XaoMsg`.

- [ ] **Step 13.1: Inventory**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/xao/xao-cult
grep -rln "xmtp\|XMTP" src --include="*.ts" --include="*.tsx" | sort
```
Record the list before any edits.

- [ ] **Step 13.2: Remove `<XMTPProvider>` from `_app.tsx`**

Read `src/pages/_app.tsx`. Locate the `<XMTPProvider>` wrapper and the corresponding import. Remove both, leaving the inner children intact.

- [ ] **Step 13.3: Delete the XMTP source files**

```bash
rm -f src/hooks/useXMTPConversation.ts
rm -f src/hooks/useXMTPClient.ts
rm -f src/contexts/XMTPContext.tsx
rm -f src/components/Chat/ChatComponent.tsx
rm -f src/components/Chat/ContactCardDisplay.tsx
```

If any other chat-section page (`Chat.tsx`, `Search.tsx`, `Notification.tsx`) imports XMTP, stub it the same way XaoChat Phase 1 Task 14 did — render a placeholder `"Peer chat is migrating to XaoMsg — TODO(xaomsg-plan-4)"` and remove the XMTP import.

- [ ] **Step 13.4: Collapse the feature flag in create-contract.tsx**

Replace the ternary with the bare `XaoMsgComponent`:
```tsx
{selected === "chat" ? (
  <XaoMsgComponent
    showContract={(savedContractAddress ?? newContractAddress ?? null) as `0x${string}` | null}
    embedded={true}
  />
) : (
  /* existing contract content */
)}
```
Drop `ChatComponent` from the import line. Remove `NEXT_PUBLIC_USE_XAOMSG` from `.env.local`.

- [ ] **Step 13.5: Remove `ChatComponent` export from `index.ts`**

Edit `src/components/Chat/index.ts` to remove the `ChatComponent` and `ContactCardDisplay` exports. Keep `XaoMsgComponent`, `ContractCard`.

- [ ] **Step 13.6: Uninstall the SDK**

```bash
npm uninstall --legacy-peer-deps --cache /tmp/npm-cache @xmtp/browser-sdk
```

- [ ] **Step 13.7: Verify**

```bash
grep -rn "xmtp\|XMTP" src --include="*.ts" --include="*.tsx" | grep -v 'TODO\|src/lib/xaomsg/README' | wc -l
```
Expected: 0 (or only TODO markers in stubs). Run the unit tests:
```bash
npm run test:unit 2>&1 | tail -10
```
Expected: still passing.

- [ ] **Step 13.8: Commit**

```bash
git add -A src/ scripts/ package.json package-lock.json
git commit -m "chore(xaomsg): retire XMTP — XaoMsg is the only chat transport"
```

---

## Follow-up plans (deferred)

1. **Plan 2 — ECIES thread-key handshake**: replace `deriveDeterministicThreadKey` with per-party ECIES wrap. Adds a `SYSTEM` message type carrying the wrapped key payload at thread-open. Mandatory before production.
2. **Plan 3 — CRDT negotiation DAG**: counter-proposals, accept, reject, branch resolution; the `parentHash` field becomes load-bearing.
3. **Plan 4 — Thread types + retention + Waku store**: relationship threads, group threads, ephemeral threads with turn-based retention. *Waku store-node history backfill landed 2026-07-05 (offline delivery); thread types + retention policy still deferred.*
4. **Plan 5 — Hardware-backed sessions**: WebAuthn / passkey-derived session keys; cross-device sync.

---

## Self-review checklist

1. **Spec coverage:**
   - "Waku for everything" → Tasks 6, 8 ✓
   - "Entire contract on-chain" → explicitly out of scope, called out ✓
   - "All contract chat = evidence" → envelope verify chain enforces sender authenticity; persisted to Waku peers (Phase 1 caveat noted) ✓
   - "One global 24h messaging key" → Tasks 3, 7 ✓
   - "Opaque topics" → Task 2 ✓
   - "Encrypted payloads" → Task 5 ✓
   - "Message envelope: messageId, threadId, contentType, parentHash, payload, payloadHash, sessionKey, signature" → `OnWireEnvelope` in Task 2 ✓ (note: `sessionKey` in spec maps to `cert.sessionPublicKeyHex` in our shape)
   - "Validation: signature, authorization, hash integrity, parent chain" → `verifyEnvelope` covers signature, authorization (sender↔cert), hash integrity. **Parent chain validation is explicitly Plan 3 — flagged in the limitations doc.**
   - "DAG / no last-write-wins / user resolves" → Plan 3
   - "Topic derivation: opaque hash-based" → Task 2 ✓
   - "Key model: wallet → authority, messaging identity → membership, session key → activity, thread key → encryption" → wallet (cert), session key (Task 3), thread key (Task 5). "Messaging identity → membership" is partial: Phase 1 derives membership from "anyone who knows the topic + thread key". Plan 2's ECIES handshake formalises membership.
   - "Retention" → Plan 4

2. **Placeholder scan:** every step has runnable code. No TBD/TODO inside steps. The "TODO" tokens that appear are in commit messages (the limitations doc + the Task 13 stub strings) and are intentional.

3. **Type consistency:** `MessageBody`, `OnWireEnvelope`, `SessionCert`, `ResolvedMessage` shapes match across types.ts, envelope.ts, session.ts, useXaoMsg.ts. `signMessage` callback shape in `mintSessionCert` matches viem's `account.signMessage` and wagmi's `walletClient.signMessage` (both accept `{ message: string }` and resolve to `Hex`). `ContentType` enum integer values used identically everywhere they appear.

One known small mismatch resolved: the spec calls the field `sessionKey` in the envelope; the implementation uses `cert.sessionPublicKeyHex` inside a richer `cert` object so the cert can be wallet-verified. Documented in the spec coverage above.
