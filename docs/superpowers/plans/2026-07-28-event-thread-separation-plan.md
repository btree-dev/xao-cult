# Separating Direct Conversations from Event/Contract Chats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every draft contract its own encrypted Waku thread (independent of the DM thread between the two wallets), carry that same thread and key across the mint boundary via inbox-published notices, and make the Search/Negotiation pages reflect real contract data instead of stubs.

**Architecture:** A new `threadIdForDraft(draftId)` thread type (mirroring the existing `threadIdForShow(address)` pattern) carries all contract negotiation content. Its encryption key is ECDH-derived and domain-separated per draft. Inbox notices generalize from DM-only to a `kind: 'dm' | 'event'` discriminated shape, and at mint time an event notice carrying `contractAddress` lets either party resolve a minted contract's chat back to its originating thread from any device — no smart-contract change, no on-chain storage.

**Tech Stack:** Next.js (pages router), TypeScript, Waku (`@waku/sdk`), `@noble/secp256k1`/`@noble/hashes` for ECDH/HKDF, `viem`/`wagmi`, Vitest.

## Global Constraints

- No smart-contract changes — `ShowContract`/`ShowContractFactory` source isn't in this repo (ABI-only); mint continuity is achieved entirely through the existing Waku inbox mechanism (spec §5, §11).
- No data migration — pre-existing localStorage draft data and pre-existing minted contracts permanently use the legacy fallback path (spec §9); do not write migration code.
- The DM thread must never carry `PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT`/`SYSTEM` content again after this plan (spec §3, decisions §12).
- Every concurrent draft between the same two people must get an independent encryption key — never reuse the DM key or another draft's key (spec §4, §6 fact 6).
- `yarn test:unit` (vitest) must stay green after every task; run `npx tsc --noEmit` after any task touching `.tsx`/hook files, since there is no dedicated hook-level test suite in this repo (grep confirms no `useXaoDm.test.ts`/`useXaoInbox.test.ts`/etc. exist — only `src/lib/xaomsg/*.test.ts` pure-function tests do).
- Reference spec: `docs/superpowers/specs/2026-07-27-event-thread-separation-design.md`.

---

## Task 1: `threadIdForDraft` — thread-id derivation for event threads

**Files:**
- Modify: `src/lib/xaomsg/threadId.ts`
- Test: `src/lib/xaomsg/threadId.test.ts` (new)

**Interfaces:**
- Produces: `threadIdForDraft(draftId: string): Hex`, `DRAFT_THREAD_DOMAIN: string` — consumed by Tasks 2, 3, 5, 8, 9.

- [ ] **Step 1: Write the failing test**

Create `src/lib/xaomsg/threadId.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { threadIdForDraft, threadIdForShow } from './threadId';

describe('threadIdForDraft', () => {
  it('is deterministic for the same draftId', () => {
    expect(threadIdForDraft('draft-1')).toBe(threadIdForDraft('draft-1'));
  });

  it('differs for a different draftId', () => {
    expect(threadIdForDraft('draft-1')).not.toBe(threadIdForDraft('draft-2'));
  });

  it('returns a 0x-prefixed 32-byte hex', () => {
    expect(threadIdForDraft('draft-1')).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('throws on an empty draftId', () => {
    expect(() => threadIdForDraft('')).toThrow();
  });

  it('is domain-separated from threadIdForShow even if a draftId string looks like an address', () => {
    const looksLikeAddress = '0x1111111111111111111111111111111111111111';
    expect(threadIdForDraft(looksLikeAddress)).not.toBe(
      threadIdForShow(looksLikeAddress as `0x${string}`),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/xaomsg/threadId.test.ts`
Expected: FAIL — `threadIdForDraft` is not exported from `./threadId`.

- [ ] **Step 3: Implement `threadIdForDraft`**

Modify `src/lib/xaomsg/threadId.ts` (append to the existing file, which currently only has `threadIdForShow`):

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

/** Distinct domain from THREAD_DOMAIN so a draftId string can never collide
 *  with an address-derived thread id, even in the edge case where a draftId
 *  happens to look like a hex address. */
export const DRAFT_THREAD_DOMAIN = 'xao-draft-thread-v1';

/** Thread id for a draft's own event thread — carries negotiation content
 *  pre-mint, and (via the inbox mint-notice mapping, see inbox.ts/sync.ts)
 *  keeps being used post-mint too. Independent of the DM thread between the
 *  same two people and of any other draft's thread. */
export function threadIdForDraft(draftId: string): Hex {
  if (!draftId) {
    throw new Error('threadIdForDraft: draftId must be non-empty');
  }
  return keccak256(concat([toBytes(DRAFT_THREAD_DOMAIN), toBytes(draftId)]));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/xaomsg/threadId.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/threadId.ts src/lib/xaomsg/threadId.test.ts
git commit -m "feat(xaomsg): add threadIdForDraft for per-draft event threads"
```

---

## Task 2: `deriveEventConversationKeyRaw` — per-draft ECDH key derivation

**Files:**
- Modify: `src/lib/xaomsg/ecies.ts`
- Modify: `src/lib/xaomsg/ecies.test.ts`

**Interfaces:**
- Consumes: nothing new (reuses the file's own private `deriveSharedRaw`).
- Produces: `deriveEventConversationKeyRaw(mySessionPrivHex: string, theirSessionPubHex: string, draftId: string): Promise<Uint8Array>` — consumed by Tasks 5, 9.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/xaomsg/ecies.test.ts` (append after the existing `deriveDmConversationKeyRaw` describe block; add `deriveEventConversationKeyRaw` to the import on line 4):

```ts
import { wrapBytes, unwrapBytes, deriveDmConversationKeyRaw, deriveEventConversationKeyRaw } from './ecies';
```

```ts
describe('deriveEventConversationKeyRaw', () => {
  it('is symmetric — both sides derive the identical key with no negotiation', async () => {
    const alice = keypair();
    const bob = keypair();
    const fromAlice = await deriveEventConversationKeyRaw(alice.privHex, bob.pubHex, 'draft-1');
    const fromBob = await deriveEventConversationKeyRaw(bob.privHex, alice.pubHex, 'draft-1');
    expect(Array.from(fromAlice)).toEqual(Array.from(fromBob));
    expect(fromAlice.length).toBe(32);
  });

  it('differs per draftId between the same two people — concurrent drafts never share a key', async () => {
    const alice = keypair();
    const bob = keypair();
    const draft1 = await deriveEventConversationKeyRaw(alice.privHex, bob.pubHex, 'draft-1');
    const draft2 = await deriveEventConversationKeyRaw(alice.privHex, bob.pubHex, 'draft-2');
    expect(Array.from(draft1)).not.toEqual(Array.from(draft2));
  });

  it('never matches the same pair\'s DM key', async () => {
    const alice = keypair();
    const bob = keypair();
    const dmKey = await deriveDmConversationKeyRaw(alice.privHex, bob.pubHex);
    const eventKey = await deriveEventConversationKeyRaw(alice.privHex, bob.pubHex, 'draft-1');
    expect(Array.from(dmKey)).not.toEqual(Array.from(eventKey));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/xaomsg/ecies.test.ts`
Expected: FAIL — `deriveEventConversationKeyRaw` is not exported from `./ecies`.

- [ ] **Step 3: Implement `deriveEventConversationKeyRaw`**

Modify `src/lib/xaomsg/ecies.ts` — add near `deriveDmConversationKeyRaw`:

```ts
// Distinct info-string family from CONVKEY_INFO (the DM key) — and the
// draftId is folded directly into the HKDF info, not just the family name,
// so every concurrent draft between the same two people gets an
// independent key. A leaked event key exposes only that one draft.
const EVENT_CONVKEY_INFO_PREFIX = 'xao-event-convkey-v1:';

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/xaomsg/ecies.test.ts`
Expected: PASS (all `ecies.test.ts` tests, including the 3 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/ecies.ts src/lib/xaomsg/ecies.test.ts
git commit -m "feat(xaomsg): add deriveEventConversationKeyRaw, domain-separated per draftId"
```

---

## Task 3: Generalize inbox notices to `ThreadNotice` with `kind: 'dm' | 'event'`

**Files:**
- Modify: `src/lib/xaomsg/inbox.ts`
- Modify: `src/lib/xaomsg/inbox.test.ts`

**Interfaces:**
- Consumes: `threadIdForDraft` (Task 1).
- Produces: `ThreadNotice` (replaces `DmNotice`), `encodeThreadNotice` (replaces `encodeDmNotice`), `tryDecodeThreadNotice` (replaces `tryDecodeDmNotice`), `publishThreadNotice` (replaces `publishDmNotice`), `subscribeInbox(myAddress, mySessionPrivHex, onKeyBundle, onThreadNotice)`, `queryInboxNotices(myAddress, mySessionPrivHex, onThreadNotice)` — same signatures as before, renamed callback param. Consumed by Tasks 5, 9, 10 (`useXaoDm.ts`, `useXaoInbox.ts`, `sync.ts`).

This task **removes** the `convKeyB64` field from the notice shape — it was already dead (nothing reads it; key material is derived via ECDH on demand, per the existing comment in `useXaoDm.ts`). This task also **renames** `DmNotice`/`encodeDmNotice`/`tryDecodeDmNotice`/`publishDmNotice` outright (no deprecated alias — every consumer is updated in this same task or in Tasks 5/9/10).

- [ ] **Step 1: Write the failing tests**

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
  type ThreadNotice,
} from './inbox';
import { createSessionKeypair, mintSessionCert } from './session';
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
  expiresAtUnixMs: Date.now() + 100000,
  chainId: 84532,
  walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
};

async function makeGenuineCertWithKey(
  expiresAtUnixMs = Date.now() + 60 * 60 * 1000,
): Promise<{ cert: SessionCert; privateKeyHex: string }> {
  const account = privateKeyToAccount(generatePrivateKey());
  const kp = await createSessionKeypair();
  const genuineCert = await mintSessionCert({
    walletAddress: account.address,
    sessionPublicKeyHex: kp.publicKey,
    expiresAtUnixMs,
    chainId: 84532,
    signMessage: (message) => account.signMessage({ message }),
  });
  return { cert: genuineCert, privateKeyHex: kp.privateKey };
}

async function makeGenuineCert(expiresAtUnixMs = Date.now() + 60 * 60 * 1000): Promise<SessionCert> {
  return (await makeGenuineCertWithKey(expiresAtUnixMs)).cert;
}

function forgeCert(base: SessionCert, expiresAtUnixMs: number): SessionCert {
  return { ...base, expiresAtUnixMs, walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}` };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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
    const forged = forgeCert(genuine.cert, genuine.cert.expiresAtUnixMs);
    const notice: ThreadNotice = { kind: 'dm', from: forged.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, genuine.privateKeyHex, forged);
    expect(await tryDecodeThreadNotice(bytes, owner.privHex)).toBeNull();
  });

  it('returns null when the sender cert is expired', async () => {
    const owner = keypair();
    const expired = await makeGenuineCertWithKey(Date.now() - 1000);
    const notice: ThreadNotice = { kind: 'dm', from: expired.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, expired.privateKeyHex, expired.cert);
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
  it('returns the genuine bundle even when a forged bundle with higher expiry is in history', async () => {
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine, genuine.expiresAtUnixMs + 1_000_000);
    scriptHistory([encodeKeyBundle(forged), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('is not locked out by a malformed bundle with undefined expiry appearing first', async () => {
    const genuine = await makeGenuineCert();
    const malformed = { ...genuine, expiresAtUnixMs: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(malformed), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('returns null when only forged/invalid bundles exist', async () => {
    const genuine = await makeGenuineCert();
    const forged1 = forgeCert(genuine, genuine.expiresAtUnixMs + 5000);
    const malformed = { ...genuine, expiresAtUnixMs: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(forged1), encodeKeyBundle(malformed)]);
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
    const attacker = await makeGenuineCert(genuine.expiresAtUnixMs + 1_000_000);
    scriptHistory([encodeKeyBundle(attacker), encodeKeyBundle(genuine)]);
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
    const forged = forgeCert(genuine, genuine.expiresAtUnixMs + 1000);
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

  it('does not invoke onKeyBundle for an expired but genuinely signed cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const expired = await makeGenuineCert(Date.now() - 1000);
    await subscribeInbox(expired.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(expired));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
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
    // threadId claims a completely unrelated pair.
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
    // draftId says 'draft-abc' but threadId is for a different draft entirely.
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/xaomsg/inbox.test.ts`
Expected: FAIL — `encodeThreadNotice`/`tryDecodeThreadNotice`/`ThreadNotice` are not exported from `./inbox`.

- [ ] **Step 3: Implement the generalized inbox module**

Replace `src/lib/xaomsg/inbox.ts` in full:

```ts
// src/lib/xaomsg/inbox.ts
import type { Address, Hex } from 'viem';
import type { SessionCert } from './types';
import { inboxTopicForAddress } from './inboxTopic';
import { wrapBytes, unwrapBytes } from './ecies';
import { publishToTopic, subscribeToTopic, queryHistory } from './waku';
import { verifySessionCert, isExpired } from './session';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';

export interface ThreadNotice {
  kind: 'dm' | 'event';
  from: Address;
  threadId: Hex;
  ts: number;
  preview?: string;
  /** present iff kind === 'event' */
  draftId?: string;
  /** present iff kind === 'event' and this draft has been minted on-chain —
   *  lets any device resolve the minted contract's address back to this
   *  same thread (see useResolveEventThread / sync.ts). */
  contractAddress?: Address;
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

// ---- Thread notice (ECIES-encrypted to owner, authenticated by sender's session cert) ----
export async function encodeThreadNotice(
  notice: ThreadNotice,
  ownerSessionPubHex: string,
  mySessionPrivHex: string,
  myCert: SessionCert,
): Promise<Uint8Array> {
  const encBlob = await wrapBytes(enc.encode(JSON.stringify(notice)), ownerSessionPubHex, mySessionPrivHex);
  // 't: dm' is on-wire transport framing (distinguishes a notice from a key
  // bundle) — unrelated to the notice's own `kind` field, so it stays as-is
  // for both dm- and event-kind notices.
  return enc.encode(JSON.stringify({ t: 'dm', cert: myCert, enc: encBlob }));
}

export async function tryDecodeThreadNotice(bytes: Uint8Array, mySessionPrivHex: string): Promise<ThreadNotice | null> {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'dm' || !o.cert || !o.enc) return null;
    const senderCert = o.cert as SessionCert;
    if (!(await verifySessionCert(senderCert))) return null;
    if (isExpired(senderCert)) return null;
    const plain = await unwrapBytes(o.enc, senderCert.sessionPublicKeyHex, mySessionPrivHex);
    const notice = JSON.parse(dec.decode(plain)) as ThreadNotice;
    if (typeof notice.from !== 'string' || notice.from.toLowerCase() !== senderCert.walletAddress.toLowerCase()) {
      return null;
    }
    return notice;
  } catch { return null; }
}

/** Full shape + threadId-recomputation check, shared by subscribeInbox and
 *  queryInboxNotices — a wallet-attested sender can never claim a threadId
 *  that doesn't match what it's actually supposed to be, for either kind. */
function isValidThreadNotice(myAddress: Address, n: unknown): n is ThreadNotice {
  if (!n || typeof n !== 'object') return false;
  const notice = n as ThreadNotice;
  if (typeof notice.from !== 'string' || typeof notice.threadId !== 'string' || typeof notice.ts !== 'number') {
    return false;
  }
  if (notice.kind === 'dm') {
    return notice.threadId.toLowerCase() === dmThreadId(myAddress, notice.from as Address).toLowerCase();
  }
  if (notice.kind === 'event') {
    if (typeof notice.draftId !== 'string' || !notice.draftId) return false;
    return notice.threadId.toLowerCase() === threadIdForDraft(notice.draftId).toLowerCase();
  }
  return false;
}

// ---- Waku wiring ----
export async function publishKeyBundle(cert: SessionCert): Promise<void> {
  await publishToTopic(inboxTopicForAddress(cert.walletAddress), encodeKeyBundle(cert));
}

export async function publishThreadNotice(ownerAddress: Address, noticeBytes: Uint8Array): Promise<void> {
  await publishToTopic(inboxTopicForAddress(ownerAddress), noticeBytes);
}

/** Fetch the peer's most recent valid, unexpired key bundle (their session pubkey).
 *  Returns null if the peer has never published one (→ caller blocks the cold DM). */
export async function queryPeerKeyBundle(peer: Address): Promise<SessionCert | null> {
  const candidates: SessionCert[] = [];
  await queryHistory(inboxTopicForAddress(peer), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (!cert) return;
    if (typeof cert.expiresAtUnixMs !== 'number') return;
    if (isExpired(cert)) return;
    candidates.push(cert);
  });
  candidates.sort((a, b) => b.expiresAtUnixMs - a.expiresAtUnixMs);
  const peerLower = peer.toLowerCase();
  for (const cert of candidates) {
    if (cert.walletAddress?.toLowerCase() !== peerLower) continue;
    if (await verifySessionCert(cert)) return cert;
  }
  return null;
}

/** Subscribe to my inbox. Returns an unsubscribe fn. Routes each message to the
 *  right callback; ignores anything that isn't a signature-verified, unexpired
 *  bundle or a notice I can read and that passes isValidThreadNotice. */
export async function subscribeInbox(
  myAddress: Address,
  mySessionPrivHex: string,
  onKeyBundle: (cert: SessionCert) => void,
  onThreadNotice: (notice: ThreadNotice) => void,
): Promise<() => Promise<void>> {
  return subscribeToTopic(inboxTopicForAddress(myAddress), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (cert) {
      if (isExpired(cert)) return;
      if (cert.walletAddress?.toLowerCase() !== myAddress.toLowerCase()) return;
      void verifySessionCert(cert).then((ok) => { if (ok) onKeyBundle(cert); });
      return;
    }
    void tryDecodeThreadNotice(bytes, mySessionPrivHex).then((n) => {
      if (!n || !isValidThreadNotice(myAddress, n)) return;
      onThreadNotice(n);
    });
  });
}

/** Replay inbox store history to recover thread notices (conversation +
 *  event index). */
export async function queryInboxNotices(
  myAddress: Address,
  mySessionPrivHex: string,
  onThreadNotice: (notice: ThreadNotice) => void,
): Promise<void> {
  await queryHistory(inboxTopicForAddress(myAddress), async (bytes) => {
    try {
      const n = await tryDecodeThreadNotice(bytes, mySessionPrivHex);
      if (n && isValidThreadNotice(myAddress, n)) {
        onThreadNotice(n);
      }
    } catch (err) {
      console.warn('[xaomsg] failed to process inbox notice; skipping', err);
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/xaomsg/inbox.test.ts`
Expected: PASS (all tests, including the 6 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/xaomsg/inbox.ts src/lib/xaomsg/inbox.test.ts
git commit -m "feat(xaomsg): generalize inbox notices to ThreadNotice (dm | event kinds)"
```

---

## Task 4: `useXaoDm` stops touching the off-chain contract store

**Files:**
- Modify: `src/hooks/useXaoDm.ts`

**Interfaces:**
- Consumes: `ThreadNotice`/`encodeThreadNotice`/`publishThreadNotice` (Task 3).
- Produces: same `UseXaoDmResult` shape as before (`UseXaoThreadResult & { status }`) — no signature change, only internal behavior (drops draft-store side effects).

No new test file — this hook has no dedicated unit test in the repo (only `src/lib/xaomsg/*.test.ts` files are unit-tested; hooks are exercised via manual/browser verification, matching existing convention). Verification is a full-repo typecheck plus the existing `draftSync`/`offchainContracts` suites staying green (unaffected, since `applyDraftMessage` itself doesn't change — only who calls it).

- [ ] **Step 1: Rewrite `useXaoDm.ts`**

Replace `src/hooks/useXaoDm.ts` in full:

```ts
// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { dmThreadId } from '../lib/xaomsg/dmThreadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import {
  importAesKey, loadConversationKeyRaw, saveConversationKeyRaw,
} from '../lib/xaomsg/conversationKey';
import {
  encodeThreadNotice, publishThreadNotice, queryPeerKeyBundle, type ThreadNotice,
} from '../lib/xaomsg/inbox';
import { deriveDmConversationKeyRaw } from '../lib/xaomsg/ecies';
import { upsertConversation } from '../lib/xaomsg/conversationStore';
import { formatMessagePreview } from '../lib/xaomsg/messagePreview';
import {
  buildContactCardPayload, applyContactCard, hasSentContactCard, markContactCardSent,
} from '../lib/xaomsg/contactCard';
import {
  ContentType, type ContactCardPayload, type ResolvedMessage,
} from '../lib/xaomsg/types';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import { useProfileCache } from '../contexts/ProfileCacheContext';
import type { PersistedSession } from '../lib/xaomsg/session';

export type DmStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';
export interface UseXaoDmResult extends UseXaoThreadResult { status: DmStatus; }

// Dedupe concurrent negotiations for the same thread (React StrictMode's
// dev-mode mount→cleanup→mount, or a fast remount) so two effect instances
// never both fire the peer-key-bundle lookup and discovery-notice publish
// for the same threadId at once.
const inFlightNegotiations = new Map<Hex, Promise<Uint8Array | null>>();

async function negotiateKey(
  threadId: Hex,
  peer: Address,
  myAddress: Address,
  session: PersistedSession,
): Promise<Uint8Array | null> {
  const cached = loadConversationKeyRaw(threadId);
  if (cached) return cached;

  // ECDH(myPriv, theirPub) is symmetric, so both sides derive the identical
  // key locally the moment they know each other's session pubkey — no
  // transport, no "who generates it first" race, no divergence possible.
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return null;
  const raw = await deriveDmConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex);
  saveConversationKeyRaw(threadId, raw);
  upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: Date.now() });

  // Best-effort discovery ping so the peer's device can list this thread
  // (see useXaoInbox / syncAllKnownThreads) without opening Chat first. The
  // key material inside is redundant now — the peer derives the same key
  // themselves — so a failure here never blocks the key from being usable.
  try {
    const notice: ThreadNotice = { kind: 'dm', from: myAddress, threadId, ts: Date.now() };
    const noticeBytes = await encodeThreadNotice(notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
    await publishThreadNotice(peer, noticeBytes);
  } catch (err) {
    console.warn('[xaomsg] DM discovery notice publish failed (key already usable locally):', err);
  }

  return raw;
}

export function useXaoDm({ peer, session }: { peer: Address | null; session: PersistedSession | null }): UseXaoDmResult {
  const { address: myAddress } = useAccount();
  const { setProfile, currentUserProfile } = useProfileCache();

  const threadId = useMemo<Hex | null>(
    () => (myAddress && peer && isAddress(peer) ? dmThreadId(myAddress, peer) : null),
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

    let promise = inFlightNegotiations.get(threadId);
    if (!promise) {
      promise = negotiateKey(threadId, peer, myAddress, session).finally(() => {
        inFlightNegotiations.delete(threadId);
      });
      inFlightNegotiations.set(threadId, promise);
    }

    promise
      .then(async (raw) => {
        if (cancelled) return;
        if (!raw) { setStatus('no-peer-key'); return; }
        const key = await importAesKey(raw);
        if (!cancelled) { setThreadKey(key); setStatus('ready'); }
      })
      .catch((err) => {
        console.error('[xaomsg] DM key negotiation failed:', err);
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, [threadId, contentTopic, peer, myAddress, session]);

  // Pure chat + contact card — contract negotiation content
  // (PROPOSAL/COUNTER_PROPOSAL/ACCEPT/SYSTEM) never rides the DM thread; it
  // lives on its own per-draft event thread (see useXaoEvent). A DM never
  // touches the off-chain contract store.
  const onMessage = (resolved: ResolvedMessage) => {
    if (!myAddress || !peer) return;
    const { body } = resolved.envelope;
    if (body.contentType === ContentType.CONTACT_CARD) {
      const card = body.payload as ContactCardPayload;
      // Two independent checks, both required: `body.sender` is the
      // wallet-verified signer (verifyEnvelope already confirmed it matches
      // cert.walletAddress) — checking it against `peer` rejects a message
      // from anyone who isn't actually our DM counterparty. Checking the
      // *payload's own* claimed `walletAddress` against that same verified
      // sender stops a genuine-but-third-party sender from putting a
      // different wallet's address inside the card and having it cached
      // under that other wallet's identity.
      if (
        body.sender.toLowerCase() === peer.toLowerCase() &&
        card.walletAddress.toLowerCase() === body.sender.toLowerCase()
      ) {
        setProfile(applyContactCard(card));
      }
      return;
    }

    const preview = formatMessagePreview(resolved);
    if (preview && threadId) {
      upsertConversation(myAddress, {
        threadId,
        peer,
        lastActivityUnixMs: resolved.envelope.body.sentAt,
        lastPreview: preview,
      });
    }
  };

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session, onMessage });

  // Auto-send our contact card once per thread, once the secure channel is
  // ready — mirrors the design's "on opening/first-contact" rule without
  // re-sending on every remount (hasSentContactCard is localStorage-backed).
  useEffect(() => {
    if (status !== 'ready' || !threadId || !currentUserProfile || !myAddress) return;
    if (hasSentContactCard(threadId)) return;
    markContactCardSent(threadId); // mark before the async send so a fast remount can't double-send
    thread.postContactCard(buildContactCardPayload({
      walletAddress: myAddress,
      username: currentUserProfile.username,
      profilePictureUrl: currentUserProfile.profilePictureUrl,
    })).catch((err) => console.warn('[xaomsg] failed to send contact card:', err));
    // thread.postContactCard is stable per Task 3's useCallback deps; omitting
    // it (and the rest of `thread`) avoids re-running this effect on every
    // message received, which is unrelated to "have we sent our card yet".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, threadId, currentUserProfile, myAddress]);

  return { ...thread, status };
}
```

Note what changed from the original: the `applyDraftMessage`/`draftByProposalHash`/`ProposalHashIndex` imports and usage are gone, and the notice literal drops the (already-dead) `convKeyB64` field and gains `kind: 'dm'`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this file (pre-existing unrelated errors, if any, are out of scope).

- [ ] **Step 3: Run the full unit suite to confirm nothing else broke**

Run: `yarn test:unit`
Expected: PASS — `draftSync.test.ts`/`offchainContracts.test.ts` are unaffected since `applyDraftMessage` itself didn't change.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useXaoDm.ts
git commit -m "refactor(xaomsg): stop useXaoDm from touching the off-chain contract store"
```

---

## Task 5: `useXaoEvent` — the per-draft event thread hook

**Files:**
- Create: `src/hooks/useXaoEvent.ts`

**Interfaces:**
- Consumes: `threadIdForDraft` (Task 1), `deriveEventConversationKeyRaw` (Task 2), `ThreadNotice`/`encodeThreadNotice`/`publishThreadNotice`/`queryPeerKeyBundle` (Task 3), `applyDraftMessage`/`ProposalHashIndex` (existing `draftSync.ts`, unchanged), `useXaoThread` (existing, unchanged).
- Produces: `useXaoEvent({ draftId, peer, session }): UseXaoEventResult` where `UseXaoEventResult extends UseXaoThreadResult { status: EventStatus; notifyThread: (contractAddress?: Address) => Promise<void> }`. Consumed by Tasks 7 (`XaoMsgComponent`), 8 (`create-contract.tsx`).

- [ ] **Step 1: Implement `useXaoEvent.ts`**

Create `src/hooks/useXaoEvent.ts`:

```ts
// src/hooks/useXaoEvent.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Address, type Hex, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { threadIdForDraft } from '../lib/xaomsg/threadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import {
  importAesKey, loadConversationKeyRaw, saveConversationKeyRaw,
} from '../lib/xaomsg/conversationKey';
import {
  encodeThreadNotice, publishThreadNotice, queryPeerKeyBundle, type ThreadNotice,
} from '../lib/xaomsg/inbox';
import { deriveEventConversationKeyRaw } from '../lib/xaomsg/ecies';
import { applyDraftMessage, type ProposalHashIndex } from '../lib/xaomsg/draftSync';
import type { ResolvedMessage, SessionCert } from '../lib/xaomsg/types';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import type { PersistedSession } from '../lib/xaomsg/session';

export type EventStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';

export interface UseXaoEventResult extends UseXaoThreadResult {
  status: EventStatus;
  /** Publishes a discovery/mint notice for this draft to both the
   *  counterparty's inbox and my own, so either party (on any device) can
   *  discover this thread on next login. Pass `contractAddress` once the
   *  draft has minted — this is what lets useResolveEventThread map the
   *  on-chain address back to this same thread later, keeping the same
   *  thread and key in use pre- and post-mint (see
   *  docs/superpowers/specs/2026-07-27-event-thread-separation-design.md §5, §7). */
  notifyThread: (contractAddress?: Address) => Promise<void>;
}

interface NegotiationResult { raw: Uint8Array; peerCert: SessionCert; }

// Same dedupe purpose as useXaoDm's inFlightNegotiations — one negotiation
// per threadId even across a StrictMode mount→cleanup→mount.
const inFlightNegotiations = new Map<Hex, Promise<NegotiationResult | null>>();

async function negotiateKey(
  threadId: Hex,
  draftId: string,
  peer: Address,
  session: PersistedSession,
): Promise<NegotiationResult | null> {
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return null;
  const cached = loadConversationKeyRaw(threadId);
  if (cached) return { raw: cached, peerCert };
  const raw = await deriveEventConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex, draftId);
  saveConversationKeyRaw(threadId, raw);
  return { raw, peerCert };
}

export function useXaoEvent(
  { draftId, peer, session }: { draftId: string | null; peer: Address | null; session: PersistedSession | null },
): UseXaoEventResult {
  const { address: myAddress } = useAccount();

  const threadId = useMemo<Hex | null>(
    () => (draftId ? threadIdForDraft(draftId) : null),
    [draftId],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [status, setStatus] = useState<EventStatus>('idle');
  const peerCertRef = useRef<SessionCert | null>(null);

  useEffect(() => {
    setThreadKey(null);
    peerCertRef.current = null;
    if (!threadId || !draftId || !peer || !isAddress(peer) || !session) { setStatus('idle'); return; }
    let cancelled = false;
    setStatus('negotiating');

    let promise = inFlightNegotiations.get(threadId);
    if (!promise) {
      promise = negotiateKey(threadId, draftId, peer, session).finally(() => {
        inFlightNegotiations.delete(threadId);
      });
      inFlightNegotiations.set(threadId, promise);
    }

    promise
      .then(async (result) => {
        if (cancelled) return;
        if (!result) { setStatus('no-peer-key'); return; }
        peerCertRef.current = result.peerCert;
        const key = await importAesKey(result.raw);
        if (!cancelled) { setThreadKey(key); setStatus('ready'); }
      })
      .catch((err) => {
        console.error('[xaomsg] event key negotiation failed:', err);
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, [threadId, draftId, peer, session]);

  // proposalHash -> draftId correlation for ACCEPT resolution — same purpose
  // as useXaoDm's original ref, just scoped to this one draft's thread.
  const draftByProposalHash = useRef<ProposalHashIndex>(new Map());

  const onMessage = (resolved: ResolvedMessage) => {
    if (!myAddress || !peer) return;
    applyDraftMessage(resolved, myAddress, peer, draftByProposalHash.current);
  };

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session, onMessage });

  const notifyThread = async (contractAddress?: Address): Promise<void> => {
    if (!myAddress || !peer || !draftId || !threadId || !session) return;
    const notice: ThreadNotice = { kind: 'event', from: myAddress, threadId, draftId, contractAddress, ts: Date.now() };

    const peerCert = peerCertRef.current;
    if (peerCert) {
      try {
        const bytes = await encodeThreadNotice(notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
        await publishThreadNotice(peer, bytes);
      } catch (err) {
        console.warn('[xaomsg] event notice publish to peer failed:', err);
      }
    }
    // Also publish to my OWN inbox so any other device of mine discovers
    // this thread (and, once minted, the contractAddress mapping) too.
    try {
      const selfBytes = await encodeThreadNotice(notice, session.cert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
      await publishThreadNotice(myAddress, selfBytes);
    } catch (err) {
      console.warn('[xaomsg] event notice publish to self failed:', err);
    }
  };

  return { ...thread, status, notifyThread };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useXaoEvent.ts
git commit -m "feat(xaomsg): add useXaoEvent — per-draft event thread hook"
```

---

## Task 6: `useResolveEventThread` — resolve a minted contract back to its draft

**Files:**
- Create: `src/hooks/useResolveEventThread.ts`

**Interfaces:**
- Consumes: `listDrafts` (existing `offchainContracts.ts`, unchanged).
- Produces: `useResolveEventThread(contractAddress): ResolvedEventThread | null` where `ResolvedEventThread = { mode: 'draft'; draftId: string } | { mode: 'legacy'; showContract: Address }`. Consumed by Task 12 (`contracts-detail.tsx`).

- [ ] **Step 1: Implement `useResolveEventThread.ts`**

Create `src/hooks/useResolveEventThread.ts`:

```ts
// src/hooks/useResolveEventThread.ts
import { useMemo } from 'react';
import type { Address } from 'viem';
import { listDrafts } from '../lib/xaomsg/offchainContracts';

export type ResolvedEventThread =
  | { mode: 'draft'; draftId: string }
  | { mode: 'legacy'; showContract: Address };

/**
 * Given a minted contract's on-chain address, resolves which thread its
 * chat lives on.
 *
 * A contract minted after this feature shipped has its draftId recorded
 * locally against `mintedContractAddress` (populated either by the in-thread
 * SYSTEM "minted" message, or — for a device with no local negotiation
 * history — by replaying the mint notice published to this wallet's own
 * inbox at mint time; see sync.ts). That draft's own thread is used,
 * carrying real per-draft encryption and continuous pre+post-mint history.
 *
 * A contract with no such mapping (minted before this shipped, or a device
 * whose Waku store lookup missed the mint notice entirely — bounded by
 * store retention) falls back to the legacy address-keyed thread
 * (threadIdForShow / useXaoMsg).
 */
export function useResolveEventThread(contractAddress: Address | null | undefined): ResolvedEventThread | null {
  return useMemo(() => {
    if (!contractAddress) return null;
    const lower = contractAddress.toLowerCase();
    const match = listDrafts().find((d) => d.mintedContractAddress?.toLowerCase() === lower);
    if (match) return { mode: 'draft', draftId: match.draftId };
    return { mode: 'legacy', showContract: contractAddress };
  }, [contractAddress]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useResolveEventThread.ts
git commit -m "feat(xaomsg): add useResolveEventThread for mint-continuity resolution"
```

---

## Task 7: `XaoMsgComponent` gains a `draftId` mode

**Files:**
- Modify: `src/components/Chat/XaoMsgComponent.tsx`

**Interfaces:**
- Consumes: `useXaoEvent` (Task 5).
- Produces: `XaoMsgComponentProps` gains `draftId?: string | null`. When `draftId` is set, `peer` is also read (as the counterparty) but the component resolves to event mode, not DM mode.

- [ ] **Step 1: Modify `XaoMsgComponent.tsx`**

In `src/components/Chat/XaoMsgComponent.tsx`, apply these changes to the existing file:

Add the import (alongside the existing `useXaoDm` import):

```ts
import { useXaoEvent } from '../../hooks/useXaoEvent';
```

Replace the props interface and the top of the component:

```tsx
export interface XaoMsgComponentProps {
  showContract?: Address | null;
  peer?: Address | null;
  draftId?: string | null;
  embedded?: boolean;
  onContractProposalSelect?: (proposal: ContractProposalMessage) => void;
}

const XaoMsgComponent: React.FC<XaoMsgComponentProps> = ({
  showContract = null, peer = null, draftId = null, embedded = false, onContractProposalSelect,
}) => {
  const { session, isUnlocking, error: sessionError, unlock } = useXaoMsgSession();
  // draftId takes priority: create-contract.tsx and contracts-detail.tsx
  // (via useResolveEventThread) pass BOTH draftId and peer together for
  // event mode. peer alone (no draftId) means DM mode.
  const isEvent = !!draftId;
  const isDm = !isEvent && !!peer;

  const contractThread = useXaoMsg({ showContract: isDm || isEvent ? null : showContract, session });
  const dmThread = useXaoDm({ peer: isDm ? peer : null, session });
  const eventThread = useXaoEvent({ draftId: isEvent ? draftId : null, peer: isEvent ? peer : null, session });
  const { messages, isLoading, error, postText } = isDm ? dmThread : isEvent ? eventThread : contractThread;
  const activeStatus = isDm ? dmThread.status : isEvent ? eventThread.status : null;
```

Update the guard blocks that follow (replace every `dmStatus` reference with `activeStatus`, and extend the "no context" / "invalid address" guards to cover `draftId`):

```tsx
  const { address: myAddress } = useAccount();

  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const id = requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  const panel = (content: React.ReactNode) => (
    <div className={embedded ? styles.chatContainer : styles.chatMain}>
      <div className={styles.messagesContainer}>{content}</div>
    </div>
  );

  if (!showContract && !peer && !draftId) {
    return panel(<div className={styles.RecievedMessage}>Open this chat from a contract, a draft, or a wallet address to use XaoMsg.</div>);
  }

  if (peer && !isAddress(peer)) {
    return panel(<div className={styles.RecievedMessage}>This isn&apos;t a valid wallet address.</div>);
  }

  if (!session) {
    return panel(
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
      </div>,
    );
  }

  if ((isDm || isEvent) && activeStatus === 'no-peer-key') {
    return panel(
      <div className={styles.RecievedMessage}>
        This user hasn&apos;t joined XaoMsg yet, so messages can&apos;t be encrypted to them.
        Ask them to open XaoMsg once, then try again.
      </div>,
    );
  }
  if ((isDm || isEvent) && (activeStatus === 'negotiating' || activeStatus === 'idle')) {
    return panel(<div className={styles.RecievedMessage}>Setting up a secure channel…</div>);
  }
  if ((isDm || isEvent) && activeStatus === 'error') {
    return panel(<div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>Couldn&apos;t set up the secure channel. Please retry.</div>);
  }
```

Leave `handleSend`, the render return block, `shortWho`, `toContractProposalMessage`, and `renderMessage` unchanged — they already operate on the generic `messages`/`postText`/`onContractProposalSelect` values, which now come from `eventThread` in event mode exactly as they came from `dmThread` in DM mode.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Chat/XaoMsgComponent.tsx
git commit -m "feat(xaomsg): XaoMsgComponent gains a draftId event-thread mode"
```

---

## Task 8: Rewire `create-contract.tsx` onto the event thread

**Files:**
- Modify: `src/pages/contracts/create-contract.tsx`

**Interfaces:**
- Consumes: `useXaoEvent` (Task 5).

- [ ] **Step 1: Switch the Waku thread hook and its three send call sites**

In `src/pages/contracts/create-contract.tsx`:

Replace the import:

```ts
import { useXaoEvent } from "../../hooks/useXaoEvent";
```

(remove `import { useXaoDm } from "../../hooks/useXaoDm";`)

Replace the hook wiring block:

```ts
  // Waku session + event thread (this draft's own thread — never the DM
  // thread) for sending contract proposals and the mint SYSTEM message.
  const { session } = useXaoMsgSession();
  const eventThread = useXaoEvent({
    draftId,
    peer: peerAddress && peerAddress.startsWith('0x') ? (peerAddress as `0x${string}`) : null,
    session,
  });
  const isClientReady = eventThread.status === 'ready';

  // Keep refs to the latest postProposal/postSystem/notifyThread so
  // useEffect closures (below) always use the current event thread instead
  // of a stale one captured when the effect was first set up.
  const postProposalRef = useRef(eventThread.postProposal);
  postProposalRef.current = eventThread.postProposal;
  const postSystemRef = useRef(eventThread.postSystem);
  postSystemRef.current = eventThread.postSystem;
  const notifyThreadRef = useRef(eventThread.notifyThread);
  notifyThreadRef.current = eventThread.notifyThread;
```

In `handleSendProposal`, after the existing `await dmThread.postProposal({...})` call, rename it to `eventThread.postProposal` and publish the discovery notice right after:

```ts
      // Send the proposal
      await eventThread.postProposal({
        kind: activeProposal ? 'counter-proposal' : 'proposal',
        revisionNumber,
        data: termsObject,
      });

      // Let both parties discover this thread on next login even without
      // opening anything (spec §7) — idempotent, safe to call on every send.
      await eventThread.notifyThread().catch((err) => {
        console.warn('[CreateContract] Failed to publish event discovery notice:', err);
      });

      // Update revision number for next edit
      setRevisionNumber((prev) => prev + 1);
```

In the mint-success effect (`processContractCreation`), rename `postProposalRef.current`/`postSystemRef.current` calls unchanged in shape (they're already ref-based, so the rename happened above), and add a `notifyThreadRef.current(newContractAddress)` call right after the existing `postSystemRef.current(...)` mint-announcement call:

```ts
              await postProposalRef.current({
                kind: activeProposal ? 'counter-proposal' : 'proposal',
                revisionNumber,
                data: termsObject,
              });
              setRevisionNumber((prev) => prev + 1);

              await postSystemRef.current({
                kind: 'system', event: 'minted', draftId, contractAddress: newContractAddress,
              });

              // Publish the mint pairing to both inboxes — this is what lets
              // useResolveEventThread map this contract's address back to
              // this same thread later, on any device (spec §5, §7).
              await notifyThreadRef.current(newContractAddress).catch((err) => {
                console.warn('[CreateContract] Failed to publish mint notice:', err);
              });

              console.log("[CreateContract] Sent draft contract proposal + minted notice to party2");
```

In the sign-success effect (`processSignSuccess`), the existing `postProposalRef.current({...})` call (the one sending the signed contract's terms) stays as-is — no `notifyThread` call needed there, since the mint pairing was already published in the mint-success effect above and doesn't change on signing.

- [ ] **Step 2: Switch the embedded chat to event mode and add the `tab` query param**

Replace the `peer: peerParam` destructure at the top of the component:

```ts
  const { peer: peerParam, tab: tabParam } = router.query;
```

Add a small effect (near the existing `sessionStorage`/query-param effect) that honors an incoming `tab=chat` param (used when Search links here to open the draft's chat directly, per spec §7):

```ts
  useEffect(() => {
    if (tabParam === "chat") {
      setSelected("chat");
    }
  }, [tabParam]);
```

Replace the Chat-tab render call:

```tsx
            {selected === "chat" ? (
              <XaoMsgComponent
                draftId={draftId}
                peer={peerAddress && peerAddress.startsWith('0x') ? (peerAddress as `0x${string}`) : null}
                embedded={true}
                onContractProposalSelect={handleContractProposalSelect}
              />
            ) : (
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification (UI change — per project convention, browser-check before claiming done)**

```bash
pgrep -af "next dev|yarn dev" || echo "No dev server running"
```

If no dev server is running, start one (`yarn dev`) and wait for it to be ready. Using two connected wallets (or the existing `ENABLE_DUMMY_DATA` party2 fallback), verify:
1. Composing and sending a new contract proposal succeeds and the Chat tab shows it as a system line.
2. The counterparty (or a second browser/session) receives the proposal in their own Chat tab, not in their DM conversation with the sender.
3. Sending free text in the Chat tab while a draft is open round-trips correctly.
4. Minting completes without error and the "minted" system line appears.

- [ ] **Step 5: Commit**

```bash
git add src/pages/contracts/create-contract.tsx
git commit -m "feat(xaomsg): rewire create-contract.tsx onto the per-draft event thread"
```

---

## Task 9: Generalize `syncAllKnownThreads` for event notices and mint pairing

**Files:**
- Modify: `src/lib/xaomsg/sync.ts`
- Modify: `src/lib/xaomsg/sync.test.ts`

**Interfaces:**
- Consumes: `threadIdForDraft` (Task 1), `deriveEventConversationKeyRaw` (Task 2), `ThreadNotice`/`queryInboxNotices` (Task 3), `recordMint`/`loadDraft` (existing `offchainContracts.ts`, unchanged), `applyDraftMessage` (existing `draftSync.ts`, unchanged).
- Produces: same `syncAllKnownThreads(myAddress, session): Promise<void>` signature as before.

This task removes the old "enumerate locally-known drafts to find DM peers to backfill" loop — that existed only because drafts used to live inside DM threads. Drafts now discover and backfill their own event thread directly from `event`-kind inbox notices, which also fixes the old chicken-and-egg limitation (a draft no longer needs to already be known locally before it can be backfilled).

- [ ] **Step 1: Write the failing/updated tests**

Replace `src/lib/xaomsg/sync.test.ts` in full:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address, Hex } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

vi.mock('./waku', () => ({
  publishToTopic: vi.fn(async () => {}),
  subscribeToTopic: vi.fn(),
  queryHistory: vi.fn(async () => {}),
}));
vi.mock('./inbox', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./inbox')>();
  return {
    ...actual,
    publishKeyBundle: vi.fn(async () => {}),
    queryInboxNotices: vi.fn(async () => {}),
    queryPeerKeyBundle: vi.fn(async () => null),
  };
});

import { syncAllKnownThreads } from './sync';
import { queryHistory } from './waku';
import { publishKeyBundle, queryInboxNotices, queryPeerKeyBundle } from './inbox';
import { deriveDmConversationKeyRaw, deriveEventConversationKeyRaw } from './ecies';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';
import { contentTopicForThread } from './topicId';
import { saveConversationKeyRaw, generateRawConversationKey, importAesKey } from './conversationKey';
import { encryptBody } from './crypto';
import { buildUnsignedBody, buildEnvelope } from './envelope';
import { createSessionKeypair, mintSessionCert } from './session';
import { upsertDraft, loadDraft } from './offchainContracts';
import { loadConversations } from './conversationStore';
import { ContentType, type ProposalPayload, type SystemPayload } from './types';
import type { PersistedSession } from './session';

type Account = ReturnType<typeof privateKeyToAccount>;

async function makeSession(account: Account): Promise<PersistedSession> {
  const kp = await createSessionKeypair();
  const cert = await mintSessionCert({
    walletAddress: account.address,
    sessionPublicKeyHex: kp.publicKey,
    expiresAtUnixMs: Date.now() + 60 * 60 * 1000,
    chainId: 84532,
    signMessage: (message) => account.signMessage({ message }),
  });
  return { cert, privateKeyHex: kp.privateKey };
}

async function encryptedDmProposalBytes(
  threadId: Hex, threadKey: CryptoKey, senderAccount: Account, draftId: string, revisionNumber: number,
): Promise<Uint8Array> {
  const senderSession = await makeSession(senderAccount);
  const payload: ProposalPayload = { kind: 'proposal', revisionNumber, data: { draftId } };
  const body = buildUnsignedBody({
    threadId, contentType: ContentType.PROPOSAL, payload, parentHash: ('0x' + '00'.repeat(32)) as Hex, sender: senderAccount.address,
  });
  const envelope = await buildEnvelope(body, senderSession.privateKeyHex, senderSession.cert);
  const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
  return new TextEncoder().encode(ciphertextB64);
}

async function encryptedEventBytes(
  threadId: Hex, threadKey: CryptoKey, senderAccount: Account, contentType: ContentType, payload: ProposalPayload | SystemPayload,
): Promise<Uint8Array> {
  const senderSession = await makeSession(senderAccount);
  const body = buildUnsignedBody({
    threadId, contentType, payload, parentHash: ('0x' + '00'.repeat(32)) as Hex, sender: senderAccount.address,
  });
  const envelope = await buildEnvelope(body, senderSession.privateKeyHex, senderSession.cert);
  const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
  return new TextEncoder().encode(ciphertextB64);
}

describe('syncAllKnownThreads', () => {
  let myAccount: Account;
  let peerAccount: Account;
  let MY: Address;
  let PEER: Address;

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(queryHistory).mockReset().mockImplementation(async () => {});
    vi.mocked(publishKeyBundle).mockReset().mockImplementation(async () => {});
    vi.mocked(queryInboxNotices).mockReset().mockImplementation(async () => {});
    vi.mocked(queryPeerKeyBundle).mockReset().mockImplementation(async () => null);
    myAccount = privateKeyToAccount(generatePrivateKey());
    peerAccount = privateKeyToAccount(generatePrivateKey());
    MY = myAccount.address;
    PEER = peerAccount.address;
  });

  it('discovers a new DM peer via a dm-kind inbox notice and backfills its thread', async () => {
    const threadId = dmThreadId(MY, PEER);
    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const rawKey = await deriveDmConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex);
    const threadKey = await importAesKey(rawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'dm', from: PEER, threadId, ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const bytes = await encryptedDmProposalBytes(threadId, threadKey, peerAccount, 'unused', 1);
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(bytes);
    });

    await syncAllKnownThreads(MY, session);

    expect(loadConversations(MY).some((c) => c.peer.toLowerCase() === PEER.toLowerCase())).toBe(true);
    expect(publishKeyBundle).toHaveBeenCalledWith(session.cert);
  });

  it('discovers a new draft via an event-kind inbox notice and backfills its own thread', async () => {
    const draftId = 'draft-new';
    const threadId = threadIdForDraft(draftId);
    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const rawKey = await deriveEventConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex, draftId);
    const threadKey = await importAesKey(rawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'event', from: PEER, threadId, draftId, ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const proposalBytes = await encryptedEventBytes(
      threadId, threadKey, peerAccount, ContentType.PROPOSAL,
      { kind: 'proposal', revisionNumber: 1, data: { draftId } } as ProposalPayload,
    );
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(proposalBytes);
    });

    // Fresh device: this draft is not locally known before sync runs.
    expect(loadDraft(draftId)).toBeNull();

    await syncAllKnownThreads(MY, session);

    expect(loadDraft(draftId)?.revisionNumber).toBe(1);
  });

  it('records a mint pairing from the notice immediately, for a draft already known locally', async () => {
    const draftId = 'draft-known';
    const threadId = threadIdForDraft(draftId);
    const contractAddress = '0x3333333333333333333333333333333333333333' as Address;
    upsertDraft({
      draftId, party1: MY, party2: PEER, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now(),
    });

    const session = await makeSession(myAccount);
    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'event', from: PEER, threadId, draftId, contractAddress, ts: Date.now() });
    });
    // No key bundle available for the peer — backfill will no-op, but the
    // immediate mint-pairing record from the notice itself must still land.
    vi.mocked(queryPeerKeyBundle).mockImplementation(async () => null);

    await syncAllKnownThreads(MY, session);

    expect(loadDraft(draftId)?.mintedContractAddress?.toLowerCase()).toBe(contractAddress.toLowerCase());
  });

  it('a failure backfilling one event thread does not block a DM peer backfill', async () => {
    const draftId = 'draft-fails';
    const eventThreadId = threadIdForDraft(draftId);
    const dmThreadIdVal = dmThreadId(MY, PEER);

    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const dmRawKey = await deriveDmConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex);
    const dmThreadKey = await importAesKey(dmRawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'event', from: PEER, threadId: eventThreadId, draftId, ts: Date.now() });
      onThreadNotice({ kind: 'dm', from: PEER, threadId: dmThreadIdVal, ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const dmTopic = contentTopicForThread(dmThreadIdVal);
    const eventTopic = contentTopicForThread(eventThreadId);
    const dmBytes = await encryptedDmProposalBytes(dmThreadIdVal, dmThreadKey, peerAccount, 'unused', 1);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === eventTopic) throw new Error('simulated network failure');
      if (topic === dmTopic) await onMessage(dmBytes);
    });

    await expect(syncAllKnownThreads(MY, session)).resolves.toBeUndefined();
    expect(loadConversations(MY).some((c) => c.peer.toLowerCase() === PEER.toLowerCase())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/xaomsg/sync.test.ts`
Expected: FAIL — `queryInboxNotices`'s mock callback is invoked with `kind`-less/old-shape notices the current `syncAllKnownThreads` doesn't yet branch on, and `threadIdForDraft`-based event backfill doesn't exist yet.

- [ ] **Step 3: Implement the generalized sync**

Replace `src/lib/xaomsg/sync.ts` in full:

```ts
// src/lib/xaomsg/sync.ts
import type { Address } from 'viem';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';
import { contentTopicForThread } from './topicId';
import { queryHistory } from './waku';
import { decryptBody } from './crypto';
import { verifyEnvelope, computeBodyHash } from './envelope';
import { loadConversationKeyRaw, saveConversationKeyRaw, importAesKey } from './conversationKey';
import { publishKeyBundle, queryInboxNotices, queryPeerKeyBundle, type ThreadNotice } from './inbox';
import { deriveDmConversationKeyRaw, deriveEventConversationKeyRaw } from './ecies';
import { upsertConversation } from './conversationStore';
import { loadDraft, recordMint } from './offchainContracts';
import { applyDraftMessage, type ProposalHashIndex } from './draftSync';
import type { OnWireEnvelope, ResolvedMessage } from './types';
import type { PersistedSession } from './session';

/** Same decode -> decrypt -> verify pipeline useXaoThread uses for live/store
 *  messages, lifted out so the headless sync can reuse it without mounting
 *  the hook. Returns null for anything that fails to decrypt or verify —
 *  callers skip silently, matching useXaoThread's `onBytes` behavior. */
async function decodeResolvedMessage(
  bytes: Uint8Array, threadKey: CryptoKey, threadId: string,
): Promise<ResolvedMessage | null> {
  try {
    const b64 = new TextDecoder().decode(bytes);
    const plaintext = await decryptBody(b64, threadKey);
    const envelope = JSON.parse(plaintext) as OnWireEnvelope;
    if (!(await verifyEnvelope(envelope))) return null;
    if (envelope.body.threadId !== threadId) return null;
    return { envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now() };
  } catch {
    return null;
  }
}

async function ensureDmConversationKey(myAddress: Address, peer: Address, session: PersistedSession): Promise<void> {
  const threadId = dmThreadId(myAddress, peer);
  if (loadConversationKeyRaw(threadId)) return;
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return;
  const raw = await deriveDmConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex);
  saveConversationKeyRaw(threadId, raw);
}

async function backfillDmThread(myAddress: Address, peer: Address): Promise<void> {
  const threadId = dmThreadId(myAddress, peer);
  const rawKey = loadConversationKeyRaw(threadId);
  if (!rawKey) return;
  const threadKey = await importAesKey(rawKey);
  const contentTopic = contentTopicForThread(threadId);
  await queryHistory(contentTopic, async (bytes) => {
    // DM threads no longer carry contract content — just decode/verify to
    // keep the store peer's message flowing through the same pipeline; no
    // side effect is applied here (unlike the pre-refactor version).
    await decodeResolvedMessage(bytes, threadKey, threadId);
  });
}

async function ensureEventConversationKey(peer: Address, draftId: string, session: PersistedSession): Promise<void> {
  const threadId = threadIdForDraft(draftId);
  if (loadConversationKeyRaw(threadId)) return;
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return;
  const raw = await deriveEventConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex, draftId);
  saveConversationKeyRaw(threadId, raw);
}

async function backfillEventThread(myAddress: Address, peer: Address, draftId: string): Promise<void> {
  const threadId = threadIdForDraft(draftId);
  const rawKey = loadConversationKeyRaw(threadId);
  if (!rawKey) return;
  const threadKey = await importAesKey(rawKey);
  const contentTopic = contentTopicForThread(threadId);
  const proposalHashIndex: ProposalHashIndex = new Map();
  await queryHistory(contentTopic, async (bytes) => {
    const resolved = await decodeResolvedMessage(bytes, threadKey, threadId);
    if (!resolved) return;
    applyDraftMessage(resolved, myAddress, peer, proposalHashIndex);
  });
}

/**
 * Runs once, right after a Waku session becomes ready (see /unlock-chat):
 * replays this wallet's own inbox to discover both DM peers and event
 * (draft) threads, then backfills every discovered thread so the DM
 * conversation list and the off-chain draft store are both caught up
 * without the user needing to open anything first.
 *
 * Best-effort throughout: failures are logged, never thrown, since the
 * caller has typically already navigated to /dashboard by the time this
 * settles. One thread's backfill failing never blocks another's.
 */
export async function syncAllKnownThreads(myAddress: Address, session: PersistedSession): Promise<void> {
  const dmPeers = new Set<string>();
  const events: { draftId: string; peer: string }[] = [];

  try {
    await publishKeyBundle(session.cert);
    await queryInboxNotices(myAddress, session.privateKeyHex, (notice: ThreadNotice) => {
      if (notice.kind === 'event') {
        if (!notice.draftId) return;
        // Record the mint pairing immediately if this draft is already known
        // locally — no need to wait for a full thread replay in that case.
        // If it isn't known locally yet (fresh device), the queued backfill
        // below creates it from the thread's own PROPOSAL/SYSTEM history.
        if (notice.contractAddress && loadDraft(notice.draftId)) {
          recordMint(notice.draftId, notice.contractAddress);
        }
        events.push({ draftId: notice.draftId, peer: notice.from });
        return;
      }
      upsertConversation(myAddress, {
        threadId: notice.threadId, peer: notice.from, lastActivityUnixMs: notice.ts, lastPreview: notice.preview,
      });
      dmPeers.add(notice.from.toLowerCase());
    });
  } catch (err) {
    console.warn('[xaomsg] sync: inbox backfill failed:', err);
  }

  await Promise.all([
    ...Array.from(dmPeers).map((peer) =>
      ensureDmConversationKey(myAddress, peer as Address, session)
        .then(() => backfillDmThread(myAddress, peer as Address))
        .catch((err) => {
          console.warn(`[xaomsg] sync: DM thread backfill failed for peer ${peer}:`, err);
        }),
    ),
    ...events.map((e) =>
      ensureEventConversationKey(e.peer as Address, e.draftId, session)
        .then(() => backfillEventThread(myAddress, e.peer as Address, e.draftId))
        .catch((err) => {
          console.warn(`[xaomsg] sync: event thread backfill failed for draft ${e.draftId}:`, err);
        }),
    ),
  ]);
}
```

Note: the old "enumerate `listDrafts()` to find DM peers to backfill" loop is gone entirely — off-chain drafts are now discovered exclusively via `event`-kind inbox notices, not by already being present locally.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/xaomsg/sync.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Run the full unit suite**

Run: `yarn test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/xaomsg/sync.ts src/lib/xaomsg/sync.test.ts
git commit -m "feat(xaomsg): generalize syncAllKnownThreads for event notices + mint pairing"
```

---

## Task 10: `useXaoInbox` ignores event-kind notices

**Files:**
- Modify: `src/hooks/useXaoInbox.ts`

**Interfaces:**
- Consumes: `ThreadNotice` (Task 3).
- Produces: same `useXaoInbox(session): { conversations: ConversationRecord[] }` signature — behavior now explicitly DM-only.

- [ ] **Step 1: Modify `useXaoInbox.ts`**

Replace `src/hooks/useXaoInbox.ts` in full:

```ts
// src/hooks/useXaoInbox.ts
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import {
  publishKeyBundle, queryInboxNotices, subscribeInbox, type ThreadNotice,
} from '../lib/xaomsg/inbox';
import {
  loadConversations, upsertConversation, type ConversationRecord,
} from '../lib/xaomsg/conversationStore';
import type { PersistedSession } from '../lib/xaomsg/session';

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

    // Only dm-kind notices populate the DM conversation list — event
    // (draft/contract) notices are handled by useOffchainContracts /
    // sync.ts instead, so a draft never appears as a conversation here.
    const applyNotice = (n: ThreadNotice) => {
      if (n.kind !== 'dm') return;
      const owner = address as Address;
      const next = upsertConversation(owner, {
        threadId: n.threadId, peer: n.from, lastActivityUnixMs: n.ts, lastPreview: n.preview,
      });
      if (!cancelled) setConversations(next);
    };

    (async () => {
      try {
        await publishKeyBundle(session.cert);
      } catch (err) {
        console.warn('[xaomsg] key bundle publish failed:', err);
      }

      try {
        unsub = await subscribeInbox(address as Address, session.privateKeyHex, () => {}, applyNotice);
        if (cancelled) { await unsub(); return; }
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
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useXaoInbox.ts
git commit -m "refactor(xaomsg): useXaoInbox only reacts to dm-kind notices"
```

---

## Task 11: Search page — real contract data in the Events tab

**Files:**
- Modify: `src/pages/chat-Section/Search.tsx`

**Interfaces:**
- Consumes: `useAllContractsWithSummaries`/`ContractSummary` (existing `useGetContracts.ts`, unchanged), `useOffchainContracts`/`OffchainContractDraft` (existing, unchanged), `CONTRACT_MESSAGE_VERSION`/`ContractProposalMessage` (existing `types/contractMessage.ts`, unchanged).

- [ ] **Step 1: Replace the Events data source and click handling**

In `src/pages/chat-Section/Search.tsx`:

Replace the import block (drop `useGetUserNFTs`, add the real contract hooks):

```ts
import { useState, useEffect, useMemo } from "react";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import { DynamicConnectButton } from "@dynamic-labs/sdk-react-core";
import { useAllContractsWithSummaries } from "../../hooks/useGetContracts";
import { useOffchainContracts } from "../../hooks/useOffchainContracts";
import { useXaoMsgSession } from "../../hooks/useXaoMsgSession";
import { useXaoInbox } from "../../hooks/useXaoInbox";
import { useProfileCache, CachedProfile } from "../../contexts/ProfileCacheContext";
import { CONTRACT_MESSAGE_VERSION, type ContractProposalMessage } from "../../types/contractMessage";
```

Replace the `EventPreview` interface and the `ListItem` union:

```ts
interface EventPreview {
  id: string;
  type: "event";
  isOffchainDraft: boolean;
  contractAddress?: `0x${string}`;
  draftId?: string;
  party1: string;
  party2: string;
  eventName: string;
  venueName?: string;
  createdAt: Date;
  isSigned: boolean;
}

type ListItem = ConversationPreview | EventPreview;
```

Replace the token/event-loading section with the real contract merge (same pattern `Negotiation.tsx` already uses). Reuse the `chainId` variable Search.tsx already declares via its existing `const chainId = useChainId();` line — no new chain-reading hook needed:

```ts
  const { contracts, isLoading: isLoadingContracts } = useAllContractsWithSummaries(chainId);
  const { drafts } = useOffchainContracts(contracts);

  const myContracts = useMemo(() => {
    const myAddr = address?.toLowerCase();
    return contracts.filter(
      (c) => myAddr && (c.party1Address.toLowerCase() === myAddr || c.party2Address.toLowerCase() === myAddr),
    );
  }, [contracts, address]);

  const events: EventPreview[] = useMemo(() => {
    const onChain: EventPreview[] = myContracts.map((c) => ({
      id: `onchain-${c.contractAddress}`,
      type: "event" as const,
      isOffchainDraft: false,
      contractAddress: c.contractAddress,
      party1: c.party1Address,
      party2: c.party2Address,
      eventName: c.eventName,
      venueName: c.venueName,
      createdAt: new Date(),
      isSigned: c.party1Signed && c.party2Signed,
    }));
    const offChain: EventPreview[] = drafts.map((d) => ({
      id: `draft-${d.draftId}`,
      type: "event" as const,
      isOffchainDraft: true,
      draftId: d.draftId,
      party1: d.party1,
      party2: d.party2,
      eventName: (d.terms as { promotion?: { value?: string } }).promotion?.value || "Untitled draft",
      createdAt: new Date(d.lastActivityUnixMs),
      isSigned: false,
    }));
    return [...onChain, ...offChain];
  }, [myContracts, drafts]);
```

Remove the old `events`/`setEvents`/`isLoadingEvents` state and the `useEffect` that built `EventPreview[]` from `tokenIds` — `events` is now the `useMemo` above, not local state. Remove the now-unused `useGetUserNFTs`-derived `tokenIds`/`isLoadingTokenIds` variables and the `isConnected`-driven `setEvents([])` cleanup effect (the `useMemo` already naturally returns `[]` when `myContracts`/`drafts` are empty).

Update `isLoading`:

```ts
  const isLoading = isLoadingContracts;
```

Update the search-filter predicate for events (it referenced `item.terms`/`item.tokenId`, which no longer exist):

```ts
      if (item.type === "conversation") {
        return (
          item.peerAddress?.toLowerCase().includes(query) ||
          item.peerInboxId.toLowerCase().includes(query) ||
          item.lastMessage?.toLowerCase().includes(query)
        );
      } else {
        return (
          item.eventName.toLowerCase().includes(query) ||
          item.party1.toLowerCase().includes(query) ||
          item.party2.toLowerCase().includes(query)
        );
      }
```

Update the results-list click handler and the title/subtitle rendering:

```tsx
                  onClick={() => {
                    if (item.type === "conversation") {
                      const convo = item as ConversationPreview;
                      const peerParam = convo.peerAddress || convo.peerInboxId;
                      router.push(`/chat-Section/Chat?peer=${encodeURIComponent(peerParam)}`);
                    } else {
                      const eventItem = item as EventPreview;
                      if (eventItem.isOffchainDraft && eventItem.draftId) {
                        const myAddr = address?.toLowerCase();
                        const peer = eventItem.party1.toLowerCase() === myAddr ? eventItem.party2 : eventItem.party1;
                        const proposal: ContractProposalMessage = {
                          type: "contract-proposal",
                          version: CONTRACT_MESSAGE_VERSION,
                          data: {}, // XaoMsgComponent's draftId mode loads current terms from the draft store itself
                          sentAt: Date.now(),
                          proposedBy: peer,
                          revisionNumber: 0,
                        };
                        sessionStorage.setItem("selectedContractProposal", JSON.stringify(proposal));
                        router.push(`/contracts/create-contract?peer=${encodeURIComponent(peer)}&tab=chat`);
                      } else if (eventItem.contractAddress) {
                        router.push({
                          pathname: "/contracts/contracts-detail",
                          query: {
                            id: eventItem.contractAddress,
                            ticketsold: "0",
                            totalrevenue: "0",
                            source: "search",
                            party1: eventItem.party1,
                            party2: eventItem.party2,
                          },
                        });
                      }
                    }
                  }}
```

```tsx
                    <h3 className={docStyles.searchResultTitle}>
                      {item.type === "conversation"
                        ? getDisplayName((item as ConversationPreview).peerAddress || (item as ConversationPreview).peerInboxId)
                        : (item as EventPreview).eventName}
                    </h3>
                    <p className={docStyles.searchResultEvents}>
                      {item.type === "conversation"
                        ? (item as ConversationPreview).lastMessage || "No messages yet"
                        : (item as EventPreview).isOffchainDraft
                          ? "Draft — off-chain"
                          : (item as EventPreview).isSigned ? "Confirmed" : "Pending"}
                    </p>
```

The `tokenId.toString()` reference in the Time/Status block's `key={item.id}` area does not exist (it already used `item.id`, unaffected). No other change needed there.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

```bash
pgrep -af "next dev|yarn dev" || echo "No dev server running"
```

With a connected wallet that has at least one off-chain draft (created via Task 8's flow) and, if available, one on-chain contract:
1. Navigate to `/chat-Section/Search`, switch to the Events tab, confirm both the draft and the on-chain contract render with real names (not "Event #N").
2. Click the off-chain draft — confirm it opens `/contracts/create-contract` with `tab=chat` and lands on the Chat tab, showing the draft's negotiation history.
3. Click an on-chain contract (if present) — confirm it opens `contracts-detail` as before.
4. Confirm the Conversations tab still shows only DM conversations, with no draft/contract content mixed in.

- [ ] **Step 4: Commit**

```bash
git add src/pages/chat-Section/Search.tsx
git commit -m "feat(xaomsg): Search Events tab shows real on-chain + off-chain contract data"
```

---

## Task 12: `contracts-detail.tsx` resolves the event thread instead of always using the legacy thread

**Files:**
- Modify: `src/pages/contracts/contracts-detail.tsx`

**Interfaces:**
- Consumes: `useResolveEventThread` (Task 6).

- [ ] **Step 1: Wire the resolver**

In `src/pages/contracts/contracts-detail.tsx`, add the import:

```ts
import { useResolveEventThread } from "../../hooks/useResolveEventThread";
```

Near the existing `contractAddr` derivation, compute the counterparty and resolve the thread:

```ts
  const resolvedThread = useResolveEventThread(contractAddr ?? null);
  const myAddr = address?.toLowerCase();
  const counterparty = party1 && party2
    ? (party1.toLowerCase() === myAddr ? party2 : party1)
    : undefined;
```

Replace the embedded chat call (currently `<XaoMsgComponent showContract={contractAddr ?? null} embedded={true} />`):

```tsx
              {resolvedThread?.mode === 'draft' ? (
                <XaoMsgComponent
                  draftId={resolvedThread.draftId}
                  peer={counterparty && counterparty.startsWith('0x') ? (counterparty as `0x${string}`) : null}
                  embedded={true}
                />
              ) : (
                <XaoMsgComponent showContract={contractAddr ?? null} embedded={true} />
              )}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

```bash
pgrep -af "next dev|yarn dev" || echo "No dev server running"
```

1. Open a contract that was minted via Task 8's flow (so its draft has a recorded `mintedContractAddress`) from `contracts-detail`, confirm the Chat tab shows the full pre+post-mint history (not just messages sent after opening this page).
2. Open a contract that predates this change (or has no matching local draft) and confirm it still renders using the legacy path without erroring.

- [ ] **Step 4: Commit**

```bash
git add src/pages/contracts/contracts-detail.tsx
git commit -m "feat(xaomsg): contracts-detail.tsx resolves the continuous event thread when available"
```

---

## Task 13: Final regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `yarn test:unit`
Expected: PASS, all suites green — in particular `dmThreadId.test.ts`, `threadId.test.ts`, `ecies.test.ts`, `inbox.test.ts`, `sync.test.ts`, `offchainContracts.test.ts`, `draftSync.test.ts`, `conversationStore.test.ts`, `contactCard.test.ts`, `envelope.test.ts`, `merge.test.ts`, `session.test.ts`, `topicId.test.ts`, `inboxTopic.test.ts`, `conversationKey.test.ts`, `crypto.test.ts`.

- [ ] **Step 2: Full-repo typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the touched files**

Run: `npx eslint src/lib/xaomsg/threadId.ts src/lib/xaomsg/ecies.ts src/lib/xaomsg/inbox.ts src/lib/xaomsg/sync.ts src/hooks/useXaoDm.ts src/hooks/useXaoEvent.ts src/hooks/useResolveEventThread.ts src/hooks/useXaoInbox.ts src/components/Chat/XaoMsgComponent.tsx src/pages/contracts/create-contract.tsx src/pages/chat-Section/Search.tsx src/pages/contracts/contracts-detail.tsx`
Expected: no errors (warnings acceptable only if pre-existing/unrelated).

- [ ] **Step 4: Production build**

Run: `yarn build` (only if no dev server is currently using the port — check with `pgrep -af "next dev|yarn dev"` first, per this repo's CLAUDE.md)
Expected: build succeeds.

- [ ] **Step 5: Confirm the DM/event separation invariant end-to-end**

Using two connected wallets: send a DM between them, then separately create and send a draft contract between the same two wallets. Confirm in the UI that the draft's negotiation never appears in their DM conversation (`/chat-Section/Chat?peer=...`), and the DM's free-text messages never appear in the draft's Chat tab under `/contracts/create-contract`.

- [ ] **Step 6: Commit (if any cleanup was needed)**

```bash
git status
```

If Steps 1–5 required no code changes, there is nothing to commit — this task is verification-only. If any lint/type fixes were needed, commit them:

```bash
git add -A
git commit -m "chore(xaomsg): fix lint/type issues found in final regression pass"
```
