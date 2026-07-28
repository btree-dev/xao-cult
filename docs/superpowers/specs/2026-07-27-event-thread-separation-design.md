# Separating Direct Conversations from Event/Contract Chats (Design Spec)

**Status:** Design — awaiting approval before an implementation plan is written.
**Date:** 2026-07-27
**Builds on:** `docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md` (DMs, contact cards, off-chain contracts). This spec changes §7 of that design: off-chain contracts move off the DM pair thread onto their own per-draft thread.

## 1. Problem

Today, contract negotiation content (`PROPOSAL` / `COUNTER_PROPOSAL` / `ACCEPT` / mint `SYSTEM`) rides the **same Waku thread** as the free-text DM between two wallets — both are keyed by `dmThreadId(a, b)` and sent through `useXaoDm`. There is no separate thread per draft:

- `create-contract.tsx` sends proposals via `dmThread.postProposal` over the peer's DM thread.
- `useXaoDm`'s `onMessage` calls `applyDraftMessage`, mixing contract-store side effects into the DM pipeline.
- A user's casual chat with someone and their contract negotiation with that same person are literally the same encrypted stream, using the same key.

Separately, the Search page's "Events" list is a stub — it lists on-chain NFT `tokenId`s with placeholder data (`terms: Event #${tokenId}`) and doesn't include off-chain drafts at all. The code has a `// In a real implementation, you'd fetch event contract data for each token` comment marking this.

This spec:
1. Gives every draft contract its own thread, independent of the DM thread — matching the pattern already used for on-chain contracts (`threadIdForShow(address)`), just for the pre-mint phase.
2. Fixes Search's Events list to show real contract data (on-chain + off-chain), merged the same way `Negotiation.tsx` already does.

## 2. Key facts that shape the design

1. **The on-chain-contract-chat pattern already exists and is exactly the right shape.** `threadIdForShow(showAddress): Hex` derives a thread id from an on-chain contract's address; `useXaoMsg` and `XaoMsgComponent`'s `showContract` branch already use it. We're adding the pre-mint equivalent: `threadIdForDraft(draftId): Hex`.
2. **`create-contract.tsx` already has the exact UI surface needed.** It already has a Chat/Contract toggle (`selected: "chat" | "contract"`), where the Chat tab renders `<XaoMsgComponent peer={peerAddress} embedded onContractProposalSelect={...} />`. No new page is needed — this component call switches from `peer` to `draftId` mode.
3. **The off-chain draft store (`offchainContracts.ts`) is already the right shape for an "event index."** It's keyed by `draftId`, holds `party1`/`party2`/`terms`/`revisionNumber`/`approvals`/`mintedContractAddress`/`lastActivityUnixMs`. It doesn't need to change shape — only how it gets populated (via its own thread + inbox notices, not embedded in DM traffic).
4. **The inbox-notice mechanism already generalizes cleanly.** `DmNotice { from, threadId, ts, preview? }` plus the hard `threadId === dmThreadId(me, from)` check in `subscribeInbox`/`queryInboxNotices` is the anti-spoofing guarantee. Adding a `kind: 'dm' | 'event'` discriminant and branching the recomputation (`dmThreadId` vs `threadIdForDraft`) preserves that guarantee for both thread types.
5. **Headless login sync (`syncAllKnownThreads`) already exists** and already backfills DM threads + rebuilds the off-chain draft store from them. It generalizes to also backfill event threads directly, without needing a draft to already be known locally first (today's chicken-and-egg: a draft is only backfilled if we already know a peer to backfill *from*).
6. **Concurrent drafts between the same two people need independent keys.** DM keys are one-per-pair (`ECDH → HKDF('xao-dm-convkey-v1')`). Two people can have several simultaneous drafts, so event keys must be one-per-**draft**, not one-per-pair.

## 3. Thread taxonomy

| Thread | Keyed by | Hook | Carries | Lifecycle |
|---|---|---|---|---|
| **DM** | `dmThreadId(a, b)` — sorted address pair | `useXaoDm` | `TEXT` (chat bubbles), `CONTACT_CARD` (side-effect only) | Permanent, exists as soon as either party messages the other |
| **Event (pre-mint)** *(new)* | `threadIdForDraft(draftId)` | `useXaoEvent` *(new)* | `TEXT`, `PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT`/`SYSTEM` | Created when a draft is first sent to the counterparty; retired when minted |
| **Contract (post-mint)** | `threadIdForShow(contractAddress)` | `useXaoMsg` | `TEXT`, side-channel types | Starts at mint, permanent (unchanged, existing behavior) |

The DM thread never carries contract content again. The event thread never carries anything but that one draft's negotiation. These are three genuinely independent encrypted channels — not a shared stream filtered by tag.

**Continuity note:** the event thread's history does not carry over to the post-mint contract thread (same discontinuity that already exists today between DM and on-chain threads). This is accepted, not a regression — the off-chain draft store already provides the "final state" continuity that matters (latest terms, revision, approvals); raw chat scrollback restarting at mint is acceptable.

## 4. Encryption — per-draft key derivation

Reuses the existing ECDH-then-HKDF machinery (`ecies.ts`), with a new domain-separated info string that folds in the `draftId`:

- DM: `HKDF(ECDH(myPriv, theirPub), salt, 'xao-dm-convkey-v1')` — unchanged.
- Event: `HKDF(ECDH(myPriv, theirPub), salt, 'xao-event-convkey-v1:' + draftId)` — new.

Same shared secret, different derived key per draft. A leaked event key exposes only that one draft's negotiation — never the DM, never another concurrent draft with the same counterparty. Both sides derive it locally and deterministically, same as the DM key (no transport, no race).

## 5. Inbox notices generalize to carry a `kind`

`DmNotice` becomes:

```ts
interface ThreadNotice {
  kind: 'dm' | 'event';
  from: Address;
  threadId: Hex;
  ts: number;
  preview?: string;
  draftId?: string; // present iff kind === 'event'
}
```

`subscribeInbox` / `queryInboxNotices` currently hard-verify `notice.threadId === dmThreadId(me, from)` before ever surfacing a notice — this becomes a branch on `kind`:
- `kind === 'dm'` → verify against `dmThreadId(me, from)` (unchanged).
- `kind === 'event'` → require `draftId`, verify against `threadIdForDraft(draftId)`.

Same anti-spoofing guarantee (a wallet-attested sender can't claim a `threadId` that doesn't match what it's actually supposed to be), extended to both kinds.

## 6. Hooks and components

- **`useXaoDm`**: drops the `applyDraftMessage` call from its `onMessage`. Becomes pure chat + contact card. No more contract-store side effects.
- **`useXaoEvent({ draftId, peer, session })`** *(new)*: same `useXaoThread` parameterization pattern as `useXaoDm` (derive `threadIdForDraft(draftId)`, negotiate/cache the per-draft key, delegate to `useXaoThread`). Its `onMessage` calls `applyDraftMessage` (moved here from `useXaoDm`) and also supports `postText` for free-text chat under the draft, matching the "full chat per draft" requirement.
- **`XaoMsgComponent`**: gains a third prop/mode, `draftId`, mutually exclusive with `showContract`/`peer`, backed by `useXaoEvent`. Same rendering (`TEXT` → bubbles, `PROPOSAL`/`ACCEPT`/`SYSTEM` → muted system lines, same `onContractProposalSelect` click-through) — no new rendering logic needed, just a third thread source.

## 7. Page wiring

- **`create-contract.tsx`**: its existing Chat tab (`<XaoMsgComponent peer={peerAddress} .../>`) switches to `<XaoMsgComponent draftId={draftId} .../>`. Its three proposal-sending call sites (`handleSendProposal`, the mint-success effect, the sign-success effect) switch from `dmThread.postProposal`/`postSystem` to the equivalent calls on a `useXaoEvent({ draftId, peer: peerAddress, session })` instance. Every time a proposal is sent, an event `ThreadNotice` is also published to both party1's and party2's inbox topics (idempotent — the receiving store just keeps whichever notice has the latest activity), so both sides discover the thread on next login even without opening anything. No Edit/Send button, no new page — the existing Contract tab is the edit surface, the existing Chat tab is the draft chat.
- **`Negotiation.tsx`**: unchanged. `handleDraftClick` already routes to create-contract with the draft prefilled via `sessionStorage`, landing on the Contract tab as today.
- **`Search.tsx`**: Events tab replaces the tokenId-only stub with the same on-chain-summaries + off-chain-drafts merge `Negotiation.tsx` already does (`useAllContractsWithSummaries` + `useOffchainContracts`). Clicking an on-chain event → `contracts-detail` (unchanged). Clicking an off-chain draft → same prefill-and-navigate as `Negotiation.tsx`'s `handleDraftClick`, but with a `tab=chat` query param so create-contract opens on the **Chat** tab instead of Contract (the param drives create-contract's initial `selected` state; defaults to `contract` everywhere else, so `Negotiation.tsx`'s behavior is untouched). Conversations tab is untouched — DMs only.

## 8. Login / sync flow

`syncAllKnownThreads(myAddress, session)` generalizes to process both notice kinds from one inbox replay:
- `kind === 'dm'` → `upsertConversation` into `conversationStore` (unchanged), queue peer for DM thread backfill.
- `kind === 'event'` → queue `(draftId, from)` for event thread backfill.

Backfill then, for every queued DM peer, replays that DM thread's history (unchanged, no longer touches the draft store); and for every queued event, derives/caches that draft's key via ECDH and replays `threadIdForDraft(draftId)`'s history straight into `offchainContracts` via `applyDraftMessage`. This removes today's chicken-and-egg limitation, where an event could only be backfilled if a draft for it was already known locally.

## 9. Migration

None. This is pre-production/dev-stage; existing localStorage draft data was built from the old DM-embedded model and simply stops being written to going forward. Not worth migration code.

## 10. Testing

- **Unit:** `threadIdForDraft` determinism; per-draft key derivation uniqueness (two drafts between the same pair → two different keys, neither equal to their DM key); `ThreadNotice` kind-based validation (an event notice with a mismatched `draftId`/`threadId`, or missing `draftId`, is rejected — same as today's dm-notice check).
- **Regression:** DM thread carries zero contract content after the change; existing DM/contact-card test suites stay green after `useXaoDm` drops `applyDraftMessage`.
- **Flow (mock Waku):** sending a new draft's first proposal publishes an event notice to both inboxes; a fresh login (no locally-known draft) backfills `offchainContracts` purely from the inbox replay; `Negotiation.tsx` and Search's Events tab both reflect it without either party opening Chat first.
- **Existing** on-chain contract-chat (`useXaoMsg`) and Negotiation on-chain summary suites are unaffected — untouched code paths.

## 11. Non-goals / known limitations

- No new UI surface for event chat — it lives entirely inside `create-contract.tsx`'s existing Chat tab.
- No chat-history continuity across the pre-mint → post-mint thread boundary (matches existing DM → on-chain discontinuity).
- No migration of pre-existing localStorage draft data.
- No change to on-chain contract chat (`useXaoMsg`/`threadIdForShow`) or to the Conversations tab's DM-only semantics.

## 12. Decisions locked during brainstorming

- Event chat is a **full chat** (free-text bubbles + structured system lines), fully independent of the DM thread. ✅
- Event thread + inbox notices are created **on send/propose**, not on first save. ✅
- Clicking a draft on **Negotiation** always opens the create-contract **edit form** (Contract tab) — drafts must never appear inside the DM conversation between two users. ✅
- Clicking an off-chain event on **Search** opens the **same create-contract page**, on its existing **Chat tab** — no new page, no Edit/Send button; the Contract tab already is that. ✅
- Search's Events tab shows **all contracts** (on-chain + off-chain), merged the same way Negotiation already merges them. ✅
