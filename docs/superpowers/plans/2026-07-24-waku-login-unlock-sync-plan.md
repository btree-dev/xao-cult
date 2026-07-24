# Waku Login-Triggered Unlock & Background Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move XaoMsg's session unlock from a manual, 24h, tab-scoped prompt to a 30-day, cross-restart session that auto-unlocks on a dedicated post-login page, and add a background sync so the Negotiation tab reflects shared contract drafts without a separate Chat visit.

**Architecture:** Extend `session.ts`'s existing storage/duration constants (localStorage, 30 days) with no shape changes to `PersistedSession`. Redirect the post-login flow through a new `/unlock-chat` page instead of straight to `/dashboard`. Extract the draft-message routing logic already living inside `useXaoDm`'s `onMessage` into a pure, React-free function so a new headless `syncAllKnownThreads` can reuse it to backfill both newly-discovered (via inbox topic) and already-known (via the local draft store) DM threads, called once from `/unlock-chat` right after a session becomes ready.

**Tech Stack:** Next.js (pages router), React 19, wagmi, `@dynamic-labs/sdk-react-core`, Waku light node (`@waku/sdk`), vitest + happy-dom for unit tests (no `@testing-library/react` in this repo — component-level pages are verified manually, matching existing convention: `XaoMsgComponent.tsx` and other page components have no test files).

## Global Constraints

- `SESSION_DURATION_MS` = `30 * 24 * 60 * 60 * 1000` (30 days), replacing the current 24h.
- Session storage backend is `localStorage`, not `sessionStorage`. Key scheme unchanged: `xao-msg-session-<wallet lowercased>`. `PersistedSession` shape unchanged: `{ cert, privateKeyHex }`.
- The headless sync (`syncAllKnownThreads`) only routes `PROPOSAL` / `COUNTER_PROPOSAL` / `ACCEPT` / `SYSTEM` content types into the off-chain draft store. `CONTACT_CARD` handling stays exclusively in the live `useXaoDm` hook (it needs `ProfileCacheContext.setProfile`, a React state setter — routing it through a headless module would race the `ProfileCacheProvider`'s own localStorage load/save cycle). This is a deliberate scope line, not an oversight — the goal is Negotiation tab freshness, not profile sync.
- No new npm dependencies. Tests use vitest + happy-dom, mocking `./waku` and `./inbox` the same way `src/lib/xaomsg/inbox.test.ts` already does.
- Auto-unlock on `/unlock-chat` fires for **all** wallet types (embedded and external) — no wallet-type branching.
- `clearSession(wallet)` already exists in `session.ts` and is intentionally **not** newly wired to a logout handler: `handleSignOut` (`src/backend/public-information-services/publicInfoServices.ts:77-86`) already runs `localStorage.clear()` (preserving only the profile cache) on sign-out, which — once session storage moves to `localStorage` in Task 1 — already wipes the session on logout for free.
- No task touches how pre-mint vs. post-mint contract sharing is keyed (`draftId` over the DM thread pre-mint, contract address post-mint) — verified during design against `useXaoDm.ts`/`create-contract.tsx`/`contracts-detail.tsx` that this already matches the requirement. Tasks 2-3 only add a second *reader* of that existing scheme (the headless backfill); they don't change how or where anything is written.

---

### Task 1: Session duration + storage migration

**Files:**
- Modify: `src/lib/xaomsg/session.ts:5` (duration constant), `src/lib/xaomsg/session.ts:99-127` (storage backend)
- Modify: `src/lib/xaomsg/types.ts:43-45` (stale "24h" doc comment)
- Test: `src/lib/xaomsg/session.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SESSION_DURATION_MS` (now 30 days), `loadSession(wallet): PersistedSession | null`, `saveSession(wallet, session): void`, `clearSession(wallet): void` — all now backed by `localStorage`. Signatures unchanged; every existing caller (`useXaoMsgSession.ts`) needs no changes.

- [ ] **Step 1: Write failing tests for the new duration and localStorage-backed storage**

Append to `src/lib/xaomsg/session.test.ts` (add these imports to the existing top-of-file import block and this new `describe` block at the end of the file):

```ts
// change the existing `import { describe, it, expect } from 'vitest';` to:
import { describe, it, expect, beforeEach, vi } from 'vitest';
// add to the existing import from './session':
import {
  createSessionKeypair,
  sessionChallengeString,
  mintSessionCert,
  verifySessionCert,
  isExpired,
  signWithSession,
  verifyWithSession,
  SESSION_DURATION_MS,
  loadSession,
  saveSession,
  clearSession,
  type PersistedSession,
} from './session';
import type { Address } from 'viem';
```

```ts
describe('session storage (localStorage-backed, 30-day duration)', () => {
  const WALLET = '0x000000000000000000000000000000000000dead' as Address;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('SESSION_DURATION_MS is 30 days', () => {
    expect(SESSION_DURATION_MS).toBe(30 * 24 * 60 * 60 * 1000);
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
        expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
        chainId: 84532,
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

  it('loadSession returns null for an expired persisted session', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        expiresAtUnixMs: Date.now() - 1000,
        chainId: 84532,
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    saveSession(WALLET, persisted);
    expect(loadSession(WALLET)).toBeNull();
  });

  it('clearSession removes the persisted entry', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
        chainId: 84532,
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
        expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
        chainId: 84532,
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

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test:unit session.test.ts`
Expected: FAIL — `SESSION_DURATION_MS` is still `24 * 60 * 60 * 1000` (first test fails), and the round-trip tests fail because `saveSession`/`loadSession` currently write/read `sessionStorage`, not `localStorage`.

- [ ] **Step 3: Update `session.ts` — duration constant and storage backend**

In `src/lib/xaomsg/session.ts`, change line 5:

```ts
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
```

Replace lines 106-127 (the `loadSession`/`saveSession`/`clearSession` block) with:

```ts
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
```

- [ ] **Step 4: Update the stale "24h" doc comment**

In `src/lib/xaomsg/types.ts`, replace lines 43-45:

```ts
/**
 * SessionCert authorises a session keypair on behalf of a wallet for a 24h window.
 * The wallet signs a fixed-format challenge string; verifiers ecrecover it.
 */
```

with:

```ts
/**
 * SessionCert authorises a session keypair on behalf of a wallet until
 * `expiresAtUnixMs` (minted for `SESSION_DURATION_MS` — see session.ts).
 * The wallet signs a fixed-format challenge string; verifiers ecrecover it.
 */
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn test:unit session.test.ts`
Expected: PASS — all tests in `session.test.ts`, including the pre-existing ones (unaffected — they don't touch storage).

- [ ] **Step 6: Commit**

```bash
git add src/lib/xaomsg/session.ts src/lib/xaomsg/types.ts src/lib/xaomsg/session.test.ts
git commit -m "feat(xaomsg): extend session to 30 days, persist in localStorage"
```

---

### Task 2: Extract draft-message routing into a headless-reusable module

**Files:**
- Create: `src/lib/xaomsg/draftSync.ts`
- Modify: `src/hooks/useXaoDm.ts:1-24` (imports), `src/hooks/useXaoDm.ts:133-195` (`onMessage`)
- Test: `src/lib/xaomsg/draftSync.test.ts`

**Interfaces:**
- Consumes: `upsertDraft`, `recordApproval`, `recordMint` from `src/lib/xaomsg/offchainContracts.ts` (existing, unchanged signatures).
- Produces: `applyDraftMessage(resolved: ResolvedMessage, myAddress: Address, peer: Address, proposalHashIndex: ProposalHashIndex): void` and `type ProposalHashIndex = Map<Hex, string>` — consumed by both `useXaoDm.ts` (this task) and `sync.ts` (Task 3).

- [ ] **Step 1: Write the failing test for `applyDraftMessage`**

Create `src/lib/xaomsg/draftSync.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { Address, Hex } from 'viem';
import { applyDraftMessage, type ProposalHashIndex } from './draftSync';
import { loadDraft } from './offchainContracts';
import { ContentType, type ResolvedMessage } from './types';

const ALICE = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address;
const BOB = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb' as Address;

function makeResolved(overrides: {
  contentType: ContentType;
  payload: unknown;
  sender: Address;
  sentAt?: number;
  bodyHash?: Hex;
}): ResolvedMessage {
  return {
    envelope: {
      body: {
        v: 1,
        messageId: ('0x' + '11'.repeat(32)) as Hex,
        threadId: ('0x' + '22'.repeat(32)) as Hex,
        contentType: overrides.contentType,
        parentHash: ('0x' + '00'.repeat(32)) as Hex,
        payload: overrides.payload as never,
        sentAt: overrides.sentAt ?? Date.now(),
        sender: overrides.sender,
      },
      payloadHash: ('0x' + '33'.repeat(32)) as Hex,
      signature: ('0x' + '44'.repeat(64)) as Hex,
      cert: {
        v: 1,
        walletAddress: overrides.sender,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        expiresAtUnixMs: Date.now() + 1000,
        chainId: 84532,
        walletSignature: ('0x' + 'cd'.repeat(65)) as Hex,
      },
    },
    bodyHash: overrides.bodyHash ?? (('0x' + '55'.repeat(32)) as Hex),
    receivedAtUnixMs: Date.now(),
  };
}

describe('applyDraftMessage', () => {
  beforeEach(() => localStorage.clear());

  it('PROPOSAL upserts a draft keyed by the payload draftId', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1', promotion: { value: 'Show' } } },
      sender: ALICE,
    });
    applyDraftMessage(resolved, BOB, ALICE, index);
    const draft = loadDraft('d1');
    expect(draft?.revisionNumber).toBe(1);
    expect([draft?.party1, draft?.party2].map((a) => a?.toLowerCase())).toEqual(
      [ALICE, BOB].map((a) => a.toLowerCase()).sort(),
    );
  });

  it('PROPOSAL records the bodyHash -> draftId mapping for later ACCEPT resolution', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } },
      sender: ALICE,
      bodyHash: ('0x' + '77'.repeat(32)) as Hex,
    });
    applyDraftMessage(resolved, BOB, ALICE, index);
    expect(index.get(('0x' + '77'.repeat(32)) as Hex)).toBe('d1');
  });

  it('ACCEPT records an approval against the draft its proposalHash maps to', () => {
    const index: ProposalHashIndex = new Map();
    const proposalHash = ('0x' + '77'.repeat(32)) as Hex;
    // Seed the draft via a real PROPOSAL first, using `proposalHash` as its
    // own bodyHash — this is what populates the index entry ACCEPT resolves.
    applyDraftMessage(
      makeResolved({
        contentType: ContentType.PROPOSAL,
        payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } },
        sender: ALICE,
        bodyHash: proposalHash,
      }),
      BOB, ALICE, index,
    );
    const accept = makeResolved({
      contentType: ContentType.ACCEPT,
      payload: { kind: 'accept', proposalHash },
      sender: ALICE,
    });
    applyDraftMessage(accept, BOB, ALICE, index);
    expect(loadDraft('d1')?.approvals.map((a) => a.toLowerCase())).toEqual([ALICE.toLowerCase()]);
  });

  it('ACCEPT with an unknown proposalHash is a no-op', () => {
    const index: ProposalHashIndex = new Map();
    const accept = makeResolved({
      contentType: ContentType.ACCEPT,
      payload: { kind: 'accept', proposalHash: ('0x' + '99'.repeat(32)) as Hex },
      sender: ALICE,
    });
    expect(() => applyDraftMessage(accept, BOB, ALICE, index)).not.toThrow();
  });

  it('SYSTEM minted event records the mint on the draft', () => {
    const index: ProposalHashIndex = new Map();
    applyDraftMessage(
      makeResolved({ contentType: ContentType.PROPOSAL, payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } }, sender: ALICE }),
      BOB, ALICE, index,
    );
    const CONTRACT = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    const system = makeResolved({
      contentType: ContentType.SYSTEM,
      payload: { kind: 'system', event: 'minted', draftId: 'd1', contractAddress: CONTRACT },
      sender: ALICE,
    });
    applyDraftMessage(system, BOB, ALICE, index);
    expect(loadDraft('d1')?.mintedContractAddress).toBe(CONTRACT);
  });

  it('a PROPOSAL with no draftId in its payload is ignored', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: {} },
      sender: ALICE,
    });
    expect(() => applyDraftMessage(resolved, BOB, ALICE, index)).not.toThrow();
    expect(index.size).toBe(0);
  });
});
```

This is the complete, final content of `draftSync.test.ts` — write it exactly as above.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit draftSync.test.ts`
Expected: FAIL with "Cannot find module './draftSync'" (module doesn't exist yet).

- [ ] **Step 3: Create `draftSync.ts`**

Create `src/lib/xaomsg/draftSync.ts`:

```ts
// src/lib/xaomsg/draftSync.ts
import type { Address, Hex } from 'viem';
import { upsertDraft, recordApproval, recordMint } from './offchainContracts';
import {
  ContentType, type AcceptPayload, type ProposalPayload, type ResolvedMessage, type SystemPayload,
} from './types';

/** Mutable per-replay correlation from a PROPOSAL/COUNTER_PROPOSAL's own
 *  bodyHash to the draftId it carries, so a later ACCEPT (which only carries
 *  the proposalHash it approves) can be resolved to the right draft. Callers
 *  own one fresh Map per thread replay — mirrors useXaoDm's original
 *  per-hook-instance ref, just lifted out so a headless caller (sync.ts) can
 *  supply its own short-lived instance instead of a React ref. */
export type ProposalHashIndex = Map<Hex, string>;

/** Routes one resolved DM message into the off-chain draft store. Shared by
 *  useXaoDm's live onMessage handler and the headless sync in sync.ts, so a
 *  draft update is applied identically whether it arrives live or via
 *  backfill. Deliberately does not handle CONTACT_CARD — that stays in
 *  useXaoDm, which has access to ProfileCacheContext. */
export function applyDraftMessage(
  resolved: ResolvedMessage,
  myAddress: Address,
  peer: Address,
  proposalHashIndex: ProposalHashIndex,
): void {
  const { body, cert } = resolved.envelope;
  switch (body.contentType) {
    case ContentType.PROPOSAL:
    case ContentType.COUNTER_PROPOSAL: {
      const p = body.payload as ProposalPayload;
      const draftId = String((p.data as { draftId?: unknown }).draftId || '');
      if (!draftId) return;
      proposalHashIndex.set(resolved.bodyHash, draftId);
      const [party1, party2] = ([myAddress, peer] as Address[]).sort(
        (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
      ) as [Address, Address];
      upsertDraft({
        draftId, party1, party2, terms: p.data, revisionNumber: p.revisionNumber,
        approvals: [], lastActivityUnixMs: body.sentAt,
      });
      return;
    }
    case ContentType.ACCEPT: {
      const a = body.payload as AcceptPayload;
      const draftId = proposalHashIndex.get(a.proposalHash);
      if (draftId) recordApproval(draftId, cert.walletAddress);
      return;
    }
    case ContentType.SYSTEM: {
      const s = body.payload as SystemPayload;
      if (s.event === 'minted') recordMint(s.draftId, s.contractAddress);
      return;
    }
    default:
      return;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit draftSync.test.ts`
Expected: PASS — all 6 tests in `draftSync.test.ts`.

- [ ] **Step 5: Refactor `useXaoDm.ts` to use `applyDraftMessage`**

In `src/hooks/useXaoDm.ts`, replace the import block on lines 17-20:

```ts
import { upsertDraft, recordApproval, recordMint } from '../lib/xaomsg/offchainContracts';
import {
  ContentType, type AcceptPayload, type ContactCardPayload, type ProposalPayload, type ResolvedMessage, type SystemPayload,
} from '../lib/xaomsg/types';
```

with:

```ts
import { applyDraftMessage, type ProposalHashIndex } from '../lib/xaomsg/draftSync';
import {
  ContentType, type ContactCardPayload, type ResolvedMessage,
} from '../lib/xaomsg/types';
```

Replace lines 133-195 (the `draftByProposalHash` ref declaration through the end of `onMessage`) with:

```ts
  // proposalHash (a PROPOSAL/COUNTER_PROPOSAL's own bodyHash) -> draftId, so a
  // later ACCEPT (which only carries the proposalHash it approves) can be
  // applied to the right off-chain draft. Assumes causal order — an ACCEPT
  // can only ever reference a proposal that already exists, and Waku store
  // replay returns messages in order, so the map is always populated before
  // a referencing ACCEPT is processed.
  const draftByProposalHash = useRef<ProposalHashIndex>(new Map());

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
    applyDraftMessage(resolved, myAddress, peer, draftByProposalHash.current);
  };
```

- [ ] **Step 6: Run the full xaomsg test suite to confirm no regressions**

Run: `yarn test:unit`
Expected: PASS — every existing test in `src/lib/xaomsg/*.test.ts`, plus the new `draftSync.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/xaomsg/draftSync.ts src/lib/xaomsg/draftSync.test.ts src/hooks/useXaoDm.ts
git commit -m "refactor(xaomsg): extract draft-message routing into draftSync.ts"
```

---

### Task 3: Headless background sync (`syncAllKnownThreads`)

**Files:**
- Create: `src/lib/xaomsg/sync.ts`
- Test: `src/lib/xaomsg/sync.test.ts`

**Interfaces:**
- Consumes: `applyDraftMessage`, `type ProposalHashIndex` from Task 2's `draftSync.ts`; `dmThreadId` from `dmThreadId.ts`; `contentTopicForThread` from `topicId.ts`; `queryHistory` from `waku.ts`; `decryptBody` from `crypto.ts`; `verifyEnvelope`, `computeBodyHash` from `envelope.ts`; `loadConversationKeyRaw`, `importAesKey` from `conversationKey.ts`; `publishKeyBundle`, `queryInboxNotices` from `inbox.ts`; `upsertConversation` from `conversationStore.ts`; `listDrafts` from `offchainContracts.ts`; `type PersistedSession` from `session.ts`.
- Produces: `syncAllKnownThreads(myAddress: Address, session: PersistedSession): Promise<void>` — consumed by `/unlock-chat` in Task 4.

- [ ] **Step 1: Write the failing test for `syncAllKnownThreads`**

Create `src/lib/xaomsg/sync.test.ts`:

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
  return { ...actual, publishKeyBundle: vi.fn(async () => {}), queryInboxNotices: vi.fn(async () => {}) };
});

import { syncAllKnownThreads } from './sync';
import { queryHistory } from './waku';
import { publishKeyBundle, queryInboxNotices } from './inbox';
import { dmThreadId } from './dmThreadId';
import { contentTopicForThread } from './topicId';
import { saveConversationKeyRaw, generateRawConversationKey, importAesKey } from './conversationKey';
import { encryptBody } from './crypto';
import { buildUnsignedBody, buildEnvelope } from './envelope';
import { createSessionKeypair, mintSessionCert } from './session';
import { upsertDraft, loadDraft } from './offchainContracts';
import { loadConversations } from './conversationStore';
import { ContentType, type ProposalPayload } from './types';
import type { PersistedSession } from './session';

type Account = ReturnType<typeof privateKeyToAccount>;

/** Mints a real, signature-verifiable session cert for `account`, the same
 *  way the app does (mirrors inbox.test.ts's makeGenuineCertWithKey) — the
 *  cert's walletAddress and the signature must come from the SAME key, or
 *  verifySessionCert (which recovers the signer and compares it to
 *  walletAddress) rejects it outright. */
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

/** Builds the exact encrypted-bytes shape a peer's real `post()` would have
 *  published on the DM thread's content topic, so `syncAllKnownThreads`'s
 *  decode/decrypt/verify pipeline exercises the real code path. */
async function encryptedProposalBytes(
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
    myAccount = privateKeyToAccount(generatePrivateKey());
    peerAccount = privateKeyToAccount(generatePrivateKey());
    MY = myAccount.address;
    PEER = peerAccount.address;
  });

  it('backfills a known draft thread and upserts the newer revision', async () => {
    const threadId = dmThreadId(MY, PEER);
    const rawKey = generateRawConversationKey();
    saveConversationKeyRaw(threadId, rawKey);
    const threadKey = await importAesKey(rawKey);

    upsertDraft({
      draftId: 'd1', party1: MY, party2: PEER, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now(),
    });

    const bytes = await encryptedProposalBytes(threadId, threadKey, peerAccount, 'd1', 2);
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(bytes);
    });

    const session = await makeSession(myAccount);
    await syncAllKnownThreads(MY, session);

    expect(loadDraft('d1')?.revisionNumber).toBe(2);
  });

  it('discovers a new peer via an inbox notice and backfills its thread too', async () => {
    const threadId = dmThreadId(MY, PEER);
    const rawKey = generateRawConversationKey();
    const threadKey = await importAesKey(rawKey);
    const b64key = btoa(String.fromCharCode(...Array.from(rawKey)));

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onDmNotice) => {
      onDmNotice({ from: PEER, threadId, convKeyB64: b64key, ts: Date.now() });
    });

    const bytes = await encryptedProposalBytes(threadId, threadKey, peerAccount, 'd2', 1);
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(bytes);
    });

    const session = await makeSession(myAccount);
    await syncAllKnownThreads(MY, session);

    expect(loadConversations(MY).some((c) => c.peer.toLowerCase() === PEER.toLowerCase())).toBe(true);
    expect(loadDraft('d2')?.revisionNumber).toBe(1);
    expect(publishKeyBundle).toHaveBeenCalledWith(session.cert);
  });

  it('a failure backfilling one peer does not block others', async () => {
    const threadIdA = dmThreadId(MY, PEER);
    const otherAccount = privateKeyToAccount(generatePrivateKey());
    const otherPeer = otherAccount.address;
    const threadIdB = dmThreadId(MY, otherPeer);
    saveConversationKeyRaw(threadIdA, generateRawConversationKey());
    const rawKeyB = generateRawConversationKey();
    saveConversationKeyRaw(threadIdB, rawKeyB);
    const threadKeyB = await importAesKey(rawKeyB);

    upsertDraft({ draftId: 'dA', party1: MY, party2: PEER, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now() });
    upsertDraft({ draftId: 'dB', party1: MY, party2: otherPeer, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now() });

    const topicA = contentTopicForThread(threadIdA);
    const topicB = contentTopicForThread(threadIdB);
    const bytesB = await encryptedProposalBytes(threadIdB, threadKeyB, otherAccount, 'dB', 2);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === topicA) throw new Error('simulated network failure');
      if (topic === topicB) await onMessage(bytesB);
    });

    const session = await makeSession(myAccount);
    await expect(syncAllKnownThreads(MY, session)).resolves.toBeUndefined();
    expect(loadDraft('dB')?.revisionNumber).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit sync.test.ts`
Expected: FAIL with "Cannot find module './sync'" (module doesn't exist yet).

- [ ] **Step 3: Create `sync.ts`**

Create `src/lib/xaomsg/sync.ts`:

```ts
// src/lib/xaomsg/sync.ts
import type { Address } from 'viem';
import { dmThreadId } from './dmThreadId';
import { contentTopicForThread } from './topicId';
import { queryHistory } from './waku';
import { decryptBody } from './crypto';
import { verifyEnvelope, computeBodyHash } from './envelope';
import { loadConversationKeyRaw, saveConversationKeyRaw, importAesKey } from './conversationKey';
import { publishKeyBundle, queryInboxNotices } from './inbox';
import { upsertConversation } from './conversationStore';
import { listDrafts } from './offchainContracts';
import { applyDraftMessage, type ProposalHashIndex } from './draftSync';
import type { OnWireEnvelope, ResolvedMessage } from './types';
import type { PersistedSession } from './session';

function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

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

/** Backfills one DM thread's store history into the off-chain draft store.
 *  No-ops if we don't have the conversation key locally yet (nothing to
 *  decrypt with) — this only ever happens for a thread neither the inbox
 *  replay nor a prior live session has negotiated on this device. */
async function backfillThread(myAddress: Address, peer: Address): Promise<void> {
  const threadId = dmThreadId(myAddress, peer);
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
 * discovers new counterparty threads via the inbox topic, then backfills
 * every known draft's DM thread — pre-existing or newly discovered — so the
 * off-chain draft store (and therefore the Negotiation tab) is caught up
 * without the user needing to open Chat first.
 *
 * Best-effort throughout: failures are logged, never thrown, since the
 * caller has typically already navigated to /dashboard by the time this
 * settles. One peer's backfill failing never blocks another's.
 */
export async function syncAllKnownThreads(myAddress: Address, session: PersistedSession): Promise<void> {
  const peers = new Set<string>();

  try {
    await publishKeyBundle(session.cert);
    await queryInboxNotices(myAddress, session.privateKeyHex, (notice) => {
      if (!loadConversationKeyRaw(notice.threadId)) {
        saveConversationKeyRaw(notice.threadId, b64decode(notice.convKeyB64));
      }
      upsertConversation(myAddress, {
        threadId: notice.threadId, peer: notice.from, lastActivityUnixMs: notice.ts, lastPreview: notice.preview,
      });
      peers.add(notice.from.toLowerCase());
    });
  } catch (err) {
    console.warn('[xaomsg] sync: inbox backfill failed:', err);
  }

  const myLower = myAddress.toLowerCase();
  for (const draft of listDrafts()) {
    const p1 = draft.party1.toLowerCase();
    const p2 = draft.party2.toLowerCase();
    if (p1 !== myLower && p2 !== myLower) continue;
    peers.add(p1 === myLower ? p2 : p1);
  }

  await Promise.all(
    Array.from(peers).map((peer) =>
      backfillThread(myAddress, peer as Address).catch((err) => {
        console.warn(`[xaomsg] sync: thread backfill failed for peer ${peer}:`, err);
      }),
    ),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit sync.test.ts`
Expected: PASS — all 3 tests in `sync.test.ts`.

- [ ] **Step 5: Run the full test suite**

Run: `yarn test:unit`
Expected: PASS — everything, including Tasks 1-2's tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/xaomsg/sync.ts src/lib/xaomsg/sync.test.ts
git commit -m "feat(xaomsg): add headless syncAllKnownThreads for login-triggered backfill"
```

---

### Task 4: `/unlock-chat` page wired into the login redirect

**Files:**
- Create: `src/pages/unlock-chat.tsx`
- Modify: `src/pages/index.tsx:16`
- Modify: `src/styles/Home.module.css` (add `.unlockErrorBox`)

**Interfaces:**
- Consumes: `useXaoMsgSession()` from `src/hooks/useXaoMsgSession.ts` (existing, unchanged — `{ session, isUnlocking, error, unlock }`); `syncAllKnownThreads(myAddress, session)` from Task 3's `sync.ts`; `useDynamicContext()` from `@dynamic-labs/sdk-react-core`; `useAccount()` from `wagmi`.
- Produces: route `/unlock-chat`, the new post-login landing page.

No automated test for this task: this repo has no `@testing-library/react` and no existing `.test.tsx` files (verified — every xaomsg test file tests plain `.ts` modules; `XaoMsgComponent.tsx`, which has equivalent unlock-button logic, has no test file either). Adding a new component-testing framework for one page is out of proportion to this change. Verification is manual, via the dev server, per Step 5 below — consistent with this project's `xaomsg-live-testing-lessons` history that live testing catches things static/unit checks don't (StrictMode races, real wallet signature flows).

- [ ] **Step 1: Add the error-state CSS class**

Append to `src/styles/Home.module.css`:

```css
.unlockErrorBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #fff;
  text-align: center;
  max-width: 400px;
  padding: 0 24px;
}
```

- [ ] **Step 2: Create `src/pages/unlock-chat.tsx`**

```tsx
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAccount } from 'wagmi';
import styles from '../styles/Home.module.css';
import ccStyles from '../styles/CreateContract.module.css';
import { useXaoMsgSession } from '../hooks/useXaoMsgSession';
import { syncAllKnownThreads } from '../lib/xaomsg/sync';

const UnlockChat: NextPage = () => {
  const router = useRouter();
  const { user: dynamicUser } = useDynamicContext();
  const { address } = useAccount();
  const { session, isUnlocking, error, unlock } = useXaoMsgSession();
  const attemptedRef = useRef(false);
  const syncStartedRef = useRef(false);

  // No wallet connected (direct nav, stale bookmark) — nothing to unlock.
  useEffect(() => {
    if (!dynamicUser) router.replace('/');
  }, [dynamicUser, router]);

  // Auto-fire the unlock signature exactly once, for any wallet type, as
  // soon as we know there's no already-valid session to reuse.
  useEffect(() => {
    if (!address || session) return;
    if (attemptedRef.current || isUnlocking) return;
    attemptedRef.current = true;
    void unlock();
  }, [address, session, isUnlocking, unlock]);

  // Once a session is ready — whether it was already valid on mount or was
  // just freshly signed above — kick off the background sync once and move
  // on immediately. Sync results land in the Negotiation tab whenever they
  // arrive; nothing here waits on it.
  useEffect(() => {
    if (!address || !session || syncStartedRef.current) return;
    syncStartedRef.current = true;
    void syncAllKnownThreads(address, session).catch((err) => {
      console.warn('[xaomsg] background sync failed:', err);
    });
    router.replace('/dashboard');
  }, [address, session, router]);

  const handleRetry = () => {
    attemptedRef.current = true;
    void unlock();
  };

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>XAO Cult</title>
        <meta content="Unlocking XaoMsg chat" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <main className={styles.main}>
        {error ? (
          <div className={styles.unlockErrorBox}>
            <div>Couldn&apos;t unlock chat: {error}</div>
            <button className={ccStyles.confirmButton} onClick={handleRetry} disabled={isUnlocking}>
              {isUnlocking ? 'Signing…' : 'Try again'}
            </button>
          </div>
        ) : (
          <div className={styles.navOverlay}>
            <div className={styles.navSpinner} />
          </div>
        )}
      </main>
    </div>
  );
};

export default UnlockChat;
```

- [ ] **Step 3: Point the post-login redirect at `/unlock-chat`**

In `src/pages/index.tsx`, change line 16:

```ts
      router.push('/dashboard');
```

to:

```ts
      router.push('/unlock-chat');
```

- [ ] **Step 4: Run the full test suite and lint**

Run: `yarn test:unit`
Expected: PASS — no test touches `unlock-chat.tsx` or `index.tsx`, so this is a regression check only.

Run: `npx eslint src/pages/unlock-chat.tsx src/pages/index.tsx src/hooks/useXaoDm.ts src/lib/xaomsg/session.ts src/lib/xaomsg/draftSync.ts src/lib/xaomsg/sync.ts src/lib/xaomsg/types.ts`
Expected: no errors.

- [ ] **Step 5: Manual verification via the dev server**

Check for a running dev server first (`pgrep -af "next dev|yarn dev" || echo "No dev server running"`); start one with `yarn dev` only if none is running.

Walk through, in a browser with a test wallet:
1. **Fresh login, no prior session:** clear `localStorage`/`sessionStorage` for the site, log in via Dynamic. Confirm you land on `/unlock-chat`, see the spinner, get a signature prompt, and land on `/dashboard` automatically after signing — no manual "Unlock chat" click anywhere in this path.
2. **Second login within 30 days:** reload/relaunch the app while still logged in (or log out and back in without clearing storage). Confirm `/unlock-chat` flashes briefly (or is imperceptible) and you land on `/dashboard` with **no** signature prompt.
3. **Signature rejection:** trigger the flow, reject the wallet signature request. Confirm you stay on `/unlock-chat`, see the error and a "Try again" button, and clicking it re-prompts.
4. **Negotiation tab freshness:** from a second wallet/browser profile, send a contract proposal to the test wallet while it's logged out. Log the test wallet back in, and without visiting Chat, navigate straight to Contracts → Negotiation. Confirm the new draft appears.
5. **Direct navigation guard:** with no wallet connected, navigate directly to `/unlock-chat`. Confirm it redirects to `/`.

Report any deviation before proceeding to commit.

- [ ] **Step 6: Commit**

```bash
git add src/pages/unlock-chat.tsx src/pages/index.tsx src/styles/Home.module.css
git commit -m "feat(xaomsg): auto-unlock chat and sync on a new post-login page"
```
