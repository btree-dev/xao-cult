# XaoMsg Phase 2 — Plan 2: Contact Cards, Off-Chain Contracts & XMTP Removal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ride contact-card exchange and off-chain contract negotiation over the same encrypted Waku DM channel Plan 1 built, wire them into the Profile cache and the Negotiation page, then delete the XMTP stack entirely so Waku is the app's only messaging transport.

**Architecture:** Plan 1 gave every DM pair an encrypted, wallet-authenticated `useXaoThread` pipeline (subscribe → decrypt → verify → merge) carrying `TEXT`/`PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT`/`REJECT` content types. This plan (a) adds a sixth content type, `CONTACT_CARD`; (b) generalizes `useXaoThread` with a `postContactCard`/`postAccept`/`postReject`/`postSystem` API and an `onMessage` side-effect hook so a caller can route by content type without `useXaoThread` itself knowing about profile caching or contract drafts; (c) wires `useXaoDm` to that hook — contact cards update `ProfileCacheContext`, contract proposals/approvals update a new localStorage-backed off-chain contract store; (d) renders every non-`TEXT` type as a muted, centered system line instead of a chat bubble; (e) merges the off-chain store into the Negotiation page and rewires `create-contract.tsx`'s XMTP proposal-sending to Waku; (f) deletes the (already flag-disabled) XMTP stack as the final task, once nothing depends on it.

**Tech Stack:** Next.js 15 + wagmi + viem; existing `@waku/sdk`, `@noble/secp256k1`/`@noble/hashes`, Web Crypto AES-GCM, Vitest — all unchanged from Plan 1. No new dependencies.

## Global Constraints

- **`ContentType` values are locked and additive-only.** `TEXT=0, PROPOSAL=1, COUNTER_PROPOSAL=2, ACCEPT=3, REJECT=4, SYSTEM=5` already ship in Plan 1 — never renumber them. `CONTACT_CARD` is added as `6`.
- **All addresses lowercased** before hashing/keying/storing/comparing (existing convention — keep following it in every new file).
- **New localStorage keys:** `xao-cult-dm-cardsent` (per-thread "have I sent my contact card" flag), `xao-cult-offchain-contracts` (draft store, keyed by `draftId`).
- **`lib/xaomsg/*` files stay UI-framework-agnostic** — no imports from `src/contexts/*` or React. Adapt at the hook layer (`useXaoDm.ts`), not the lib layer. (`offchainContracts.ts` importing the plain `IContract` type from `backend/services/types/api` is fine — that's the same pattern `types/contractMessage.ts` already uses; it's a data-shape import, not a UI import.)
- **Off-chain drafts are `Partial<IContract>`, not a new shape.** `IContract` (`src/backend/services/types/api.ts:156`) has no top-level `eventName`; the create-contract form nests the event name at `terms.promotion?.value` (see `src/backend/contract-services/createContract.ts:39`) — that is what dedup-by-name must read.
- **No XMTP file is deleted before every page that uses it has been rewired.** Build Waku-side features and rewire pages first (Tasks 1–9); delete the XMTP stack last (Task 10), so nothing live breaks mid-migration. `NEXT_PUBLIC_USE_XAOMSG` is a dead flag by the end of Task 9 — Task 10 removes the remaining references.
- **Scope is plumbing + minimal UI only.** No unread-badge polish, no notification-center polish, no cold-DM spam control — these are explicitly out of scope per the locked design (`docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md` §12). Where the design says "or minimal stub," build the stub.
- **Tests:** `yarn test:unit` (Vitest, happy-dom). Hooks/components/pages have no existing unit-test harness (no `@testing-library/react` in this repo) — Plan 1 verified those tasks via `npx tsc --noEmit` + `npx eslint` + manual/live browser checks instead of automated tests. Follow the same split here: pure `lib/xaomsg/*` logic gets TDD'd with Vitest; hook/component/page tasks are typechecked, linted, and (where noted) manually verified.

---

## File Structure

**New (`src/lib/xaomsg/`):**
- `contactCard.ts` — build/apply a `ContactCardPayload`; localStorage "have I sent mine yet" flag per thread.
- `offchainContracts.ts` — off-chain contract draft store: upsert, list, approve, record-mint, on-chain-summary dedup match.

**New (`src/hooks/`):**
- `useOffchainContracts.ts` — read the store, filtered to the caller's contracts and to drafts not yet minted (matched against on-chain summaries).

**Modified:**
- `src/lib/xaomsg/types.ts` — add `ContentType.CONTACT_CARD`, `ContactCardPayload`, `SystemPayload`.
- `src/hooks/useXaoThread.ts` — add `postContactCard`/`postAccept`/`postReject`/`postSystem`; add an `onMessage` callback fired once per newly-merged message (dedup'd against the Waku self-echo).
- `src/hooks/useXaoDm.ts` — wire `onMessage` to `ProfileCacheContext.setProfile` (on `CONTACT_CARD`) and the off-chain store (on `PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT`); auto-send own contact card once per thread once the secure channel is ready.
- `src/components/Chat/XaoMsgComponent.tsx` — render `TEXT` as a bubble (unchanged) and every other content type as a muted, centered system line; wire the (currently dead) `onContractProposalSelect` callback so a proposal system line is clickable.
- `src/pages/chat-Section/Chat.tsx` — pass `onContractProposalSelect={handleContractProposalSelect}` to `XaoMsgComponent` (already defined, currently unused).
- `src/pages/contracts/Negotiation.tsx` — merge on-chain summaries with not-yet-minted off-chain drafts.
- `src/pages/contracts/create-contract.tsx` — replace `useXMTPConversation` with `useXaoDm`-based sending; the Chat tab renders `XaoMsgComponent` in `peer` mode (was contract-scoped `showContract` mode, which is unusable before a contract exists on-chain); send a `SYSTEM` "minted" message carrying `{ draftId, contractAddress }` right after a new `ShowContract` is deployed.
- `src/pages/contracts/contracts-detail.tsx` — drop the dead `ChatComponent`/`NEXT_PUBLIC_USE_XAOMSG` branch (already unconditionally reachable in practice since the flag is never unset — see Task 9) and the now-dead `peerAddress` memo.
- `src/styles/CreateContract.module.css` — add `.systemLine` / `.systemLineClickable`.
- `src/components/Navbar.tsx`, `src/components/FloatingNav.tsx` — drop the XMTP-backed unread badge (out of scope to replace this pass).
- `src/pages/chat-Section/Notification.tsx` — replace the XMTP conversation scan with a minimal stub (out of scope to rebuild on Waku this pass).
- `src/components/DynamicProviders.tsx` — remove `<XMTPProvider>`.
- `src/components/Chat/index.ts` — drop the `ChatComponent` export.
- `src/backend/legaldata.ts` — drop the XMTP mention from the privacy copy.
- `package.json` — remove `@xmtp/browser-sdk`.

**Deleted (Task 10 only):**
`src/contexts/XMTPContext.tsx`, `src/hooks/useXMTPClient.ts`, `src/hooks/useXMTPConversation.ts`, `src/lib/xmtp.ts`, `src/components/Chat/ChatComponent.tsx`, `src/components/RecipientSelector.tsx` (unused already — only self-referential).

**Untouched core:** `waku.ts`, `topicId.ts`, `dmThreadId.ts`, `inboxTopic.ts`, `ecies.ts`, `envelope.ts`, `crypto.ts`, `session.ts`, `merge.ts`, `conversationKey.ts`, `conversationStore.ts`, `inbox.ts`, `useXaoMsgSession.ts`, `useXaoInbox.ts`, `useXaoMsg.ts` (contract-scoped chat — still used by `contracts-detail.tsx` for chat about an already-deployed contract; out of scope to change). No `ContractNFT.sol` / `ShowContract.sol` change.

---

## Task 1: `ContentType.CONTACT_CARD` + `contactCard.ts`

**Files:**
- Modify: `src/lib/xaomsg/types.ts`
- Create: `src/lib/xaomsg/contactCard.ts`
- Test: `src/lib/xaomsg/contactCard.test.ts`

**Interfaces:**
- Produces: `ContentType.CONTACT_CARD = 6`; `ContactCardPayload { kind: 'contact-card'; walletAddress: Address; username: string; profilePictureUrl?: string; sentAt: number }`; `buildContactCardPayload(input: { walletAddress: Address; username: string; profilePictureUrl?: string }): ContactCardPayload`; `applyContactCard(payload: ContactCardPayload): { walletAddress: string; username: string; profilePictureUrl?: string; cachedAt: number }`; `hasSentContactCard(threadId: Hex): boolean`; `markContactCardSent(threadId: Hex): void`.
- Consumes: nothing new (pure functions + localStorage).

- [ ] **Step 1: Extend `ContentType` and `MessagePayload` in `types.ts`**

In `src/lib/xaomsg/types.ts`, change the enum and add the new payload type. Replace:

```ts
export enum ContentType {
  TEXT = 0,
  PROPOSAL = 1,
  COUNTER_PROPOSAL = 2,
  ACCEPT = 3,
  REJECT = 4,
  SYSTEM = 5,
}
```

with:

```ts
export enum ContentType {
  TEXT = 0,
  PROPOSAL = 1,
  COUNTER_PROPOSAL = 2,
  ACCEPT = 3,
  REJECT = 4,
  SYSTEM = 5,
  CONTACT_CARD = 6,
}
```

Then, immediately after the existing `RejectPayload` interface, add:

```ts
export interface ContactCardPayload {
  kind: 'contact-card';
  walletAddress: Address;
  username: string;
  profilePictureUrl?: string;
  sentAt: number;
}

/** `event: 'minted'` is the only case Plan 2 needs — a new ShowContract was
 *  deployed on-chain for an off-chain draft. Extend with more `event` values
 *  if a future phase needs other announcements on this channel. */
export interface SystemPayload {
  kind: 'system';
  event: 'minted';
  draftId: string;
  contractAddress: Address;
}
```

Finally, widen the union:

```ts
export type MessagePayload = TextPayload | ProposalPayload | AcceptPayload | RejectPayload | ContactCardPayload | SystemPayload;
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/xaomsg/contactCard.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { Address, Hex } from 'viem';
import {
  buildContactCardPayload, applyContactCard, hasSentContactCard, markContactCardSent,
} from './contactCard';

const ALICE = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address;
const THREAD_A = '0x1111111111111111111111111111111111111111111111111111111111111111' as unknown as Hex; // placeholder length fixed below

describe('contactCard', () => {
  beforeEach(() => localStorage.clear());

  it('buildContactCardPayload stamps kind and sentAt', () => {
    const before = Date.now();
    const payload = buildContactCardPayload({ walletAddress: ALICE, username: 'alice', profilePictureUrl: 'https://x/y.png' });
    expect(payload.kind).toBe('contact-card');
    expect(payload.walletAddress).toBe(ALICE);
    expect(payload.username).toBe('alice');
    expect(payload.profilePictureUrl).toBe('https://x/y.png');
    expect(payload.sentAt).toBeGreaterThanOrEqual(before);
  });

  it('buildContactCardPayload omits profilePictureUrl when not given', () => {
    const payload = buildContactCardPayload({ walletAddress: ALICE, username: 'alice' });
    expect(payload.profilePictureUrl).toBeUndefined();
  });

  it('applyContactCard maps a payload to a cache-shaped record with a fresh cachedAt', () => {
    const before = Date.now();
    const payload = buildContactCardPayload({ walletAddress: ALICE, username: 'alice', profilePictureUrl: 'https://x/y.png' });
    const applied = applyContactCard(payload);
    expect(applied).toEqual({
      walletAddress: ALICE,
      username: 'alice',
      profilePictureUrl: 'https://x/y.png',
      cachedAt: applied.cachedAt,
    });
    expect(applied.cachedAt).toBeGreaterThanOrEqual(before);
  });

  it('hasSentContactCard is false until markContactCardSent is called for that thread', () => {
    const threadId = '0x' + '11'.repeat(32) as Hex;
    expect(hasSentContactCard(threadId)).toBe(false);
    markContactCardSent(threadId);
    expect(hasSentContactCard(threadId)).toBe(true);
  });

  it('markContactCardSent is scoped per-thread and case-insensitive', () => {
    const threadA = '0x' + '22'.repeat(32) as Hex;
    const threadB = '0x' + '33'.repeat(32) as Hex;
    markContactCardSent(threadA);
    expect(hasSentContactCard(threadA)).toBe(true);
    expect(hasSentContactCard(threadB)).toBe(false);
    expect(hasSentContactCard(('0x' + '22'.repeat(32)).toUpperCase().replace('0X', '0x') as Hex)).toBe(true);
  });
});
```

(Delete the unused `THREAD_A` placeholder line — it was scratch, the real tests build their own thread IDs inline.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `yarn test:unit src/lib/xaomsg/contactCard.test.ts`
Expected: FAIL with "Cannot find module './contactCard'".

- [ ] **Step 4: Implement `contactCard.ts`**

```ts
// src/lib/xaomsg/contactCard.ts
import type { Address, Hex } from 'viem';
import type { ContactCardPayload } from './types';

export function buildContactCardPayload(input: {
  walletAddress: Address;
  username: string;
  profilePictureUrl?: string;
}): ContactCardPayload {
  return {
    kind: 'contact-card',
    walletAddress: input.walletAddress,
    username: input.username,
    profilePictureUrl: input.profilePictureUrl,
    sentAt: Date.now(),
  };
}

/** Shape-compatible with `ProfileCacheContext`'s `CachedProfile` (structurally,
 *  not by import — lib/xaomsg stays UI-context-free; the caller assigns this
 *  into `setProfile()`). */
export function applyContactCard(payload: ContactCardPayload): {
  walletAddress: string;
  username: string;
  profilePictureUrl?: string;
  cachedAt: number;
} {
  return {
    walletAddress: payload.walletAddress,
    username: payload.username,
    profilePictureUrl: payload.profilePictureUrl,
    cachedAt: Date.now(),
  };
}

// Once-per-thread "have I sent my contact card yet" flag. localStorage-backed
// so a remount/reload doesn't re-send it every time the DM thread key loads.
const SENT_LS_KEY = 'xao-cult-dm-cardsent';

function readSentSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(SENT_LS_KEY) || '[]') as string[]); }
  catch { return new Set(); }
}
function writeSentSet(s: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SENT_LS_KEY, JSON.stringify(Array.from(s)));
}

export function hasSentContactCard(threadId: Hex): boolean {
  return readSentSet().has(threadId.toLowerCase());
}

export function markContactCardSent(threadId: Hex): void {
  const s = readSentSet();
  s.add(threadId.toLowerCase());
  writeSentSet(s);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn test:unit src/lib/xaomsg/contactCard.test.ts`
Expected: PASS (5/5).

- [ ] **Step 6: Typecheck the whole project (the `types.ts` change is additive but touch every consumer)**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/xaomsg/types.ts src/lib/xaomsg/contactCard.ts src/lib/xaomsg/contactCard.test.ts
git commit -m "feat(xaomsg): CONTACT_CARD content type + contactCard.ts payload/flag helpers"
```

---

## Task 2: `offchainContracts.ts` — off-chain contract draft store

**Files:**
- Create: `src/lib/xaomsg/offchainContracts.ts`
- Test: `src/lib/xaomsg/offchainContracts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface OffchainContractDraft {
    draftId: string;
    party1: Address;
    party2: Address;
    terms: Partial<IContract>;
    revisionNumber: number;
    approvals: Address[];
    mintedContractAddress?: Address;
    lastActivityUnixMs: number;
  }
  function listDrafts(): OffchainContractDraft[];
  function loadDraft(draftId: string): OffchainContractDraft | null;
  function upsertDraft(next: OffchainContractDraft): OffchainContractDraft;
  function recordApproval(draftId: string, approver: Address): OffchainContractDraft | null;
  function recordMint(draftId: string, contractAddress: Address): OffchainContractDraft | null;
  function isMinted(draft: OffchainContractDraft, onChainSummaries: { party1Address: string; party2Address: string; eventName: string }[]): boolean;
  ```
- Consumes: `IContract` type from `../../backend/services/types/api` (type-only import).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/xaomsg/offchainContracts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { Address } from 'viem';
import {
  listDrafts, loadDraft, upsertDraft, recordApproval, recordMint, isMinted, type OffchainContractDraft,
} from './offchainContracts';

const ALICE = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address;
const BOB = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb' as Address;

function makeDraft(overrides: Partial<OffchainContractDraft> = {}): OffchainContractDraft {
  return {
    draftId: 'draft-1',
    party1: ALICE,
    party2: BOB,
    terms: { promotion: { value: 'Big Show' } } as any,
    revisionNumber: 1,
    approvals: [],
    lastActivityUnixMs: Date.now(),
    ...overrides,
  };
}

describe('offchainContracts', () => {
  beforeEach(() => localStorage.clear());

  it('upsertDraft stores a new draft; listDrafts returns it', () => {
    upsertDraft(makeDraft());
    const all = listDrafts();
    expect(all).toHaveLength(1);
    expect(all[0].draftId).toBe('draft-1');
  });

  it('loadDraft returns null for an unknown draftId', () => {
    expect(loadDraft('nope')).toBeNull();
  });

  it('upsertDraft: higher revisionNumber wins', () => {
    upsertDraft(makeDraft({ revisionNumber: 1, terms: { promotion: { value: 'v1' } } as any }));
    upsertDraft(makeDraft({ revisionNumber: 2, terms: { promotion: { value: 'v2' } } as any }));
    expect(loadDraft('draft-1')?.terms).toEqual({ promotion: { value: 'v2' } });
  });

  it('upsertDraft: a lower/stale revisionNumber does not overwrite', () => {
    upsertDraft(makeDraft({ revisionNumber: 2, terms: { promotion: { value: 'v2' } } as any }));
    upsertDraft(makeDraft({ revisionNumber: 1, terms: { promotion: { value: 'v1' } } as any }));
    expect(loadDraft('draft-1')?.terms).toEqual({ promotion: { value: 'v2' } });
  });

  it('recordApproval adds an approver without bumping revisionNumber', () => {
    upsertDraft(makeDraft({ revisionNumber: 3 }));
    const updated = recordApproval('draft-1', ALICE);
    expect(updated?.approvals.map((a) => a.toLowerCase())).toEqual([ALICE.toLowerCase()]);
    expect(updated?.revisionNumber).toBe(3);
  });

  it('recordApproval is idempotent for the same approver', () => {
    upsertDraft(makeDraft());
    recordApproval('draft-1', ALICE);
    const updated = recordApproval('draft-1', ALICE);
    expect(updated?.approvals).toHaveLength(1);
  });

  it('recordApproval returns null for an unknown draftId (proposal not yet upserted)', () => {
    expect(recordApproval('nope', ALICE)).toBeNull();
  });

  it('recordMint sets mintedContractAddress; isMinted becomes true (exact path)', () => {
    upsertDraft(makeDraft());
    const CONTRACT = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    recordMint('draft-1', CONTRACT);
    const draft = loadDraft('draft-1')!;
    expect(draft.mintedContractAddress).toBe(CONTRACT);
    expect(isMinted(draft, [])).toBe(true);
  });

  it('isMinted: fallback matches an on-chain summary by parties (either order) + event name', () => {
    const draft = makeDraft({ terms: { promotion: { value: 'Big Show' } } as any });
    const match = isMinted(draft, [{ party1Address: BOB, party2Address: ALICE, eventName: 'Big Show' }]);
    expect(match).toBe(true);
  });

  it('isMinted: fallback does not match a different event name', () => {
    const draft = makeDraft({ terms: { promotion: { value: 'Big Show' } } as any });
    const match = isMinted(draft, [{ party1Address: ALICE, party2Address: BOB, eventName: 'Other Show' }]);
    expect(match).toBe(false);
  });

  it('isMinted: false with no mint record, no matching summary, and no event name set', () => {
    const draft = makeDraft({ terms: {} });
    expect(isMinted(draft, [{ party1Address: ALICE, party2Address: BOB, eventName: 'anything' }])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test:unit src/lib/xaomsg/offchainContracts.test.ts`
Expected: FAIL with "Cannot find module './offchainContracts'".

- [ ] **Step 3: Implement `offchainContracts.ts`**

```ts
// src/lib/xaomsg/offchainContracts.ts
import type { Address } from 'viem';
import type { IContract } from '../../backend/services/types/api';

const LS_KEY = 'xao-cult-offchain-contracts';

export interface OffchainContractDraft {
  draftId: string;
  party1: Address;
  party2: Address;
  terms: Partial<IContract>;
  revisionNumber: number;
  /** Wallet addresses that have ACCEPTed this draft. */
  approvals: Address[];
  mintedContractAddress?: Address;
  lastActivityUnixMs: number;
}

type Store = Record<string, OffchainContractDraft>; // draftId -> draft

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Store; }
  catch { return {}; }
}
function writeStore(s: Store): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export function listDrafts(): OffchainContractDraft[] {
  return Object.values(readStore()).sort((a, b) => b.lastActivityUnixMs - a.lastActivityUnixMs);
}

export function loadDraft(draftId: string): OffchainContractDraft | null {
  return readStore()[draftId] ?? null;
}

/** Upsert a draft revision. A strictly-newer `revisionNumber` always wins; a
 *  stale/equal one is dropped so an out-of-order PROPOSAL replay (e.g. from
 *  store history) can never regress a newer COUNTER_PROPOSAL already applied. */
export function upsertDraft(next: OffchainContractDraft): OffchainContractDraft {
  const store = readStore();
  const existing = store[next.draftId];
  const winner = !existing || next.revisionNumber > existing.revisionNumber ? next : existing;
  store[next.draftId] = winner;
  writeStore(store);
  return winner;
}

/** Add an approving wallet to a draft without bumping its revision. Returns
 *  null if the draft is unknown (an ACCEPT referencing a proposal we haven't
 *  upserted yet — caller should not treat this as approval progress). */
export function recordApproval(draftId: string, approver: Address): OffchainContractDraft | null {
  const store = readStore();
  const existing = store[draftId];
  if (!existing) return null;
  const lower = approver.toLowerCase();
  if (existing.approvals.some((a) => a.toLowerCase() === lower)) return existing;
  const updated: OffchainContractDraft = {
    ...existing,
    approvals: [...existing.approvals, approver],
    lastActivityUnixMs: Date.now(),
  };
  store[draftId] = updated;
  writeStore(store);
  return updated;
}

/** Record the on-chain contract a draft was minted to. Kept in the store as
 *  history (not deleted) — `isMinted` is what hides it from "still negotiating" UI. */
export function recordMint(draftId: string, contractAddress: Address): OffchainContractDraft | null {
  const store = readStore();
  const existing = store[draftId];
  if (!existing) return null;
  const updated: OffchainContractDraft = { ...existing, mintedContractAddress: contractAddress, lastActivityUnixMs: Date.now() };
  store[draftId] = updated;
  writeStore(store);
  return updated;
}

function draftEventName(draft: OffchainContractDraft): string {
  // IContract has no top-level `eventName`; the create-contract form nests it
  // under `promotion.value` (see backend/contract-services/createContract.ts).
  return String((draft.terms as { promotion?: { value?: string } }).promotion?.value || '').trim().toLowerCase();
}

/** True once a draft is retired: either an exact recorded mint (normal path —
 *  the SYSTEM `{ draftId, contractAddress }` message arrived), or, as a
 *  fallback for a contract minted on a device that never saw that message, an
 *  on-chain summary with matching parties (either order) and event name. */
export function isMinted(
  draft: OffchainContractDraft,
  onChainSummaries: { party1Address: string; party2Address: string; eventName: string }[],
): boolean {
  if (draft.mintedContractAddress) return true;
  const p1 = draft.party1.toLowerCase();
  const p2 = draft.party2.toLowerCase();
  const name = draftEventName(draft);
  if (!name) return false;
  return onChainSummaries.some((s) => {
    const sp1 = s.party1Address.toLowerCase();
    const sp2 = s.party2Address.toLowerCase();
    const sameParties = (sp1 === p1 && sp2 === p2) || (sp1 === p2 && sp2 === p1);
    return sameParties && s.eventName.trim().toLowerCase() === name;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test:unit src/lib/xaomsg/offchainContracts.test.ts`
Expected: PASS (11/11).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/xaomsg/offchainContracts.ts src/lib/xaomsg/offchainContracts.test.ts
git commit -m "feat(xaomsg): off-chain contract draft store (upsert/approve/mint/dedup)"
```

---

## Task 3: Generalize `useXaoThread` — post every content type, add `onMessage` routing hook

**Files:**
- Modify: `src/hooks/useXaoThread.ts`

**Interfaces:**
- Produces (replaces Plan 1's `UseXaoThreadResult`):
  ```ts
  interface UseXaoThreadOptions {
    threadId: Hex | null;
    contentTopic: string | null;
    threadKey: CryptoKey | null;
    session: PersistedSession | null;
    onMessage?: (resolved: ResolvedMessage) => void;
  }
  interface UseXaoThreadResult {
    messages: ResolvedMessage[];
    isLoading: boolean;
    error: string | null;
    postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
    postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
    postContactCard: (card: ContactCardPayload) => Promise<ResolvedMessage>;
    postAccept: (proposalHash: Hex) => Promise<ResolvedMessage>;
    postReject: (proposalHash: Hex, reason?: string) => Promise<ResolvedMessage>;
    postSystem: (payload: SystemPayload) => Promise<ResolvedMessage>;
  }
  ```
- Consumes: `ContactCardPayload`, `SystemPayload` (Task 1); everything else already exists (`envelope.ts`, `crypto.ts`, `waku.ts`, `merge.ts`).
- `onMessage` fires once per distinct `messageId` merged into `messages` — for both inbound (live/backfill) and our own sends, deduped against the Waku self-echo. `useXaoMsg` (contract-scoped chat) does not pass `onMessage` and is otherwise unaffected — this is a superset of Plan 1's API, existing callers keep working unchanged.

> **This is a refactor + additive API, not a behavior change to `TEXT`/`PROPOSAL` posting or the subscribe/backfill pipeline.** The existing `messages`/`isLoading`/`error`/`postText`/`postProposal` behavior from Plan 1 is preserved exactly; verify via `npx tsc --noEmit` + `npx eslint` + the existing `yarn test:unit` suite (regression — nothing here has its own new test file since hooks have no test harness in this repo, matching how Plan 1 verified Tasks 7/8/9).

- [ ] **Step 1: Replace `src/hooks/useXaoThread.ts` in full**

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
  ContentType,
  type AcceptPayload,
  type ContactCardPayload,
  type OnWireEnvelope,
  type ProposalPayload,
  type RejectPayload,
  type ResolvedMessage,
  type SystemPayload,
  type TextPayload,
} from '../lib/xaomsg/types';
import type { PersistedSession } from '../lib/xaomsg/session';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

export interface UseXaoThreadOptions {
  threadId: Hex | null;
  contentTopic: string | null;
  threadKey: CryptoKey | null;
  session: PersistedSession | null;
  /** Fired once per newly-merged message — inbound or our own send, deduped
   *  by messageId — so a caller can route side effects (profile-cache writes,
   *  off-chain contract store upserts) by `resolved.envelope.body.contentType`
   *  without this hook knowing about those concerns. */
  onMessage?: (resolved: ResolvedMessage) => void;
}

export interface UseXaoThreadResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
  postContactCard: (card: ContactCardPayload) => Promise<ResolvedMessage>;
  postAccept: (proposalHash: Hex) => Promise<ResolvedMessage>;
  postReject: (proposalHash: Hex, reason?: string) => Promise<ResolvedMessage>;
  postSystem: (payload: SystemPayload) => Promise<ResolvedMessage>;
}

export function useXaoThread({ threadId, contentTopic, threadKey, session, onMessage }: UseXaoThreadOptions): UseXaoThreadResult {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards onMessage against firing twice for the same message — Waku echoes
  // a light-pushed message back through our own filter subscription, and that
  // echo can land alongside the optimistic insert from post().
  const seenIdsRef = useRef<Set<Hex>>(new Set());
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const record = useCallback((resolved: ResolvedMessage) => {
    const id = resolved.envelope.body.messageId;
    setMessages((prev) => mergeResolved(prev, resolved));
    if (!seenIdsRef.current.has(id)) {
      seenIdsRef.current.add(id);
      onMessageRef.current?.(resolved);
    }
  }, []);

  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    seenIdsRef.current = new Set();
    if (!contentTopic || !threadKey || !threadId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        // Shared decode → decrypt → verify → merge pipeline for every inbound
        // byte payload, whether it arrives live via filter or as store history.
        const onBytes = async (bytes: Uint8Array) => {
          try {
            const b64 = new TextDecoder().decode(bytes);
            const plaintext = await decryptBody(b64, threadKey);
            const envelope = JSON.parse(plaintext) as OnWireEnvelope;
            if (!(await verifyEnvelope(envelope))) {
              console.warn('[xaomsg] envelope verification failed; dropping');
              return;
            }
            if (envelope.body.threadId !== threadId) return;
            const resolved: ResolvedMessage = {
              envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            record(resolved);
          } catch (err) {
            console.warn('[xaomsg] failed to handle inbound message:', err);
          }
        };

        // Subscribe to live messages BEFORE backfilling history, so nothing
        // published during the store query is missed (mergeResolved dedupes any
        // overlap between the two sources).
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
  }, [contentTopic, threadKey, threadId, record]);

  const post = useCallback(
    async (
      contentType: ContentType,
      payload: TextPayload | ProposalPayload | AcceptPayload | RejectPayload | ContactCardPayload | SystemPayload,
      parentHash: Hex,
    ): Promise<ResolvedMessage> => {
      if (!session) throw new Error('No session — call unlock() first');
      if (!threadId) throw new Error('No thread context');
      if (!threadKey) throw new Error('Thread key not ready');
      if (!contentTopic) throw new Error('No content topic');

      const body = buildUnsignedBody({
        threadId, contentType, payload, parentHash, sender: session.cert.walletAddress,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
      await publishToTopic(contentTopic, new TextEncoder().encode(ciphertextB64));

      const resolved: ResolvedMessage = {
        envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
      };
      // Optimistic insert. Waku echoes this message back through our own filter
      // subscription, and that echo can arrive *before* this line runs — so
      // `record` dedupes by messageId rather than blindly appending/firing twice.
      record(resolved);
      return resolved;
    },
    [session, threadId, threadKey, contentTopic, record],
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
  const postContactCard = useCallback(
    (card: ContactCardPayload) => post(ContentType.CONTACT_CARD, card, ZERO_HASH),
    [post],
  );
  const postAccept = useCallback(
    (proposalHash: Hex) => post(ContentType.ACCEPT, { kind: 'accept', proposalHash }, proposalHash),
    [post],
  );
  const postReject = useCallback(
    (proposalHash: Hex, reason?: string) => post(ContentType.REJECT, { kind: 'reject', proposalHash, reason }, proposalHash),
    [post],
  );
  const postSystem = useCallback(
    (payload: SystemPayload) => post(ContentType.SYSTEM, payload, ZERO_HASH),
    [post],
  );

  return { messages, isLoading, error, postText, postProposal, postContactCard, postAccept, postReject, postSystem };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (This will surface any other file constructing `UseXaoThreadResult` by hand — there shouldn't be any; `useXaoMsg.ts` returns the spread result as-is.)

- [ ] **Step 3: Lint**

Run: `npx eslint src/hooks/useXaoThread.ts`
Expected: 0 errors.

- [ ] **Step 4: Regression-test the existing suite**

Run: `yarn test:unit`
Expected: all existing tests still pass (this hook has no direct test file, but `envelope.test.ts`/`merge.test.ts`/`crypto.test.ts` exercise the primitives it composes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useXaoThread.ts
git commit -m "feat(xaomsg): useXaoThread posts every content type + onMessage routing hook"
```

---

## Task 4: Wire `useXaoDm` — contact cards → profile cache, proposals/approvals/mints → off-chain store

**Files:**
- Modify: `src/hooks/useXaoDm.ts`

**Interfaces:**
- `UseXaoDmResult` unchanged in shape (`UseXaoThreadResult & { status: DmStatus }`) — it now includes the new `postContactCard`/`postAccept`/`postReject`/`postSystem` methods from Task 3 for free.
- Consumes: `buildContactCardPayload`/`applyContactCard`/`hasSentContactCard`/`markContactCardSent` (Task 1); `upsertDraft`/`recordApproval`/`recordMint` (Task 2); `useProfileCache()` (`src/contexts/ProfileCacheContext.tsx`, unchanged — already exists).

> The `negotiateKey` function and the key-negotiation `useEffect` are **unchanged** from Plan 1 — only the `useXaoDm` hook body gains an `onMessage` handler and an auto-contact-card effect.

- [ ] **Step 1: Replace `src/hooks/useXaoDm.ts` in full**

```ts
// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Address, type Hex, isAddress } from 'viem';
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
import {
  buildContactCardPayload, applyContactCard, hasSentContactCard, markContactCardSent,
} from '../lib/xaomsg/contactCard';
import { upsertDraft, recordApproval, recordMint } from '../lib/xaomsg/offchainContracts';
import {
  ContentType, type AcceptPayload, type ContactCardPayload, type ProposalPayload, type ResolvedMessage, type SystemPayload,
} from '../lib/xaomsg/types';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import { useProfileCache } from '../contexts/ProfileCacheContext';
import type { PersistedSession } from '../lib/xaomsg/session';

export type DmStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';
export interface UseXaoDmResult extends UseXaoThreadResult { status: DmStatus; }

function b64encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...Array.from(bytes))); }
function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

// Dedupe concurrent negotiations for the same thread (React StrictMode's
// dev-mode mount→cleanup→mount, or a fast remount) so two effect instances
// never both run the initiator/recipient side effects — key generation,
// notice publish, cache writes — for the same threadId at once.
const inFlightNegotiations = new Map<Hex, Promise<Uint8Array | null>>();

async function negotiateKey(
  threadId: Hex,
  peer: Address,
  myAddress: Address,
  session: PersistedSession,
): Promise<Uint8Array | null> {
  const cached = loadConversationKeyRaw(threadId);
  if (cached) return cached;

  // Recipient path — did the peer (or our own other tab/device) already
  // start? Replay my inbox for this thread. Every notice here is already
  // wallet-authenticated (inbox.ts verifies the sender's SessionCert and the
  // thread/sender consistency before ever surfacing a notice), so trusting
  // its contents is safe.
  const candidates: DmNotice[] = [];
  await queryInboxNotices(myAddress, session.privateKeyHex, (n) => {
    if (n.threadId.toLowerCase() === threadId.toLowerCase()) candidates.push(n);
  });
  // Sort for deterministic iteration order only. The actual winner is
  // whichever raw key lands in the cache first — here, or via useXaoInbox's
  // live subscription running concurrently — never the self-reported `ts`,
  // so a notice can't steer adoption by lying about its timestamp. This is
  // the same "first cached wins" rule useXaoInbox.applyNotice uses.
  candidates.sort((a, b) => a.ts - b.ts);
  for (const n of candidates) {
    if (loadConversationKeyRaw(threadId)) break;
    const raw = b64decode(n.convKeyB64);
    saveConversationKeyRaw(threadId, raw);
    upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: n.ts });
  }
  const afterReplay = loadConversationKeyRaw(threadId);
  if (afterReplay) return afterReplay;

  // Initiator path — need the peer's key bundle.
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return null;

  const raw = generateRawConversationKey();
  const notice: DmNotice = { from: myAddress, threadId, convKeyB64: b64encode(raw), ts: Date.now() };
  const noticeBytes = await encodeDmNotice(notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
  await publishDmNotice(peer, noticeBytes);
  // Only cache once the peer has actually been notified — if publish throws
  // above, nothing is cached, so a retry re-runs the full initiator path
  // instead of finding an orphaned key the peer can never decrypt. Re-check
  // the cache once more first: a concurrent negotiation (another tab, or
  // useXaoInbox picking up our own notice's echo while we awaited publish)
  // may have already cached a key.
  const raced = loadConversationKeyRaw(threadId);
  if (raced) return raced;
  saveConversationKeyRaw(threadId, raw);
  upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: notice.ts });
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

  // proposalHash (a PROPOSAL/COUNTER_PROPOSAL's own bodyHash) -> draftId, so a
  // later ACCEPT (which only carries the proposalHash it approves) can be
  // applied to the right off-chain draft. Assumes causal order — an ACCEPT
  // can only ever reference a proposal that already exists, and Waku store
  // replay returns messages in order, so the map is always populated before
  // a referencing ACCEPT is processed.
  const draftByProposalHash = useRef(new Map<Hex, string>());

  const onMessage = (resolved: ResolvedMessage) => {
    if (!myAddress || !peer) return;
    const { body, cert } = resolved.envelope;
    switch (body.contentType) {
      case ContentType.CONTACT_CARD: {
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
        break;
      }
      case ContentType.PROPOSAL:
      case ContentType.COUNTER_PROPOSAL: {
        const p = body.payload as ProposalPayload;
        const draftId = String((p.data as { draftId?: unknown }).draftId || '');
        if (!draftId) break;
        draftByProposalHash.current.set(resolved.bodyHash, draftId);
        const [party1, party2] = ([myAddress, peer] as Address[]).sort(
          (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
        ) as [Address, Address];
        upsertDraft({
          draftId, party1, party2, terms: p.data, revisionNumber: p.revisionNumber,
          approvals: [], lastActivityUnixMs: body.sentAt,
        });
        break;
      }
      case ContentType.ACCEPT: {
        const a = body.payload as AcceptPayload;
        const draftId = draftByProposalHash.current.get(a.proposalHash);
        if (draftId) recordApproval(draftId, cert.walletAddress);
        break;
      }
      case ContentType.SYSTEM: {
        const s = body.payload as SystemPayload;
        // Fires for both the sender's own optimistic send and the recipient's
        // inbound copy (record() invokes onMessage either way) — recordMint
        // is a plain overwrite, so both sides converge on the same state.
        if (s.event === 'minted') recordMint(s.draftId, s.contractAddress);
        break;
      }
      default:
        break;
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

> Note: `react-hooks/exhaustive-deps` **is** a registered rule in this project's `next/core-web-vitals` ESLint config (unlike `@typescript-eslint/no-unused-vars`, which Plan 1 hit and had to remove — see `.superpowers/sdd/progress.md`). Verify with Step 3 below before committing; if it's not registered here either, remove the disable comment and restructure instead of suppressing.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npx eslint src/hooks/useXaoDm.ts`
Expected: 0 errors. If `react-hooks/exhaustive-deps` is not a registered rule in this repo's config, remove the `eslint-disable-next-line` comment from Step 1 (an unregistered-rule disable is itself flagged, per Plan 1's `57c6029`) and instead wrap `thread.postContactCard` in a `useRef`-captured stable reference the same way `useXaoThread` does for `onMessage`, or list the actual missing deps and confirm they're safe to add.

- [ ] **Step 4: Regression-test**

Run: `yarn test:unit`
Expected: all existing tests pass (no new test file — no hook-test harness in this repo, same as Plan 1's Task 8).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useXaoDm.ts
git commit -m "feat(xaomsg): useXaoDm routes contact cards to profile cache, proposals/approvals to off-chain store"
```

---

## Task 5: Render system lines in `XaoMsgComponent`; wire proposal clicks on `Chat.tsx`

**Files:**
- Modify: `src/components/Chat/XaoMsgComponent.tsx`
- Modify: `src/pages/chat-Section/Chat.tsx`
- Modify: `src/styles/CreateContract.module.css`

**Interfaces:**
- `XaoMsgComponentProps` gains `onContractProposalSelect?: (proposal: ContractProposalMessage) => void`.
- Consumes: `ContentType`, `ContactCardPayload`, `ProposalPayload`, `RejectPayload`, `SystemPayload` (`lib/xaomsg/types.ts`); `ContractProposalMessage`, `CONTRACT_MESSAGE_VERSION` (`types/contractMessage.ts`, unchanged, already exists).

- [ ] **Step 1: Add the system-line styles**

In `src/styles/CreateContract.module.css`, add (anywhere near `.RecievedMessage`/`.sentMessage`, e.g. right after the `.RecievedMessage` block):

```css
.systemLine {
  align-self: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  text-align: center;
  margin: 6px 0;
  cursor: default;
}

.systemLineClickable {
  cursor: pointer;
  text-decoration: underline;
}
```

- [ ] **Step 2: Route rendering by content type in `XaoMsgComponent.tsx`**

Change the props interface (add `onContractProposalSelect`):

```tsx
export interface XaoMsgComponentProps {
  showContract?: Address | null;
  peer?: Address | null;
  embedded?: boolean;
  onContractProposalSelect?: (proposal: ContractProposalMessage) => void;
}
```

Add the import for `ContractProposalMessage`/`CONTRACT_MESSAGE_VERSION` at the top:

```tsx
import { CONTRACT_MESSAGE_VERSION, type ContractProposalMessage } from '../../types/contractMessage';
```

Change the component signature to accept the new prop and pass it through to `renderMessage`:

```tsx
const XaoMsgComponent: React.FC<XaoMsgComponentProps> = ({
  showContract = null, peer = null, embedded = false, onContractProposalSelect,
}) => {
```

(No other change inside the component body — `messages.map((m) => renderMessage(...))` gains the new argument, shown below.) Replace the existing render call:

```tsx
        {messages.map((m) => renderMessage(m, myAddress, styles))}
```

with:

```tsx
        {messages.map((m) => renderMessage(m, myAddress, styles, onContractProposalSelect))}
```

Replace the entire `renderMessage` function (and the `ContentType`/payload imports it needs) with:

```tsx
import {
  ContentType,
  type AcceptPayload, type ContactCardPayload, type ProposalPayload, type RejectPayload,
  type ResolvedMessage, type SystemPayload, type TextPayload,
} from '../../lib/xaomsg/types';

function shortWho(addr: string, myAddress: Address | undefined): string {
  return myAddress && addr.toLowerCase() === myAddress.toLowerCase() ? 'You' : `${addr.slice(0, 6)}…`;
}

function toContractProposalMessage(m: ResolvedMessage): ContractProposalMessage {
  const p = m.envelope.body.payload as ProposalPayload;
  return {
    type: 'contract-proposal',
    version: CONTRACT_MESSAGE_VERSION,
    data: p.data,
    sentAt: m.envelope.body.sentAt,
    proposedBy: m.envelope.body.sender,
    revisionNumber: p.revisionNumber,
  };
}

function renderMessage(
  m: ResolvedMessage,
  myAddress: Address | undefined,
  styles: Record<string, string>,
  onContractProposalSelect?: (proposal: ContractProposalMessage) => void,
) {
  const { body } = m.envelope;
  const isMine = !!myAddress && body.sender.toLowerCase() === myAddress.toLowerCase();
  const cls = isMine ? styles.sentMessage : styles.RecievedMessage;
  const key = body.messageId;

  if (body.contentType === ContentType.TEXT) {
    const t = body.payload as TextPayload;
    return <div key={key} className={cls}>{t.text}</div>;
  }
  if (body.contentType === ContentType.CONTACT_CARD) {
    const c = body.payload as ContactCardPayload;
    return <div key={key} className={styles.systemLine}>{shortWho(c.walletAddress, myAddress)} updated their profile details</div>;
  }
  if (body.contentType === ContentType.PROPOSAL || body.contentType === ContentType.COUNTER_PROPOSAL) {
    const p = body.payload as ProposalPayload;
    const verb = body.contentType === ContentType.PROPOSAL ? 'sent a contract' : 'sent an updated contract';
    const clickable = !!onContractProposalSelect;
    return (
      <div
        key={key}
        className={clickable ? `${styles.systemLine} ${styles.systemLineClickable}` : styles.systemLine}
        onClick={clickable ? () => onContractProposalSelect!(toContractProposalMessage(m)) : undefined}
      >
        📋 {shortWho(body.sender, myAddress)} {verb} (rev {p.revisionNumber})
      </div>
    );
  }
  if (body.contentType === ContentType.ACCEPT) {
    return <div key={key} className={styles.systemLine}>✓ {shortWho(body.sender, myAddress)} approved the contract</div>;
  }
  if (body.contentType === ContentType.REJECT) {
    const r = body.payload as RejectPayload;
    return (
      <div key={key} className={styles.systemLine}>
        ✗ {shortWho(body.sender, myAddress)} rejected the contract{r.reason ? `: ${r.reason}` : ''}
      </div>
    );
  }
  if (body.contentType === ContentType.SYSTEM) {
    const s = body.payload as SystemPayload;
    return (
      <div key={key} className={styles.systemLine}>
        Contract minted on-chain{s.contractAddress ? ` (${s.contractAddress.slice(0, 6)}…)` : ''}
      </div>
    );
  }
  return <div key={key} className={cls}>(unknown content type)</div>;
}
```

Remove the old `renderMessage` function (the one keying off `ContentType.PROPOSAL || ContentType.COUNTER_PROPOSAL` with the "Phase 1 placeholder; full DAG ships in Plan 3" text, and the old inline ACCEPT/REJECT `<div style={{color:...}}>` lines) — it's fully replaced by the version above. Also remove the now-unused `import { ContentType, type ResolvedMessage } from '../../lib/xaomsg/types';` line further up the file (superseded by the wider import added in this step) if it's still present after the edit.

- [ ] **Step 3: Wire `Chat.tsx` to pass the callback**

In `src/pages/chat-Section/Chat.tsx`, change:

```tsx
        <XaoMsgComponent peer={(peerAddress as `0x${string}`) ?? null} />
```

to:

```tsx
        <XaoMsgComponent
          peer={(peerAddress as `0x${string}`) ?? null}
          onContractProposalSelect={handleContractProposalSelect}
        />
```

(`handleContractProposalSelect` already exists in this file from Plan 1, previously unused — see `docs/superpowers/plans/2026-07-19-xaomsg-phase2-direct-dm.md` Task 10 Step 2. No other change to `Chat.tsx`.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/components/Chat/XaoMsgComponent.tsx src/pages/chat-Section/Chat.tsx`
Expected: 0 errors.

- [ ] **Step 6: Manual verification (dev server)**

Run: `pgrep -af "next dev|yarn dev" || yarn dev`

In a connected-wallet browser tab, open an existing DM (`/chat-Section/Chat?peer=0x...`) or start a new one. Confirm: `TEXT` messages still render as bubbles (left/right per sender, unchanged from Plan 1); once Task 4 lands and both sides have a profile set, a `CONTACT_CARD` renders as a centered muted line, not a bubble.

- [ ] **Step 7: Commit**

```bash
git add src/components/Chat/XaoMsgComponent.tsx src/pages/chat-Section/Chat.tsx src/styles/CreateContract.module.css
git commit -m "feat(xaomsg): render non-text content types as muted system lines; wire proposal click-through"
```

---

## Task 6: `useOffchainContracts` — merge hook for the Negotiation page

**Files:**
- Create: `src/hooks/useOffchainContracts.ts`

**Interfaces:**
- Produces: `useOffchainContracts(onChainSummaries: ContractSummary[]): { drafts: OffchainContractDraft[] }` — drafts belonging to the connected wallet (as `party1` or `party2`) that are not yet minted (per `isMinted`).
- Consumes: `listDrafts`, `isMinted`, `OffchainContractDraft` (Task 2); `ContractSummary` (`src/hooks/useGetContracts.ts`, unchanged, already exists).

- [ ] **Step 1: Implement `useOffchainContracts.ts`**

```ts
// src/hooks/useOffchainContracts.ts
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { listDrafts, isMinted, type OffchainContractDraft } from '../lib/xaomsg/offchainContracts';
import type { ContractSummary } from './useGetContracts';

export interface UseOffchainContractsResult {
  drafts: OffchainContractDraft[];
}

/** Re-reads the localStorage draft store whenever the connected wallet or the
 *  on-chain summaries change. Does not subscribe to live Waku updates itself
 *  — Negotiation is not a persistent DM subscriber; a draft appears here once
 *  its owning `useXaoDm` thread (wherever it's mounted) has written it. This
 *  matches the plan's locked "plumbing + minimal UI, no polish" scope. */
export function useOffchainContracts(onChainSummaries: ContractSummary[]): UseOffchainContractsResult {
  const { address } = useAccount();
  const [drafts, setDrafts] = useState<OffchainContractDraft[]>([]);

  useEffect(() => {
    if (!address) { setDrafts([]); return; }
    const myAddr = address.toLowerCase();
    const mine = listDrafts().filter(
      (d) => d.party1.toLowerCase() === myAddr || d.party2.toLowerCase() === myAddr,
    );
    setDrafts(mine.filter((d) => !isMinted(d, onChainSummaries)));
  }, [address, onChainSummaries]);

  return { drafts };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npx eslint src/hooks/useOffchainContracts.ts`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useOffchainContracts.ts
git commit -m "feat(xaomsg): useOffchainContracts merge hook for the Negotiation page"
```

---

## Task 7: Merge off-chain drafts into `Negotiation.tsx`

**Files:**
- Modify: `src/pages/contracts/Negotiation.tsx`

**Interfaces:**
- Consumes: `useOffchainContracts` (Task 6); `OffchainContractDraft` (Task 2); `ContractProposalMessage`/`CONTRACT_MESSAGE_VERSION` (`types/contractMessage.ts`, unchanged).

- [ ] **Step 1: Add the import and hook call**

In `src/pages/contracts/Negotiation.tsx`, add to the imports:

```tsx
import { useOffchainContracts } from "../../hooks/useOffchainContracts";
import type { OffchainContractDraft } from "../../lib/xaomsg/offchainContracts";
import { CONTRACT_MESSAGE_VERSION, type ContractProposalMessage } from "../../types/contractMessage";
```

Immediately after the existing `const { contracts, isLoading } = useAllContractsWithSummaries(chain?.id);` line, add:

```tsx
  const { drafts } = useOffchainContracts(contracts);
```

- [ ] **Step 2: Add the draft-click handler**

Immediately after the existing `handleImageClick` function, add:

```tsx
  const handleDraftClick = (draft: OffchainContractDraft) => {
    const myAddr = address?.toLowerCase();
    const peer = draft.party1.toLowerCase() === myAddr ? draft.party2 : draft.party1;
    const proposal: ContractProposalMessage = {
      type: "contract-proposal",
      version: CONTRACT_MESSAGE_VERSION,
      data: draft.terms,
      sentAt: draft.lastActivityUnixMs,
      proposedBy: peer,
      revisionNumber: draft.revisionNumber,
    };
    sessionStorage.setItem("selectedContractProposal", JSON.stringify(proposal));
    router.push(`/contracts/create-contract?peer=${encodeURIComponent(peer)}`);
  };
```

- [ ] **Step 3: Render the drafts**

Immediately after the closing `))}` of the `{attentionContracts.map(...)}` block and before `{waitingContracts.map(...)}`, add:

```tsx
          {drafts.map((draft) => {
            const eventName = (draft.terms as { promotion?: { value?: string } }).promotion?.value || "Untitled draft";
            const imageUri = (draft.terms as { eventImageUri?: string }).eventImageUri;
            return (
              <div
                key={draft.draftId}
                className={styles.ImageContainer}
                style={{ cursor: "pointer" }}
                onClick={() => handleDraftClick(draft)}
              >
                <div className={styles.waitingTitle}>Draft — off-chain</div>
                <img
                  src={imageUri || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"}
                  alt={eventName}
                  className={styles.waitingImage}
                />
                <div className={styles.AttentionDetailsOverlay}>
                  <h2 className={styles.promotionTitle}>{eventName}</h2>
                </div>
              </div>
            );
          })}
```

(`attentionContracts`/`waitingContracts`/`handleImageClick` and everything else in the file are unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/pages/contracts/Negotiation.tsx`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/contracts/Negotiation.tsx
git commit -m "feat(xaomsg): Negotiation page renders off-chain drafts alongside on-chain contracts"
```

---

## Task 8: Rewire `create-contract.tsx` from XMTP to Waku

**Files:**
- Modify: `src/pages/contracts/create-contract.tsx`

**Interfaces:**
- Consumes: `useXaoMsgSession` (`src/hooks/useXaoMsgSession.ts`, unchanged, already exists); `useXaoDm` (Task 4, now with `postProposal`/`postSystem`); `XaoMsgComponent` in `peer` mode (Task 5).
- Removes: `useXMTPConversation` usage (the hook itself is deleted in Task 10, once nothing references it).

> **Why `peer` mode, not `showContract` mode, for the Chat tab:** before a `ShowContract` is deployed on-chain, `savedContractAddress`/`newContractAddress` are both `null`, so `showContract`-based `XaoMsgComponent` has nothing to key a thread off — negotiation has to happen over the DM (`peer`) pair topic, same as any other pre-contract conversation. This is a correctness fix uncovered while implementing this task, not something the design doc's file table called out — `contracts-detail.tsx` (Task 9) is the page that legitimately keeps `showContract` mode, for chat about a contract that already exists.

- [ ] **Step 1: Swap the XMTP import for Waku hooks**

Replace:

```tsx
import { useXMTPConversation } from "../../hooks/useXMTPConversation";
```

with:

```tsx
import { useXaoDm } from "../../hooks/useXaoDm";
import { useXaoMsgSession } from "../../hooks/useXaoMsgSession";
```

Also change the component import to drop `ChatComponent` (its only remaining use in this file is removed in Step 6):

```tsx
import { XaoMsgComponent } from "../../components/Chat";
```

- [ ] **Step 2: Add `draftId` state**

Immediately after the existing `const [lastProposalSender, setLastProposalSender] = useState<string | null>(null);` line, add:

```tsx
  // Stable per-negotiation identifier the off-chain draft store keys on.
  // Regenerated when the user manually points party2 at a new counterparty
  // (see the party2 input's onChange below); reloaded from a stored/incoming
  // proposal's own draftId so counter-proposals stay attached to the same draft.
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
```

- [ ] **Step 3: Replace the XMTP conversation hook with Waku session + DM**

Replace:

```tsx
  // XMTP for sending contract proposals
  const { sendContractProposal, isClientReady } = useXMTPConversation({
    peerAddress,
  });

  // Keep a ref to the latest sendContractProposal so useEffect closures always use the current version
  const sendProposalRef = useRef(sendContractProposal);
  useEffect(() => {
    sendProposalRef.current = sendContractProposal;
  }, [sendContractProposal]);
```

with:

```tsx
  // Waku session + DM thread for sending contract proposals
  const { session } = useXaoMsgSession();
  const dmThread = useXaoDm({
    peer: peerAddress && peerAddress.startsWith('0x') ? (peerAddress as `0x${string}`) : null,
    session,
  });
  const isClientReady = dmThread.status === 'ready';

  // Keep refs to the latest postProposal/postSystem so useEffect closures
  // (below) always use the current DM thread instead of a stale one captured
  // when the effect was first set up.
  const postProposalRef = useRef(dmThread.postProposal);
  postProposalRef.current = dmThread.postProposal;
  const postSystemRef = useRef(dmThread.postSystem);
  postSystemRef.current = dmThread.postSystem;
```

- [ ] **Step 4: Load `draftId` alongside the rest of a stored/incoming proposal**

In the `useEffect` that loads a proposal from `sessionStorage` (the one containing `const storedProposal = sessionStorage.getItem("selectedContractProposal");`), add one line right after `setRevisionNumber(proposal.revisionNumber + 1);`:

```tsx
        setRevisionNumber(proposal.revisionNumber + 1);
        if (proposal.data.draftId) setDraftId(String(proposal.data.draftId));
```

Do the same in `handleContractProposalSelect` — add the same line right after its `setRevisionNumber(proposal.revisionNumber + 1);`.

Also, in the party2 `<input>`'s `onChange` handler (`setParty2(e.target.value); setLastProposalSender(null);`), add a fresh `draftId` so manually retargeting party2 starts a new negotiation rather than continuing whatever draft was loaded:

```tsx
                        onChange={(e) => {
                          setParty2(e.target.value);
                          // User manually entered a new party2 address — reset reply-to
                          // tracking and start a fresh off-chain draft for this negotiation.
                          setLastProposalSender(null);
                          setDraftId(crypto.randomUUID());
                        }}
```

- [ ] **Step 5: Send proposals over Waku instead of XMTP**

In `handleSendProposal`, replace:

```tsx
      // Remove base64 imageData before sending over XMTP
      if (termsObject.promotion) {
        delete termsObject.promotion.imageData;
      }

      // Include contract address if contract was already created on-chain
      if (savedContractAddress) {
        termsObject.contractAddress = savedContractAddress;
      }

      // Send the proposal
      await sendContractProposal(termsObject, revisionNumber);
```

with:

```tsx
      // Remove base64 imageData before sending over Waku
      if (termsObject.promotion) {
        delete termsObject.promotion.imageData;
      }

      // Include contract address if contract was already created on-chain
      if (savedContractAddress) {
        termsObject.contractAddress = savedContractAddress;
      }
      termsObject.draftId = draftId;

      // Send the proposal
      await dmThread.postProposal({
        kind: activeProposal ? 'counter-proposal' : 'proposal',
        revisionNumber,
        data: termsObject,
      });
```

In the `processContractCreation` effect (the one gated on `isSuccess && newContractAddress`), replace:

```tsx
          // Send proposal with contract address to party2 via XMTP
          // Use sendProposalRef.current to avoid stale closure capturing an old sendContractProposal
          if (isClientReady && sendProposalRef.current) {
            try {
              const termsObject = contractSectionRef.current?.getContractData
                ? contractSectionRef.current.getContractData()
                : { party1, party2 };

              // Remove base64 imageData before sending over XMTP
              if (termsObject.promotion) {
                delete termsObject.promotion.imageData;
              }

              // Include the created contract address
              termsObject.contractAddress = newContractAddress;

              await sendProposalRef.current(termsObject, revisionNumber);
              setRevisionNumber((prev) => prev + 1);
              console.log("[CreateContract] Sent draft contract proposal with address to party2");
            } catch (err) {
              console.warn("Failed to send draft proposal to party2:", err);
            }
          }
```

with:

```tsx
          // Send proposal with the new contract address, then the SYSTEM
          // "minted" message — deploying this ShowContract is the design's
          // "mint on-chain" step (see docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md §7);
          // the SYSTEM message is what lets the peer's off-chain draft store
          // retire this draftId exactly, without relying on the fallback heuristic.
          if (isClientReady && postProposalRef.current && postSystemRef.current) {
            try {
              const termsObject = contractSectionRef.current?.getContractData
                ? contractSectionRef.current.getContractData()
                : { party1, party2 };

              if (termsObject.promotion) {
                delete termsObject.promotion.imageData;
              }
              termsObject.contractAddress = newContractAddress;
              termsObject.draftId = draftId;

              await postProposalRef.current({
                kind: activeProposal ? 'counter-proposal' : 'proposal',
                revisionNumber,
                data: termsObject,
              });
              setRevisionNumber((prev) => prev + 1);

              await postSystemRef.current({
                kind: 'system', event: 'minted', draftId, contractAddress: newContractAddress,
              });
              console.log("[CreateContract] Sent draft contract proposal + minted notice to party2");
            } catch (err) {
              console.warn("Failed to send draft proposal to party2:", err);
            }
          }
```

Finally, in the `processSignSuccess` effect, replace:

```tsx
        if (isClientReady && contractAddrToShare && sendProposalRef.current) {
          try {
            const termsObject = contractSectionRef.current?.getContractData
              ? contractSectionRef.current.getContractData()
              : { party1, party2 };

            if (termsObject.promotion) {
              delete termsObject.promotion.imageData;
            }

            termsObject.contractAddress = contractAddrToShare;

            sendProposalRef.current(termsObject, revisionNumber)
              .then(() => {
                setRevisionNumber((prev) => prev + 1);
                console.log("[CreateContract] Sent signed contract proposal to party2");
              })
              .catch((err: any) => {
                console.warn("Failed to send signed proposal to party2:", err);
              });
          } catch (err) {
            console.warn("Failed to prepare signed proposal for party2:", err);
          }
        }
```

with:

```tsx
        if (isClientReady && contractAddrToShare && postProposalRef.current) {
          try {
            const termsObject = contractSectionRef.current?.getContractData
              ? contractSectionRef.current.getContractData()
              : { party1, party2 };

            if (termsObject.promotion) {
              delete termsObject.promotion.imageData;
            }

            termsObject.contractAddress = contractAddrToShare;
            termsObject.draftId = draftId;

            postProposalRef.current({
              kind: activeProposal ? 'counter-proposal' : 'proposal',
              revisionNumber,
              data: termsObject,
            })
              .then(() => {
                setRevisionNumber((prev) => prev + 1);
                console.log("[CreateContract] Sent signed contract proposal to party2");
              })
              .catch((err: any) => {
                console.warn("Failed to send signed proposal to party2:", err);
              });
          } catch (err) {
            console.warn("Failed to prepare signed proposal for party2:", err);
          }
        }
```

- [ ] **Step 6: Collapse the Chat-tab render to always use `XaoMsgComponent` in `peer` mode**

Replace:

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
```

with:

```tsx
            {selected === "chat" ? (
              <XaoMsgComponent
                peer={peerAddress && peerAddress.startsWith('0x') ? (peerAddress as `0x${string}`) : null}
                embedded={true}
                onContractProposalSelect={handleContractProposalSelect}
              />
            ) : (
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If `ChatComponent` is now unused in this file, TypeScript won't error on an unused named import by default in this project's config — but `eslint` will; that's what Step 8 catches.)

- [ ] **Step 8: Lint**

Run: `npx eslint src/pages/contracts/create-contract.tsx`
Expected: 0 errors. If `ChatComponent` is flagged unused, remove it from the `import { ChatComponent, XaoMsgComponent } from "../../components/Chat";` line (change to `import { XaoMsgComponent } from "../../components/Chat";`) — this was already handled in Step 1 above; double check the edit landed.

- [ ] **Step 9: Regression-test**

Run: `yarn test:unit`
Expected: all existing tests pass (no test file for this page — none existed before).

- [ ] **Step 10: Manual verification (dev server, two wallets)**

Run: `pgrep -af "next dev|yarn dev" || yarn dev`

1. As Wallet A, go to `/contracts/create-contract?peer=<Wallet B address>`, fill in minimal contract fields, click "Send to Party 2". Confirm no error and the chat tab (switch to "Chat") shows a "📋 ... sent a contract" system line.
2. As Wallet B (same page, `?peer=<Wallet A address>`), confirm the proposal system line appears; click it and confirm it navigates to `create-contract` with the form pre-filled from the proposal (via `handleContractProposalSelect` → `sessionStorage`).
3. Save the contract as a draft on-chain (Wallet A) and confirm a "Contract minted on-chain" system line appears in both wallets' chat.
4. Confirm the draft now shows the on-chain state in `/contracts/Negotiation` for both wallets (either "Requires Attention"/"Waiting" once minted, no longer "Draft — off-chain").

- [ ] **Step 11: Commit**

```bash
git add src/pages/contracts/create-contract.tsx
git commit -m "feat(xaomsg): create-contract sends proposals + mint notice over Waku instead of XMTP"
```

---

## Task 9: Rewire `contracts-detail.tsx` off the dead XMTP branch

**Files:**
- Modify: `src/pages/contracts/contracts-detail.tsx`

**Interfaces:** none new — this collapses an already-effectively-dead branch (`NEXT_PUBLIC_USE_XAOMSG` is never `'0'` or unset in any deployed environment by this point in the plan; Task 8 already made the equivalent branch in `create-contract.tsx` unconditional).

- [ ] **Step 1: Drop the `ChatComponent` import**

Change:

```tsx
import { ChatComponent, XaoMsgComponent } from "../../components/Chat";
```

to:

```tsx
import { XaoMsgComponent } from "../../components/Chat";
```

- [ ] **Step 2: Delete the now-dead `peerAddress` memo**

Delete these lines entirely:

```tsx
  // Counterparty wallet for the legacy XMTP chat: whichever party isn't me.
  const peerAddress = useMemo<string | null>(() => {
    const me = address?.toLowerCase();
    if (party1 && party1.toLowerCase() !== me) return party1;
    if (party2 && party2.toLowerCase() !== me) return party2;
    return null;
  }, [address, party1, party2]);

```

(Leave `party1`/`party2`/`address` themselves — they're used elsewhere in the file for other purposes; confirm with `grep -n "party1\b\|party2\b" src/pages/contracts/contracts-detail.tsx` that removing only the `peerAddress` memo doesn't orphan them too. If `useMemo` becomes unused in this file as a result, drop it from the `import React, { useState, useMemo } from "react";` line at the top.)

- [ ] **Step 3: Collapse the Chat-tab render**

Replace:

```tsx
              {process.env.NEXT_PUBLIC_USE_XAOMSG === "1" ? (
                <XaoMsgComponent showContract={contractAddr ?? null} embedded={true} />
              ) : (
                <ChatComponent peerAddress={peerAddress} embedded={true} />
              )}
```

with:

```tsx
              <XaoMsgComponent showContract={contractAddr ?? null} embedded={true} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/pages/contracts/contracts-detail.tsx`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/contracts/contracts-detail.tsx
git commit -m "refactor(xaomsg): contracts-detail always renders XaoMsgComponent, drops dead ChatComponent branch"
```

---

## Task 10: Delete the XMTP stack

**Files:**
- Delete: `src/contexts/XMTPContext.tsx`, `src/hooks/useXMTPClient.ts`, `src/hooks/useXMTPConversation.ts`, `src/lib/xmtp.ts`, `src/components/Chat/ChatComponent.tsx`, `src/components/RecipientSelector.tsx`
- Modify: `src/components/Chat/index.ts`, `src/components/DynamicProviders.tsx`, `src/components/Navbar.tsx`, `src/components/FloatingNav.tsx`, `src/pages/chat-Section/Notification.tsx`, `src/backend/legaldata.ts`, `package.json`

**Interfaces:** none — pure removal. By this point (after Tasks 1–9), grep confirms nothing outside the files being deleted still imports from any of them.

- [ ] **Step 1: Verify nothing outside the doomed files still references XMTP**

Run: `grep -rln "xmtp\|XMTP" src/ --include=*.ts --include=*.tsx`
Expected: exactly `src/contexts/XMTPContext.tsx`, `src/hooks/useXMTPClient.ts`, `src/hooks/useXMTPConversation.ts`, `src/lib/xmtp.ts`, `src/components/Chat/ChatComponent.tsx`, `src/components/DynamicProviders.tsx`, `src/components/Navbar.tsx`, `src/components/FloatingNav.tsx`, `src/pages/chat-Section/Notification.tsx`, `src/backend/legaldata.ts`, `src/components/Chat/index.ts`. If anything else shows up, stop and fix that file first (a page/component this plan didn't anticipate still depends on XMTP) rather than deleting out from under it.

- [ ] **Step 2: Drop the `ChatComponent` export**

In `src/components/Chat/index.ts`, remove:

```ts
export { default as ChatComponent } from "./ChatComponent";
export type { ChatComponentProps } from "./ChatComponent";
```

leaving:

```ts
export { default as ContractCard } from "./ContractCard";
export { default as XaoMsgComponent } from "./XaoMsgComponent";
```

- [ ] **Step 3: Remove the XMTP provider wrap**

In `src/components/DynamicProviders.tsx`, remove the `import { XMTPProvider } from '../contexts/XMTPContext';` line, and unwrap the `<XMTPProvider>...</XMTPProvider>` tags (keep their children in place, at the same nesting level the provider occupied).

- [ ] **Step 4: Drop the unread badge from `Navbar.tsx`**

In `src/components/Navbar.tsx`, remove `import { useXMTPClient } from '../contexts/XMTPContext';` and the `const { unreadCount } = useXMTPClient();` line. If `unreadCount` is referenced anywhere in the JSX below, remove that usage too (out of scope to rebuild on Waku this pass, per the Global Constraints).

- [ ] **Step 5: Drop the unread badge from `FloatingNav.tsx`**

In `src/components/FloatingNav.tsx`, remove `import { useXMTPClient } from '../contexts/XMTPContext';` and `const { unreadCount, clearUnread } = useXMTPClient();`. In `handleNavClick`, remove the `if (item.id === 'chat') { clearUnread(); }` block. In the JSX, remove the `{item.id === 'chat' && unreadCount > 0 && (<span className={styles.badge}>...</span>)}` block.

- [ ] **Step 6: Replace `Notification.tsx` with a minimal stub**

Replace the entire contents of `src/pages/chat-Section/Notification.tsx` with:

```tsx
//chat-Section/Notification.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";

// Notifications are XMTP-era; Waku has no server-side notification stream to
// replace them with yet (out of scope this pass — see the design's locked
// "no notification polish" decision, docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md §12).
export default function Notification() {
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Notifications - XAO Cult</title>
          <meta name="description" content="Notification Center" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar pageTitle="Notifications" />
        <Scrollbar />
        <main className={docStyles.notificationcontainer}>
          <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px 0" }}>
            No notifications
          </div>
        </main>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 7: Edit the legal copy**

In `src/backend/legaldata.ts`, change:

```
"Xao does not create or store centralized user profiles. There is no global directory or searchable user database. Instead, discovery of other users occurs organically through decentralized group chats (e.g., via XMTP). Profile data is not publicly browsable, and all sharing of information is opt-in, contextual, and handled peer-to-peer."
```

to:

```
"Xao does not create or store centralized user profiles. There is no global directory or searchable user database. Instead, discovery of other users occurs organically through decentralized peer-to-peer messaging. Profile data is not publicly browsable, and all sharing of information is opt-in, contextual, and handled peer-to-peer."
```

- [ ] **Step 8: Delete the XMTP files**

```bash
git rm src/contexts/XMTPContext.tsx src/hooks/useXMTPClient.ts src/hooks/useXMTPConversation.ts src/lib/xmtp.ts src/components/Chat/ChatComponent.tsx src/components/RecipientSelector.tsx
```

- [ ] **Step 9: Remove the XMTP dependency**

In `package.json`, remove the `"@xmtp/browser-sdk": "^5.3.0",` line, then:

```bash
yarn install
```

Expected: lockfile updates, no other dependency changes.

- [ ] **Step 10: Verify no reference survives**

Run: `grep -rln "xmtp\|XMTP" src/ --include=*.ts --include=*.tsx`
Expected: no output.

Run: `grep -n "NEXT_PUBLIC_USE_XAOMSG" -r src/`
Expected: no output (both ternaries were collapsed in Tasks 8–9).

- [ ] **Step 11: Full verification pass**

```bash
npx tsc --noEmit
```
Expected: PASS.

```bash
npx eslint .
```
Expected: 0 errors (pre-existing unrelated warnings, if any, are fine — same bar Plan 1 used).

```bash
yarn test:unit
```
Expected: all tests pass.

```bash
yarn build
```
Expected: production build succeeds (check first per CLAUDE.md that no dev server is holding the port: `pgrep -af "next dev|yarn dev" || echo "No dev server running"` — if one is running, either stop it or skip this and rely on `tsc`/`eslint`/`test:unit`, noting the skip).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(xaomsg): delete the XMTP stack — Waku is now the app's only messaging transport"
```

---

## Task 11: Final whole-branch review

Once Tasks 1–10 are complete and each individually reviewed clean, dispatch a final whole-branch code review on the most capable available model, covering the full diff from this plan's base commit to `HEAD` (use `scripts/review-package` from the `subagent-driven-development` skill directory). Pay particular attention to:

- **Content-type routing correctness**: does every `ContentType` value get handled somewhere in `renderMessage` and in `useXaoDm`'s `onMessage`, with no silent drops?
- **The `draftByProposalHash` causal-order assumption** in `useXaoDm.ts` — is it actually safe, or can an ACCEPT arrive (live or via replay) before its proposal in some reachable scenario?
- **The `isMinted` fallback's collision risk** — same as the design doc's own noted limitation (§11): two same-named contracts between the same parties can mis-merge. Confirm this is only ever a display-layer inconvenience (an off-chain draft disappearing early), never a security or fund-safety issue.
- **Pair-topic sender scoping — pre-existing gap, worth flagging even though Plan 2 doesn't fix it.** `contentTopicForThread(dmThreadId(a,b))` is a public, derivable Waku content topic, not an access-controlled channel: `verifyEnvelope` proves an envelope's `body.sender` is a genuine wallet-attested signer, but neither Plan 1's `useXaoThread` nor this plan's routing ever checks that `body.sender` is actually one of the *two* addresses the thread is for. A third wallet C who derives `dmThreadId(A,B)` (trivial — it's a public, sorted-address hash) can publish a genuinely-signed envelope there; today (Plan 1, already on master) that renders as a stray `TEXT` bubble from an unexpected sender. Task 4 of this plan (see `useXaoDm.ts`'s `onMessage`) adds a `CONTACT_CARD` handler that binds both `card.walletAddress === body.sender` and `body.sender === peer` before calling `setProfile` specifically to stop this from becoming a profile-cache-poisoning vector — confirm that fix is sufficient and correctly placed. Separately, confirm whether `PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT` handling should get the same `body.sender === peer` (or `=== myAddress`, for our own echo) check before touching the off-chain store — right now `upsertDraft`/`recordApproval` trust the *thread*, not the *sender*, so C could inject a bogus draft/approval into a real A↔B negotiation. If the review agrees this is in-scope, dispatch a fix; if it's judged acceptable to defer (matching Plan 1's own precedent of documenting rather than fixing every such gap immediately), it must be written up as a known limitation, not silently dropped.
- **XMTP removal completeness** — Task 10 Step 1/10's grep is a coarse net; confirm no `.env`/`next.config.js`/CI config still references `NEXT_PUBLIC_USE_XAOMSG` or XMTP-specific env vars.

Dispatch fix subagents for any Critical/Important findings, re-review, then hand off to `superpowers:finishing-a-development-branch` per the user's direction on PR vs. further local work.
