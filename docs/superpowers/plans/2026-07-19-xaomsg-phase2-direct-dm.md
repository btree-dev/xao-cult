# XaoMsg Phase 2 — Plan 1: Waku Direct-DM Transport + Working Cold-DM Chat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user cold-message any other user by wallet address over Waku, end-to-end encrypted, with the conversation appearing in the Search page — no contract required.

**Architecture:** A DM lives on a pair topic derived from the sorted address pair (`dmThreadId(a,b)` → existing `contentTopicForThread`). A per-user **inbox topic** (derivable from the address alone) publishes the user's public key bundle (their `SessionCert`) and carries ECIES-encrypted **DM notices** that deliver the per-conversation AES key and let the recipient discover the thread. Messages reuse the existing envelope/sign/verify/AES-GCM pipeline; only the threadId source and the key source are new. The receive/decrypt/verify/merge pipeline in `useXaoMsg` is extracted into a shared `useXaoThread` so contract chat and DMs share one code path.

**Tech Stack:** Next.js 15 + wagmi + viem; `@waku/sdk` (existing); `@noble/secp256k1` (ECDH) + `@noble/hashes` (HKDF-SHA256); Web Crypto AES-GCM; Vitest.

## Global Constraints

- **Full E2E encryption; never downgrade.** If a cold recipient has no published key bundle, **block the send** with a clear message — do not fall back to a weaker key.
- **secp256k1 via `@noble/secp256k1`** (Web Crypto SubtleCrypto has no secp256k1). HKDF via `@noble/hashes/hkdf` + `@noble/hashes/sha256`.
- **Waku layers are generic and unchanged** — `contentTopicForThread(threadId: Hex): string`, `publishToTopic`, `subscribeToTopic`, `queryHistory` are reused as-is.
- **All addresses lowercased** before hashing/keying/storing.
- **localStorage keys** (new): `xao-cult-dm-convkeys`, `xao-cult-dm-conversations`.
- **Domain-separation strings** (locked; changing them breaks interop): `xao-dm-thread-v1`, `xao-inbox-topic-v1`, `xao-dm-kek-v1`, salt `xao-dm-v1`.
- **Tests:** `yarn test:unit` (Vitest, happy-dom env) — already configured in Phase 1.

---

## File Structure

**New (`src/lib/xaomsg/`):**
- `dmThreadId.ts` — canonical pair threadId.
- `inboxTopic.ts` — per-user inbox content topic.
- `ecies.ts` — `wrapBytes` / `unwrapBytes` (ECDH → HKDF → AES-GCM over arbitrary bytes).
- `conversationKey.ts` — generate / cache / load per-conversation AES key (localStorage).
- `conversationStore.ts` — localStorage conversation index + merge.
- `inbox.ts` — key-bundle + DM-notice message types, publish/query/subscribe.

**New (`src/hooks/`):**
- `useXaoThread.ts` — shared subscribe→decrypt→verify→merge→post pipeline.
- `useXaoDm.ts` — DM hook (derive threadId, negotiate/load conversation key, delegate to `useXaoThread`).
- `useXaoInbox.ts` — subscribe to own inbox, capture notices, expose conversation list; publish own key bundle.

**Modified:**
- `src/hooks/useXaoMsg.ts` — refactor to delegate to `useXaoThread`.
- `src/components/Chat/XaoMsgComponent.tsx` — accept a `peer` prop (DM mode) alongside `showContract`.
- `src/pages/chat-Section/Chat.tsx` — render DM via `XaoMsgComponent` peer mode.
- `src/pages/chat-Section/Search.tsx` — conversation list from `useXaoInbox` (replacing the XMTP loader) while keeping the existing address-paste "Start new conversation" card.

---

## Task 1: Canonical pair threadId

**Files:**
- Create: `src/lib/xaomsg/dmThreadId.ts`
- Test: `src/lib/xaomsg/dmThreadId.test.ts`

**Interfaces:**
- Produces: `dmThreadId(a: Address, b: Address): Hex` — order-independent, case-insensitive.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/xaomsg/dmThreadId.test.ts
import { describe, it, expect } from 'vitest';
import { dmThreadId } from './dmThreadId';

const A = '0x1111111111111111111111111111111111111111' as const;
const B = '0x2222222222222222222222222222222222222222' as const;

describe('dmThreadId', () => {
  it('is identical regardless of argument order', () => {
    expect(dmThreadId(A, B)).toBe(dmThreadId(B, A));
  });
  it('is case-insensitive', () => {
    expect(dmThreadId(A.toUpperCase() as any, B)).toBe(dmThreadId(A, B));
  });
  it('differs for a different pair', () => {
    const C = '0x3333333333333333333333333333333333333333' as const;
    expect(dmThreadId(A, B)).not.toBe(dmThreadId(A, C));
  });
  it('returns a 0x-prefixed 32-byte hex', () => {
    expect(dmThreadId(A, B)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/lib/xaomsg/dmThreadId.test.ts`
Expected: FAIL — "Failed to resolve import './dmThreadId'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/xaomsg/dmThreadId.ts
import { type Address, type Hex, concat, keccak256, toBytes, isAddress } from 'viem';

export const DM_THREAD_DOMAIN = 'xao-dm-thread-v1';

/** Canonical thread id for a 1:1 DM. Sorts the two lowercased addresses so
 *  both parties derive the same id regardless of who initiates. */
export function dmThreadId(a: Address, b: Address): Hex {
  if (!isAddress(a, { strict: false }) || !isAddress(b, { strict: false })) {
    throw new Error(`dmThreadId: invalid address(es): ${a}, ${b}`);
  }
  const lo = a.toLowerCase();
  const hi = b.toLowerCase();
  const [first, second] = lo < hi ? [lo, hi] : [hi, lo];
  return keccak256(concat([toBytes(DM_THREAD_DOMAIN), toBytes(first as Address), toBytes(second as Address)]));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/lib/xaomsg/dmThreadId.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/dmThreadId.ts src/lib/xaomsg/dmThreadId.test.ts
git commit -m "feat(xaomsg): canonical pair threadId for direct DMs"
```

---

## Task 2: Per-user inbox topic

**Files:**
- Create: `src/lib/xaomsg/inboxTopic.ts`
- Test: `src/lib/xaomsg/inboxTopic.test.ts`

**Interfaces:**
- Produces: `inboxTopicForAddress(addr: Address): string` — Waku content topic `/xao/1/<hex>/json`, derivable from the address alone, case-insensitive.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/xaomsg/inboxTopic.test.ts
import { describe, it, expect } from 'vitest';
import { inboxTopicForAddress } from './inboxTopic';

const A = '0x1111111111111111111111111111111111111111' as const;

describe('inboxTopicForAddress', () => {
  it('is stable and case-insensitive', () => {
    expect(inboxTopicForAddress(A)).toBe(inboxTopicForAddress(A.toUpperCase() as any));
  });
  it('matches the Waku content-topic format', () => {
    expect(inboxTopicForAddress(A)).toMatch(/^\/xao\/1\/[0-9a-f]{64}\/json$/);
  });
  it('differs per address', () => {
    const B = '0x2222222222222222222222222222222222222222' as const;
    expect(inboxTopicForAddress(A)).not.toBe(inboxTopicForAddress(B));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/lib/xaomsg/inboxTopic.test.ts`
Expected: FAIL — cannot resolve `./inboxTopic`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/xaomsg/inboxTopic.ts
import { type Address, concat, keccak256, toBytes } from 'viem';

export const INBOX_TOPIC_DOMAIN = 'xao-inbox-topic-v1';

/** Deterministic Waku content topic for a user's inbox. Intentionally derivable
 *  from the address alone so a cold sender can find it. Notices posted here are
 *  ECIES-encrypted to the owner (see inbox.ts); the key bundle posted here is public. */
export function inboxTopicForAddress(addr: Address): string {
  const opaque = keccak256(concat([toBytes(INBOX_TOPIC_DOMAIN), toBytes(addr.toLowerCase() as Address)]));
  return `/xao/1/${opaque.slice(2)}/json`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/lib/xaomsg/inboxTopic.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/inboxTopic.ts src/lib/xaomsg/inboxTopic.test.ts
git commit -m "feat(xaomsg): per-user inbox content topic"
```

---

## Task 3: ECIES wrap/unwrap over arbitrary bytes

**Files:**
- Create: `src/lib/xaomsg/ecies.ts`
- Test: `src/lib/xaomsg/ecies.test.ts`

**Interfaces:**
- Produces:
  - `wrapBytes(plaintext: Uint8Array, theirSessionPubHex: string, mySessionPrivHex: string): Promise<string>` — base64.
  - `unwrapBytes(wrappedB64: string, theirSessionPubHex: string, mySessionPrivHex: string): Promise<Uint8Array>`.
- Note: symmetric — `wrapBytes(x, peerPub, myPriv)` is decryptable by the peer via `unwrapBytes(x, myPub, peerPriv)` because ECDH shared secret is symmetric.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/xaomsg/ecies.test.ts
import { describe, it, expect } from 'vitest';
import * as secp from '@noble/secp256k1';
import { wrapBytes, unwrapBytes } from './ecies';

function keypair() {
  const priv = secp.utils.randomPrivateKey();
  const pub = secp.getPublicKey(priv, true);
  const hex = (b: Uint8Array) => '0x' + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  return { privHex: hex(priv), pubHex: hex(pub) };
}

describe('ecies wrap/unwrap', () => {
  it('round-trips between two parties (sender wraps, recipient unwraps)', async () => {
    const alice = keypair();
    const bob = keypair();
    const secret = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Bob wraps a secret for Alice using Bob's priv + Alice's pub
    const blob = await wrapBytes(secret, alice.pubHex, bob.privHex);
    // Alice unwraps using Alice's priv + Bob's pub
    const out = await unwrapBytes(blob, bob.pubHex, alice.privHex);
    expect(Array.from(out)).toEqual(Array.from(secret));
  });

  it('fails to unwrap with the wrong key', async () => {
    const alice = keypair();
    const bob = keypair();
    const mallory = keypair();
    const blob = await wrapBytes(new Uint8Array([9, 9, 9]), alice.pubHex, bob.privHex);
    await expect(unwrapBytes(blob, bob.pubHex, mallory.privHex)).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/lib/xaomsg/ecies.test.ts`
Expected: FAIL — cannot resolve `./ecies`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
  const raw = hkdf(sha256, ikm, KEK_SALT, KEK_INFO, 32);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function wrapBytes(
  plaintext: Uint8Array,
  theirSessionPubHex: string,
  mySessionPrivHex: string,
): Promise<string> {
  const kek = await deriveKek(mySessionPrivHex, theirSessionPubHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, plaintext));
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/lib/xaomsg/ecies.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/ecies.ts src/lib/xaomsg/ecies.test.ts
git commit -m "feat(xaomsg): ECIES wrap/unwrap (ECDH + HKDF + AES-GCM)"
```

---

## Task 4: Per-conversation key cache

**Files:**
- Create: `src/lib/xaomsg/conversationKey.ts`
- Test: `src/lib/xaomsg/conversationKey.test.ts`

**Interfaces:**
- Produces:
  - `generateRawConversationKey(): Uint8Array` (32 bytes).
  - `saveConversationKeyRaw(threadId: Hex, raw: Uint8Array): void`.
  - `loadConversationKeyRaw(threadId: Hex): Uint8Array | null`.
  - `importAesKey(raw: Uint8Array): Promise<CryptoKey>` (AES-GCM, extractable).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/xaomsg/conversationKey.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRawConversationKey,
  saveConversationKeyRaw,
  loadConversationKeyRaw,
  importAesKey,
} from './conversationKey';

const TID = ('0x' + 'ab'.repeat(32)) as `0x${string}`;

describe('conversationKey cache', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is cached', () => {
    expect(loadConversationKeyRaw(TID)).toBeNull();
  });

  it('round-trips a saved key', () => {
    const raw = generateRawConversationKey();
    expect(raw.length).toBe(32);
    saveConversationKeyRaw(TID, raw);
    const loaded = loadConversationKeyRaw(TID);
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!)).toEqual(Array.from(raw));
  });

  it('imports a usable AES-GCM key', async () => {
    const raw = generateRawConversationKey();
    const key = await importAesKey(raw);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('hi'));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    expect(new TextDecoder().decode(pt)).toBe('hi');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/lib/xaomsg/conversationKey.test.ts`
Expected: FAIL — cannot resolve `./conversationKey`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/xaomsg/conversationKey.ts
import type { Hex } from 'viem';

const LS_KEY = 'xao-cult-dm-convkeys';

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
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/lib/xaomsg/conversationKey.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/conversationKey.ts src/lib/xaomsg/conversationKey.test.ts
git commit -m "feat(xaomsg): per-conversation AES key cache"
```

---

## Task 5: Conversation index store

**Files:**
- Create: `src/lib/xaomsg/conversationStore.ts`
- Test: `src/lib/xaomsg/conversationStore.test.ts`

**Interfaces:**
- Produces:
  - `interface ConversationRecord { threadId: Hex; peer: Address; lastActivityUnixMs: number; lastPreview?: string; }`
  - `loadConversations(owner: Address): ConversationRecord[]`
  - `upsertConversation(owner: Address, rec: ConversationRecord): ConversationRecord[]` (persists, returns new list)
  - `mergeConversations(a: ConversationRecord[], b: ConversationRecord[]): ConversationRecord[]` (dedupe by threadId, newest `lastActivityUnixMs` wins, sorted desc)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/xaomsg/conversationStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConversations, upsertConversation, mergeConversations, type ConversationRecord } from './conversationStore';

const OWNER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const T1 = ('0x' + '11'.repeat(32)) as `0x${string}`;
const T2 = ('0x' + '22'.repeat(32)) as `0x${string}`;
const rec = (t: `0x${string}`, ts: number, preview?: string): ConversationRecord =>
  ({ threadId: t, peer: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', lastActivityUnixMs: ts, lastPreview: preview });

describe('conversationStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(loadConversations(OWNER)).toEqual([]);
  });

  it('upserts and persists, newest first', () => {
    upsertConversation(OWNER, rec(T1, 100));
    const list = upsertConversation(OWNER, rec(T2, 200));
    expect(list.map((r) => r.threadId)).toEqual([T2, T1]);
    expect(loadConversations(OWNER).map((r) => r.threadId)).toEqual([T2, T1]);
  });

  it('upsert on same threadId keeps the newer activity', () => {
    upsertConversation(OWNER, rec(T1, 100, 'old'));
    const list = upsertConversation(OWNER, rec(T1, 300, 'new'));
    expect(list.length).toBe(1);
    expect(list[0].lastPreview).toBe('new');
    expect(list[0].lastActivityUnixMs).toBe(300);
  });

  it('mergeConversations dedupes by threadId, newest wins', () => {
    const merged = mergeConversations([rec(T1, 100, 'a')], [rec(T1, 50, 'b'), rec(T2, 300)]);
    expect(merged.map((r) => r.threadId)).toEqual([T2, T1]);
    expect(merged.find((r) => r.threadId === T1)!.lastPreview).toBe('a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/lib/xaomsg/conversationStore.test.ts`
Expected: FAIL — cannot resolve `./conversationStore`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/xaomsg/conversationStore.ts
import type { Address, Hex } from 'viem';

const LS_KEY = 'xao-cult-dm-conversations';

export interface ConversationRecord {
  threadId: Hex;
  peer: Address;
  lastActivityUnixMs: number;
  lastPreview?: string;
}

type Store = Record<string, ConversationRecord[]>; // owner(lowercased) -> records

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Store; }
  catch { return {}; }
}
function writeStore(s: Store): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function sortDesc(list: ConversationRecord[]): ConversationRecord[] {
  return [...list].sort((a, b) => b.lastActivityUnixMs - a.lastActivityUnixMs);
}

export function loadConversations(owner: Address): ConversationRecord[] {
  return sortDesc(readStore()[owner.toLowerCase()] || []);
}

export function mergeConversations(a: ConversationRecord[], b: ConversationRecord[]): ConversationRecord[] {
  const byThread = new Map<string, ConversationRecord>();
  for (const r of [...a, ...b]) {
    const k = r.threadId.toLowerCase();
    const existing = byThread.get(k);
    if (!existing || r.lastActivityUnixMs > existing.lastActivityUnixMs) byThread.set(k, r);
  }
  return sortDesc(Array.from(byThread.values()));
}

export function upsertConversation(owner: Address, rec: ConversationRecord): ConversationRecord[] {
  const store = readStore();
  const key = owner.toLowerCase();
  const merged = mergeConversations(store[key] || [], [rec]);
  store[key] = merged;
  writeStore(store);
  return merged;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/lib/xaomsg/conversationStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/conversationStore.ts src/lib/xaomsg/conversationStore.test.ts
git commit -m "feat(xaomsg): localStorage conversation index + merge"
```

---

## Task 6: Inbox messages — types, encode/decode, publish/query/subscribe

**Files:**
- Create: `src/lib/xaomsg/inbox.ts`
- Test: `src/lib/xaomsg/inbox.test.ts`

**Interfaces:**
- Consumes: `wrapBytes`/`unwrapBytes` (Task 3), `inboxTopicForAddress` (Task 2), `publishToTopic`/`subscribeToTopic`/`queryHistory` (`waku.ts`), `verifySessionCert`/`isExpired` (`session.ts`), `SessionCert` (`types.ts`).
- Produces:
  - `interface DmNotice { from: Address; threadId: Hex; convKeyB64: string; preview?: string; ts: number; }`
  - `encodeKeyBundle(cert: SessionCert): Uint8Array` / `tryDecodeKeyBundle(bytes: Uint8Array): SessionCert | null`
  - `encodeDmNotice(notice, ownerSessionPubHex, mySessionPrivHex, mySessionPubHex): Promise<Uint8Array>`
  - `tryDecodeDmNotice(bytes: Uint8Array, mySessionPrivHex: string): Promise<DmNotice | null>`
- Note: on-wire inbox JSON is `{ t: 'kb', cert }` (public) or `{ t: 'dm', spk: <senderSessionPubHex>, enc: <base64> }` (notice ECIES-encrypted to owner). `tryDecode*` return null for the other type or on any parse/decrypt failure, so one subscription can host both.

- [ ] **Step 1: Write the failing test** (pure encode/decode — no live Waku)

```ts
// src/lib/xaomsg/inbox.test.ts
import { describe, it, expect } from 'vitest';
import * as secp from '@noble/secp256k1';
import { encodeKeyBundle, tryDecodeKeyBundle, encodeDmNotice, tryDecodeDmNotice, type DmNotice } from './inbox';
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
  expiresAtUnixMs: Date.now() + 100000,
  chainId: 84532,
  walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
};

describe('inbox key bundle', () => {
  it('round-trips a key bundle', () => {
    const out = tryDecodeKeyBundle(encodeKeyBundle(cert));
    expect(out?.sessionPublicKeyHex).toBe(cert.sessionPublicKeyHex);
  });
  it('returns null for a dm message', async () => {
    const owner = keypair();
    const sender = keypair();
    const notice: DmNotice = { from: '0x2222222222222222222222222222222222222222', threadId: ('0x' + '33'.repeat(32)) as any, convKeyB64: 'AAAA', ts: 1 };
    const bytes = await encodeDmNotice(notice, owner.pubHex, sender.privHex, sender.pubHex);
    expect(tryDecodeKeyBundle(bytes)).toBeNull();
  });
});

describe('inbox dm notice', () => {
  it('round-trips an encrypted notice to the owner', async () => {
    const owner = keypair();
    const sender = keypair();
    const notice: DmNotice = { from: '0x2222222222222222222222222222222222222222', threadId: ('0x' + '33'.repeat(32)) as any, convKeyB64: 'S0VZBYTES', preview: 'hi', ts: 42 };
    const bytes = await encodeDmNotice(notice, owner.pubHex, sender.privHex, sender.pubHex);
    const out = await tryDecodeDmNotice(bytes, owner.privHex);
    expect(out).toEqual(notice);
  });
  it('returns null when decrypted by the wrong owner', async () => {
    const owner = keypair();
    const sender = keypair();
    const mallory = keypair();
    const notice: DmNotice = { from: '0x2222222222222222222222222222222222222222', threadId: ('0x' + '33'.repeat(32)) as any, convKeyB64: 'x', ts: 1 };
    const bytes = await encodeDmNotice(notice, owner.pubHex, sender.privHex, sender.pubHex);
    expect(await tryDecodeDmNotice(bytes, mallory.privHex)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/lib/xaomsg/inbox.test.ts`
Expected: FAIL — cannot resolve `./inbox`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/xaomsg/inbox.ts
import type { Address, Hex } from 'viem';
import type { SessionCert } from './types';
import { inboxTopicForAddress } from './inboxTopic';
import { wrapBytes, unwrapBytes } from './ecies';
import { publishToTopic, subscribeToTopic, queryHistory } from './waku';
import { verifySessionCert, isExpired } from './session';

export interface DmNotice {
  from: Address;
  threadId: Hex;
  convKeyB64: string; // base64 of the raw 32-byte conversation key
  preview?: string;
  ts: number;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---- Key bundle (public) ----
export function encodeKeyBundle(cert: SessionCert): Uint8Array {
  return enc.encode(JSON.stringify({ t: 'kb', cert }));
}
export function tryDecodeKeyBundle(bytes: Uint8Array): SessionCert | null {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'kb' || !o.cert) return null;
    return o.cert as SessionCert;
  } catch { return null; }
}

// ---- DM notice (ECIES-encrypted to owner) ----
export async function encodeDmNotice(
  notice: DmNotice,
  ownerSessionPubHex: string,
  mySessionPrivHex: string,
  mySessionPubHex: string,
): Promise<Uint8Array> {
  const encBlob = await wrapBytes(enc.encode(JSON.stringify(notice)), ownerSessionPubHex, mySessionPrivHex);
  return enc.encode(JSON.stringify({ t: 'dm', spk: mySessionPubHex, enc: encBlob }));
}
export async function tryDecodeDmNotice(bytes: Uint8Array, mySessionPrivHex: string): Promise<DmNotice | null> {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'dm' || !o.spk || !o.enc) return null;
    const plain = await unwrapBytes(o.enc, o.spk, mySessionPrivHex);
    return JSON.parse(dec.decode(plain)) as DmNotice;
  } catch { return null; }
}

// ---- Waku wiring ----
export async function publishKeyBundle(cert: SessionCert): Promise<void> {
  await publishToTopic(inboxTopicForAddress(cert.walletAddress), encodeKeyBundle(cert));
}

export async function publishDmNotice(ownerAddress: Address, noticeBytes: Uint8Array): Promise<void> {
  await publishToTopic(inboxTopicForAddress(ownerAddress), noticeBytes);
}

/** Fetch the peer's most recent valid, unexpired key bundle (their session pubkey).
 *  Returns null if the peer has never published one (→ caller blocks the cold DM). */
export async function queryPeerKeyBundle(peer: Address): Promise<SessionCert | null> {
  let best: SessionCert | null = null;
  await queryHistory(inboxTopicForAddress(peer), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (!cert) return;
    if (isExpired(cert)) return;
    if (!best || cert.expiresAtUnixMs > best.expiresAtUnixMs) best = cert;
  });
  if (best && (await verifySessionCert(best))) return best;
  return null;
}

/** Subscribe to my inbox. Returns an unsubscribe fn. Routes each message to the
 *  right callback; ignores anything that isn't a valid bundle or a notice I can read. */
export async function subscribeInbox(
  myAddress: Address,
  mySessionPrivHex: string,
  onKeyBundle: (cert: SessionCert) => void,
  onDmNotice: (notice: DmNotice) => void,
): Promise<() => Promise<void>> {
  return subscribeToTopic(inboxTopicForAddress(myAddress), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (cert) { onKeyBundle(cert); return; }
    void tryDecodeDmNotice(bytes, mySessionPrivHex).then((n) => { if (n) onDmNotice(n); });
  });
}

/** Replay inbox store history to recover DM notices (conversation index). */
export async function queryInboxNotices(
  myAddress: Address,
  mySessionPrivHex: string,
  onDmNotice: (notice: DmNotice) => void,
): Promise<void> {
  await queryHistory(inboxTopicForAddress(myAddress), (bytes) => {
    void tryDecodeDmNotice(bytes, mySessionPrivHex).then((n) => { if (n) onDmNotice(n); });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/lib/xaomsg/inbox.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/inbox.ts src/lib/xaomsg/inbox.test.ts
git commit -m "feat(xaomsg): inbox key-bundle + encrypted DM-notice codec and Waku wiring"
```

---

## Task 7: Extract `useXaoThread`; refactor `useXaoMsg` to use it

**Files:**
- Create: `src/hooks/useXaoThread.ts`
- Modify: `src/hooks/useXaoMsg.ts`

**Interfaces:**
- Produces: `useXaoThread(opts): { messages, isLoading, error, postText, postProposal }` where
  ```ts
  interface UseXaoThreadOptions {
    threadId: Hex | null;
    contentTopic: string | null;
    threadKey: CryptoKey | null;
    session: PersistedSession | null;
  }
  ```
- Consumes: `subscribeToTopic`, `queryHistory`, `publishToTopic` (`waku.ts`); `encryptBody`/`decryptBody` (`crypto.ts`); `buildEnvelope`/`buildUnsignedBody`/`computeBodyHash`/`verifyEnvelope` (`envelope.ts`); `mergeResolved` (`merge.ts`).
- Behavior: identical live+backfill pipeline currently inside `useXaoMsg` (lines 63–163), but parameterized by an already-derived `threadId`/`contentTopic`/`threadKey` instead of deriving them from a `showContract`.

> **Note:** This is a pure refactor. The goal is that `useXaoMsg` keeps its exact public API and behavior while its body becomes: derive `threadId`/`contentTopic` from `showContract`, load the deterministic thread key, then `return useXaoThread({ threadId, contentTopic, threadKey, session })`. No new features.

- [ ] **Step 1: Create `useXaoThread.ts` by moving the pipeline out of `useXaoMsg`**

Create `src/hooks/useXaoThread.ts` with the message-state, subscribe/backfill effect, and `post`/`postText`/`postProposal` callbacks currently in `useXaoMsg.ts`. Full file:

```ts
// src/hooks/useXaoThread.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Hex } from 'viem';
import { encryptBody, decryptBody } from '../lib/xaomsg/crypto';
import {
  buildEnvelope, buildUnsignedBody, computeBodyHash, verifyEnvelope,
} from '../lib/xaomsg/envelope';
import { publishToTopic, queryHistory, subscribeToTopic } from '../lib/xaomsg/waku';
import { mergeResolved } from '../lib/xaomsg/merge';
import {
  ContentType, type OnWireEnvelope, type ProposalPayload, type ResolvedMessage, type TextPayload,
} from '../lib/xaomsg/types';
import type { PersistedSession } from '../lib/xaomsg/session';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

export interface UseXaoThreadOptions {
  threadId: Hex | null;
  contentTopic: string | null;
  threadKey: CryptoKey | null;
  session: PersistedSession | null;
}

export interface UseXaoThreadResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
}

export function useXaoThread({ threadId, contentTopic, threadKey, session }: UseXaoThreadOptions): UseXaoThreadResult {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (!contentTopic || !threadKey || !threadId) return;
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
            if (!(await verifyEnvelope(envelope))) return;
            if (envelope.body.threadId !== threadId) return;
            const resolved: ResolvedMessage = {
              envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            setMessages((prev) => mergeResolved(prev, resolved));
          } catch (err) {
            console.warn('[xaomsg] failed to handle inbound message:', err);
          }
        };

        const unsub = await subscribeToTopic(contentTopic, (bytes) => { void onBytes(bytes); });
        if (cancelled) { await unsub(); return; }
        unsubRef.current = unsub;
        setIsLoading(false);
        await queryHistory(contentTopic, (bytes) => { void onBytes(bytes); });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
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
    async (contentType: ContentType, payload: TextPayload | ProposalPayload, parentHash: Hex): Promise<ResolvedMessage> => {
      if (!session) throw new Error('No session — call unlock() first');
      if (!threadId || !contentTopic) throw new Error('No thread context');
      if (!threadKey) throw new Error('Thread key not ready');

      const body = buildUnsignedBody({
        threadId, contentType, payload, parentHash, sender: session.cert.walletAddress,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
      await publishToTopic(contentTopic, new TextEncoder().encode(ciphertextB64));

      const resolved: ResolvedMessage = {
        envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
      };
      setMessages((prev) => mergeResolved(prev, resolved));
      return resolved;
    },
    [session, threadId, threadKey, contentTopic],
  );

  const postText = useCallback(
    (text: string, parentHash: Hex = ZERO_HASH) => post(ContentType.TEXT, { kind: 'text', text }, parentHash),
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

- [ ] **Step 2: Rewrite `useXaoMsg.ts` to delegate**

Replace the entire body of `src/hooks/useXaoMsg.ts` with:

```ts
// src/hooks/useXaoMsg.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { threadIdForShow } from '../lib/xaomsg/threadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import { loadThreadKey } from '../lib/xaomsg/threadKey';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import type { PersistedSession } from '../lib/xaomsg/session';

export interface UseXaoMsgOptions {
  showContract: Address | null;
  session: PersistedSession | null;
}
export type UseXaoMsgResult = UseXaoThreadResult;

export function useXaoMsg({ showContract, session }: UseXaoMsgOptions): UseXaoMsgResult {
  const threadId = useMemo<Hex | null>(
    () => (showContract ? threadIdForShow(showContract) : null),
    [showContract],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  useEffect(() => {
    if (!showContract) { setThreadKey(null); return; }
    let cancelled = false;
    loadThreadKey(showContract).then((k) => { if (!cancelled) setThreadKey(k); }).catch(() => {});
    return () => { cancelled = true; };
  }, [showContract]);

  return useXaoThread({ threadId, contentTopic, threadKey, session });
}
```

- [ ] **Step 3: Run the full unit suite + typecheck**

Run: `yarn test:unit && npx tsc --noEmit`
Expected: PASS — all existing xaomsg tests green; no type errors. (There are no dedicated `useXaoMsg` unit tests; the lib tests must still pass and types must compile.)

- [ ] **Step 4: Manual smoke of contract chat (regression)**

Run: `pgrep -af "next dev|yarn dev" || yarn dev`
Open an existing contract chat (the flag `NEXT_PUBLIC_USE_XAOMSG=1` path) and confirm you can unlock, send a text message, and see it echo — identical to before the refactor.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useXaoThread.ts src/hooks/useXaoMsg.ts
git commit -m "refactor(xaomsg): extract useXaoThread; useXaoMsg delegates to it"
```

---

## Task 8: `useXaoDm` — negotiate the conversation key and run the thread

**Files:**
- Create: `src/hooks/useXaoDm.ts`

**Interfaces:**
- Produces:
  ```ts
  type DmStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';
  interface UseXaoDmResult extends UseXaoThreadResult { status: DmStatus; peerHasKey: boolean; }
  useXaoDm(opts: { peer: Address | null; session: PersistedSession | null }): UseXaoDmResult
  ```
- Consumes: `dmThreadId` (Task 1), `contentTopicForThread` (`topicId.ts`), `loadConversationKeyRaw`/`saveConversationKeyRaw`/`importAesKey`/`generateRawConversationKey` (Task 4), `queryPeerKeyBundle`/`queryInboxNotices`/`publishDmNotice`/`encodeDmNotice` + `DmNotice` (Task 6), `upsertConversation` (Task 5), `useXaoThread` (Task 7).
- Behavior:
  1. Derive `threadId = dmThreadId(myAddress, peer)` and `contentTopic`.
  2. If a conversation key is already cached → import it → `status='ready'`.
  3. Else, first replay my own inbox notices for this `threadId` (recipient path — the peer may already have started); if a notice is found, use its `convKeyB64`, cache it → `ready`.
  4. Else (initiator path) fetch the peer's key bundle. If none → `status='no-peer-key'` (block send). If found → generate a key, cache it, publish a DM notice to the peer's inbox with the wrapped key, upsert the conversation → `ready`.
  5. Delegate messaging to `useXaoThread({ threadId, contentTopic, threadKey, session })`.

- [ ] **Step 1: Implement the hook**

```ts
// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { useAccount } from 'wagmi';
import { dmThreadId } from '../lib/xaomsg/dmThreadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import {
  generateRawConversationKey, importAesKey, loadConversationKeyRaw, saveConversationKeyRaw,
} from '../lib/xaomsg/conversationKey';
import {
  encodeDmNotice, publishDmNotice, queryInboxNotices, queryPeerKeyBundle, type DmNotice,
} from '../lib/xaomsg/inbox';
import { upsertConversation } from '../lib/xaomsg/conversationStore';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import type { PersistedSession } from '../lib/xaomsg/session';

export type DmStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';
export interface UseXaoDmResult extends UseXaoThreadResult { status: DmStatus; }

function b64encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...Array.from(bytes))); }
function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

export function useXaoDm({ peer, session }: { peer: Address | null; session: PersistedSession | null }): UseXaoDmResult {
  const { address: myAddress } = useAccount();

  const threadId = useMemo<Hex | null>(
    () => (myAddress && peer ? dmThreadId(myAddress, peer) : null),
    [myAddress, peer],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [status, setStatus] = useState<DmStatus>('idle');

  useEffect(() => {
    setThreadKey(null);
    if (!threadId || !peer || !myAddress || !session) { setStatus('idle'); return; }
    let cancelled = false;
    setStatus('negotiating');

    (async () => {
      try {
        // (2) cached?
        const cached = loadConversationKeyRaw(threadId);
        if (cached) {
          const key = await importAesKey(cached);
          if (!cancelled) { setThreadKey(key); setStatus('ready'); }
          return;
        }

        // (3) recipient path — did the peer already start? replay my inbox for this thread
        let adopted: DmNotice | null = null;
        await queryInboxNotices(myAddress, session.privateKeyHex, (n) => {
          if (n.threadId.toLowerCase() === threadId.toLowerCase()) {
            if (!adopted || n.ts < adopted.ts) adopted = n;
          }
        });
        if (adopted) {
          const raw = b64decode(adopted.convKeyB64);
          saveConversationKeyRaw(threadId, raw);
          upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: adopted.ts });
          const key = await importAesKey(raw);
          if (!cancelled) { setThreadKey(key); setStatus('ready'); }
          return;
        }

        // (4) initiator path — need the peer's key bundle
        const peerCert = await queryPeerKeyBundle(peer);
        if (!peerCert) { if (!cancelled) setStatus('no-peer-key'); return; }

        const raw = generateRawConversationKey();
        saveConversationKeyRaw(threadId, raw);
        const notice: DmNotice = { from: myAddress, threadId, convKeyB64: b64encode(raw), ts: Date.now() };
        const noticeBytes = await encodeDmNotice(
          notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert.sessionPublicKeyHex,
        );
        await publishDmNotice(peer, noticeBytes);
        upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: notice.ts });
        const key = await importAesKey(raw);
        if (!cancelled) { setThreadKey(key); setStatus('ready'); }
      } catch (err) {
        console.error('[xaomsg] DM key negotiation failed:', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [threadId, contentTopic, peer, myAddress, session]);

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session });
  return { ...thread, status };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useXaoDm.ts
git commit -m "feat(xaomsg): useXaoDm — per-conversation key negotiation over the inbox topic"
```

> **Live verification of send/receive happens end-to-end in Task 10** (needs the UI + two wallets). Do not block this task on it.

---

## Task 9: `useXaoInbox` — publish my key bundle, capture notices, expose conversation list

**Files:**
- Create: `src/hooks/useXaoInbox.ts`

**Interfaces:**
- Produces:
  ```ts
  interface UseXaoInboxResult { conversations: ConversationRecord[]; }
  useXaoInbox(session: PersistedSession | null): UseXaoInboxResult
  ```
- Consumes: `subscribeInbox`/`queryInboxNotices`/`publishKeyBundle` + `DmNotice` (Task 6), `loadConversations`/`upsertConversation`/`mergeConversations` + `ConversationRecord` (Task 5), `loadConversationKeyRaw`/`saveConversationKeyRaw` (Task 4).
- Behavior: on mount with a session — publish my key bundle; load cached conversations into state; subscribe to my inbox and replay store history. For each notice: cache its conversation key (if not already), upsert the conversation, update state. Cleanup unsubscribes.

- [ ] **Step 1: Implement the hook**

```ts
// src/hooks/useXaoInbox.ts
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import {
  publishKeyBundle, queryInboxNotices, subscribeInbox, type DmNotice,
} from '../lib/xaomsg/inbox';
import {
  loadConversations, upsertConversation, type ConversationRecord,
} from '../lib/xaomsg/conversationStore';
import { loadConversationKeyRaw, saveConversationKeyRaw } from '../lib/xaomsg/conversationKey';
import type { PersistedSession } from '../lib/xaomsg/session';

function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

export interface UseXaoInboxResult { conversations: ConversationRecord[]; }

export function useXaoInbox(session: PersistedSession | null): UseXaoInboxResult {
  const { address } = useAccount();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);

  useEffect(() => {
    if (!address) { setConversations([]); return; }
    setConversations(loadConversations(address));
  }, [address]);

  useEffect(() => {
    if (!address || !session) return;
    let cancelled = false;
    let unsub: (() => Promise<void>) | null = null;

    const applyNotice = (n: DmNotice) => {
      const owner = address as Address;
      if (!loadConversationKeyRaw(n.threadId)) saveConversationKeyRaw(n.threadId, b64decode(n.convKeyB64));
      const next = upsertConversation(owner, {
        threadId: n.threadId, peer: n.from, lastActivityUnixMs: n.ts, lastPreview: n.preview,
      });
      if (!cancelled) setConversations(next);
    };

    (async () => {
      try {
        await publishKeyBundle(session.cert);
        unsub = await subscribeInbox(address as Address, session.privateKeyHex, () => {}, applyNotice);
        await queryInboxNotices(address as Address, session.privateKeyHex, applyNotice);
      } catch (err) {
        console.error('[xaomsg] inbox subscription failed:', err);
      }
    })();

    return () => { cancelled = true; if (unsub) void unsub(); };
  }, [address, session]);

  return { conversations };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useXaoInbox.ts
git commit -m "feat(xaomsg): useXaoInbox — key-bundle publish + conversation index from notices"
```

---

## Task 10: DM mode in `XaoMsgComponent`; wire the Chat page

**Files:**
- Modify: `src/components/Chat/XaoMsgComponent.tsx`
- Modify: `src/pages/chat-Section/Chat.tsx`

**Interfaces:**
- `XaoMsgComponentProps` gains `peer?: Address | null`. Exactly one of `showContract` / `peer` is expected. In `peer` mode the component uses `useXaoDm`; otherwise `useXaoMsg` (unchanged).

- [ ] **Step 1: Add DM mode to `XaoMsgComponent`**

Replace the top of `src/components/Chat/XaoMsgComponent.tsx` (imports through the `useXaoMsg` call) with a mode switch. Change the props interface and hook usage:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { type Address } from 'viem';
import { useAccount } from 'wagmi';
import styles from '../../styles/CreateContract.module.css';
import { useXaoMsg } from '../../hooks/useXaoMsg';
import { useXaoDm } from '../../hooks/useXaoDm';
import { useXaoMsgSession } from '../../hooks/useXaoMsgSession';
import { ContentType, type ResolvedMessage } from '../../lib/xaomsg/types';

export interface XaoMsgComponentProps {
  showContract?: Address | null;
  peer?: Address | null;
  embedded?: boolean;
}

const XaoMsgComponent: React.FC<XaoMsgComponentProps> = ({ showContract = null, peer = null, embedded = false }) => {
  const { session, isUnlocking, error: sessionError, unlock } = useXaoMsgSession();
  const isDm = !!peer;

  const contractThread = useXaoMsg({ showContract: isDm ? null : showContract, session });
  const dmThread = useXaoDm({ peer: isDm ? peer : null, session });
  const { messages, isLoading, error, postText } = isDm ? dmThread : contractThread;
  const dmStatus = isDm ? dmThread.status : null;

  const { address: myAddress } = useAccount();

  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const id = requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  if (!showContract && !peer) {
    return <div className={styles.RecievedMessage}>Open this chat from a contract or a wallet address to use XaoMsg.</div>;
  }
```

Then, immediately after the existing `if (!session) { ... }` unlock block, add a DM-not-ready guard **before** the `handleSend`/return:

```tsx
  if (isDm && dmStatus === 'no-peer-key') {
    return (
      <div className={styles.RecievedMessage}>
        This user hasn&apos;t joined XaoMsg yet, so messages can&apos;t be encrypted to them.
        Ask them to open XaoMsg once, then try again.
      </div>
    );
  }
  if (isDm && (dmStatus === 'negotiating' || dmStatus === 'idle')) {
    return <div className={styles.RecievedMessage}>Setting up a secure channel…</div>;
  }
  if (isDm && dmStatus === 'error') {
    return <div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>Couldn&apos;t set up the secure channel. Please retry.</div>;
  }
```

(The `renderMessage` helper and the rest of the component are unchanged.)

- [ ] **Step 2: Wire the Chat page to DM mode**

In `src/pages/chat-Section/Chat.tsx`, replace the `ChatComponent` import and usage with `XaoMsgComponent` in `peer` mode. Change the import (line 7):

```tsx
import XaoMsgComponent from "../../components/Chat/XaoMsgComponent";
```

Replace the `<ChatComponent ... />` JSX (starting line 70) with:

```tsx
        <XaoMsgComponent peer={(peerAddress as `0x${string}`) ?? null} />
```

Leave the rest of `Chat.tsx` (the BackNavbar, profile lookup, `handleContractProposalSelect`) as-is; `handleContractProposalSelect` is unused by Plan 1 and is wired up in Plan 2 — leave it in place.

> If TypeScript complains that `handleContractProposalSelect` is now unused, prefix it with `// eslint-disable-next-line @typescript-eslint/no-unused-vars` rather than deleting it — Plan 2 needs it.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Live end-to-end verification (two wallets)**

Run: `pgrep -af "next dev|yarn dev" || yarn dev`

1. In Browser A (Wallet Alice): open `/chat-Section/Search`, connect, and let the inbox publish (this publishes Alice's key bundle — needed so Bob can cold-DM her). Do the same in Browser B (Wallet Bob) so both key bundles exist.
2. In Browser B, paste Alice's address in Search → "Start new conversation" → send "hello from Bob".
3. Expected: no "hasn't joined" block (Alice published a bundle); message sends.
4. In Browser A, open the conversation with Bob (it should appear in Alice's Search list within the store-retention/live window) and confirm "hello from Bob" is visible, and a reply from Alice reaches Bob.

Expected: bidirectional delivery; both see the same history when opening by address.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/XaoMsgComponent.tsx src/pages/chat-Section/Chat.tsx
git commit -m "feat(xaomsg): DM mode in XaoMsgComponent; Chat page renders Waku DMs"
```

---

## Task 11: Rewire the Search page conversation list to Waku

**Files:**
- Modify: `src/pages/chat-Section/Search.tsx`

**Interfaces:**
- Consumes: `useXaoInbox` (Task 9), `useXaoMsgSession` (existing), `ConversationRecord` (Task 5).
- Replaces the XMTP conversation loader (the `useXMTPClient` block + `loadConversations` effect, lines ~55–248) with a Waku-backed list. Events loading, the address-paste "Start new conversation" card, tabs, and wallet UI are unchanged.

- [ ] **Step 1: Swap the conversation source**

In `src/pages/chat-Section/Search.tsx`:

1. Remove the XMTP imports (`useXMTPClient`, `isContactCard`, `isContractProposal`, `ConsentState`) and the `ConversationPreview` XMTP-shaped fields. Replace the conversations source with:

```tsx
import { useXaoMsgSession } from "../../hooks/useXaoMsgSession";
import { useXaoInbox } from "../../hooks/useXaoInbox";
```

2. Replace the `useXMTPClient()` destructure and the `loadConversations` effect (lines ~55–248) with:

```tsx
  const { session } = useXaoMsgSession();
  const { conversations: dmConversations } = useXaoInbox(session);
```

3. Map `dmConversations` (`ConversationRecord[]`) into the existing `ConversationPreview` render shape. Change the `ConversationPreview` interface to:

```tsx
interface ConversationPreview {
  id: string;
  type: "conversation";
  peerAddress: string;
  peerInboxId: string;      // kept for the existing render code; set = peerAddress
  lastMessage?: string;
  lastMessageTime?: Date;
}
```

and build the previews via `useMemo`:

```tsx
  const conversations: ConversationPreview[] = useMemo(
    () => dmConversations.map((c) => ({
      id: c.threadId,
      type: "conversation" as const,
      peerAddress: c.peer,
      peerInboxId: c.peer,
      lastMessage: c.lastPreview,
      lastMessageTime: c.lastActivityUnixMs ? new Date(c.lastActivityUnixMs) : undefined,
    })),
    [dmConversations],
  );
```

4. Remove `isLoadingConversations`/`setIsLoadingConversations` state and drop it from the `isLoading` expression (keep `isLoadingEvents`, `isLoadingTokenIds`). Remove `xmtpError`, `showRevokeOption`, `handleRevokeAndRetry`, and the XMTP error UI block that used them.

5. The existing results list already renders `ConversationPreview` via `peerAddress`/`peerInboxId`/`lastMessage`/`lastMessageTime` and routes clicks to `/chat-Section/Chat?peer=...` — leave that untouched.

- [ ] **Step 2: Typecheck + lint the file**

Run: `npx tsc --noEmit && npx eslint src/pages/chat-Section/Search.tsx`
Expected: PASS — no references to removed XMTP symbols remain.

- [ ] **Step 3: Live verification**

Run: `pgrep -af "next dev|yarn dev" || yarn dev`
Open `/chat-Section/Search`, connect a wallet, unlock XaoMsg. Confirm: the "Messaging is currently disabled" state is gone; existing DM conversations (from Task 10's test) appear in the list; pasting a new address still shows "Start new conversation"; clicking a conversation opens the Waku DM.

- [ ] **Step 4: Commit**

```bash
git add src/pages/chat-Section/Search.tsx
git commit -m "feat(xaomsg): Search page conversation list from Waku inbox (drop XMTP loader)"
```

---

## Plan-wide verification

- [ ] `yarn test:unit` — all lib suites green (Tasks 1–6).
- [ ] `npx tsc --noEmit` — no type errors.
- [ ] `npx eslint src/lib/xaomsg src/hooks src/pages/chat-Section` — clean (or only pre-existing warnings).
- [ ] Two-wallet manual flow (Task 10 Step 4 + Task 11 Step 3): cold DM by address, bidirectional delivery, conversation appears in Search, "hasn't joined" block shows for an address with no published key bundle.

## Notes & follow-ups (out of scope for Plan 1)

- **Key-establishment race:** if both parties cold-open simultaneously before either notice propagates, two conversation keys can briefly exist. Task 8 mitigates by adopting the **earliest-`ts`** notice for a thread; a full re-key handshake is deferred.
- **Contact cards & off-chain contracts** ride this same transport but are **Plan 2** (adds `CONTACT_CARD` routing → profile cache, and `CONTRACT_PROPOSAL` → Negotiation).
- **XMTP stack deletion** is **Plan 3** (this plan only stops the Search/Chat pages from using it; the provider and dead files are removed there).
- **Fresh-device history after session-key rotation** remains a known limitation (spec §11).
```
