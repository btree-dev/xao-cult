# Separating Direct Conversations from Event/Contract Chats (Design Spec)

**Status:** Design — awaiting approval before an implementation plan is written.
**Date:** 2026-07-27 (revised 2026-07-28: pre-/post-mint thread continuity via inbox mint notices)
**Builds on:** `docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md` (DMs, contact cards, off-chain contracts). This spec changes §7 of that design: off-chain contracts move off the DM pair thread onto their own per-draft thread.

## 1. Problem

Today, contract negotiation content (`PROPOSAL` / `COUNTER_PROPOSAL` / `ACCEPT` / mint `SYSTEM`) rides the **same Waku thread** as the free-text DM between two wallets — both are keyed by `dmThreadId(a, b)` and sent through `useXaoDm`. There is no separate thread per draft:

- `create-contract.tsx` sends proposals via `dmThread.postProposal` over the peer's DM thread.
- `useXaoDm`'s `onMessage` calls `applyDraftMessage`, mixing contract-store side effects into the DM pipeline.
- A user's casual chat with someone and their contract negotiation with that same person are literally the same encrypted stream, using the same key.

Separately, the Search page's "Events" list is a stub — it lists on-chain NFT `tokenId`s with placeholder data (`terms: Event #${tokenId}`) and doesn't include off-chain drafts at all. The code has a `// In a real implementation, you'd fetch event contract data for each token` comment marking this.

There's also a pre-existing, unrelated weakness this touches: today's *post-mint* on-chain contract chat (`useXaoMsg`, `threadIdForShow`) does not use a private per-pair key at all — `loadThreadKey` calls `deriveDeterministicThreadKey(showContract)`, a key derived purely from the **public** contract address. Anyone who can read the blockchain can derive that same key and decrypt post-mint chat. The Phase-2 ECIES upgrade (`docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md`) only ever covered DM threads; on-chain contract chat was left on its Phase-1 mechanism. This spec fixes that as a side effect (§4).

This spec:
1. Gives every draft contract its own thread, independent of the DM thread — matching the pattern already used for on-chain contracts (`threadIdForShow(address)`), just for the pre-mint phase.
2. Fixes Search's Events list to show real contract data (on-chain + off-chain), merged the same way `Negotiation.tsx` already does.
3. Carries that same per-draft thread and its real ECDH key across the mint boundary, so pre- and post-mint chat is one continuous, genuinely-private history — without any smart-contract change.

## 2. Key facts that shape the design

1. **The on-chain-contract-chat pattern already exists and is exactly the right shape.** `threadIdForShow(showAddress): Hex` derives a thread id from an on-chain contract's address; `useXaoMsg` and `XaoMsgComponent`'s `showContract` branch already use it. We're adding the pre-mint equivalent: `threadIdForDraft(draftId): Hex`.
2. **`create-contract.tsx` already has the exact UI surface needed.** It already has a Chat/Contract toggle (`selected: "chat" | "contract"`), where the Chat tab renders `<XaoMsgComponent peer={peerAddress} embedded onContractProposalSelect={...} />`. No new page is needed — this component call switches from `peer` to `draftId` mode.
3. **The off-chain draft store (`offchainContracts.ts`) is already the right shape for an "event index."** It's keyed by `draftId`, holds `party1`/`party2`/`terms`/`revisionNumber`/`approvals`/`mintedContractAddress`/`lastActivityUnixMs`. It doesn't need to change shape — only how it gets populated (via its own thread + inbox notices, not embedded in DM traffic).
4. **The inbox-notice mechanism already generalizes cleanly.** `DmNotice { from, threadId, ts, preview? }` plus the hard `threadId === dmThreadId(me, from)` check in `subscribeInbox`/`queryInboxNotices` is the anti-spoofing guarantee. Adding a `kind: 'dm' | 'event'` discriminant and branching the recomputation (`dmThreadId` vs `threadIdForDraft`) preserves that guarantee for both thread types.
5. **Headless login sync (`syncAllKnownThreads`) already exists** and already backfills DM threads + rebuilds the off-chain draft store from them. It generalizes to also backfill event threads directly, without needing a draft to already be known locally first (today's chicken-and-egg: a draft is only backfilled if we already know a peer to backfill *from*).
6. **Concurrent drafts between the same two people need independent keys.** DM keys are one-per-pair (`ECDH → HKDF('xao-dm-convkey-v1')`). Two people can have several simultaneous drafts, so event keys must be one-per-**draft**, not one-per-pair.
7. **The inbox topic already survives a fresh device with zero local state** — that's its entire purpose (§3 of the DM spec: "on login, even fresh device, replay Waku store history of its own inbox topic and rebuild the conversation list — no database"). The same mechanism that lets a fresh device discover DMs and drafts can carry a `contractAddress ↔ draftId` pairing, which is exactly what's needed to resolve a minted contract's address back to its originating thread — no on-chain storage required, bounded only by Waku's store retention window (the same bound the rest of the discovery system already accepts).

## 3. Thread taxonomy

| Thread | Keyed by | Hook | Carries | Lifecycle |
|---|---|---|---|---|
| **DM** | `dmThreadId(a, b)` — sorted address pair | `useXaoDm` | `TEXT` (chat bubbles), `CONTACT_CARD` (side-effect only) | Permanent, exists as soon as either party messages the other |
| **Event** *(new)* | `threadIdForDraft(draftId)` | `useXaoEvent` *(new)* | `TEXT`, `PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT`/`SYSTEM` | Created when a draft is first sent to the counterparty. **Does not retire at mint** — continues to be the thread for this negotiation for its whole life, pre- and post-mint (§4). |
| **Contract (legacy fallback only)** | `threadIdForShow(contractAddress)` | `useXaoMsg` | `TEXT`, side-channel types | Only reached for a contract whose event-thread mapping can't be resolved (§4) — pre-existing contracts minted before this ships, or a device whose Waku store lookup misses. Not used for anything minted after this change, under normal conditions. |

The DM thread never carries contract content. The event thread carries a single draft's entire life, negotiation through post-mint discussion. These are genuinely independent encrypted channels, not a shared stream filtered by tag.

**Continuity across mint:** the event thread does *not* switch to an address-keyed thread at mint. The same `threadIdForDraft(draftId)` and the same per-draft key (§4) keep being used after minting — resolved back from the contract address via an inbox-published mapping (§5), not by asking the chain. This removes the discontinuity an earlier draft of this spec had accepted as a limitation.

## 4. Encryption — per-draft key derivation, carried across mint

Reuses the existing ECDH-then-HKDF machinery (`ecies.ts`), with a new domain-separated info string that folds in the `draftId`:

- DM: `HKDF(ECDH(myPriv, theirPub), salt, 'xao-dm-convkey-v1')` — unchanged.
- Event: `HKDF(ECDH(myPriv, theirPub), salt, 'xao-event-convkey-v1:' + draftId)` — new.

Same shared secret, different derived key per draft. A leaked event key exposes only that one draft's negotiation — never the DM, never another concurrent draft with the same counterparty. Both sides derive it locally and deterministically, same as the DM key (no transport, no race).

**This key keeps being used after mint**, for exactly the two original parties — a strict privacy improvement over today's post-mint mechanism, where `deriveDeterministicThreadKey(contractAddress)` is computable by anyone who can read the chain (§1). The **legacy fallback path** (`threadIdForShow`/`deriveDeterministicThreadKey`) is kept only for contracts whose event-thread mapping can't be resolved (§7) — it is not a second supported "normal" path going forward, purely a compatibility floor so an old or unresolvable contract still has *some* chat rather than none.

## 5. Inbox notices generalize to carry a `kind` — and a mint pairing

`DmNotice` becomes:

```ts
interface ThreadNotice {
  kind: 'dm' | 'event';
  from: Address;
  threadId: Hex;
  ts: number;
  preview?: string;
  draftId?: string;        // present iff kind === 'event'
  contractAddress?: Address; // present iff kind === 'event' AND this draft has been minted
}
```

`subscribeInbox` / `queryInboxNotices` currently hard-verify `notice.threadId === dmThreadId(me, from)` before ever surfacing a notice — this becomes a branch on `kind`:
- `kind === 'dm'` → verify against `dmThreadId(me, from)` (unchanged).
- `kind === 'event'` → require `draftId`, verify against `threadIdForDraft(draftId)`.

Same anti-spoofing guarantee (a wallet-attested sender can't claim a `threadId` that doesn't match what it's actually supposed to be), extended to both kinds.

**Mint pairing.** At mint, in addition to the existing in-thread `SYSTEM` "minted" message, an event `ThreadNotice` carrying `contractAddress` is (re-)published to both party1's and party2's inbox topics — same notice, same validation, just with `contractAddress` now populated. This is what lets *either* party, on any device, replay their own inbox and answer "given this on-chain contract address, which draftId/thread/key does it belong to?" without needing local history from the negotiation (§8).

## 6. Hooks and components

- **`useXaoDm`**: drops the `applyDraftMessage` call from its `onMessage`. Becomes pure chat + contact card. No more contract-store side effects.
- **`useXaoEvent({ draftId, peer, session })`** *(new)*: same `useXaoThread` parameterization pattern as `useXaoDm` (derive `threadIdForDraft(draftId)`, negotiate/cache the per-draft key, delegate to `useXaoThread`). Its `onMessage` calls `applyDraftMessage` (moved here from `useXaoDm`) and also supports `postText` for free-text chat under the draft, matching the "full chat per draft" requirement.
- **`XaoMsgComponent`**: gains a third prop/mode, `draftId`, mutually exclusive with `showContract`/`peer`, backed by `useXaoEvent`. Same rendering (`TEXT` → bubbles, `PROPOSAL`/`ACCEPT`/`SYSTEM` → muted system lines, same `onContractProposalSelect` click-through) — no new rendering logic needed, just a third thread source.
- **`useResolveEventThread(contractAddress)`** *(new, small)*: looks up the local `offchainContracts` store for a draft with `mintedContractAddress === contractAddress` (populated by mint-notice replay, §8) and returns either `{ mode: 'draft', draftId }` or `{ mode: 'legacy', showContract: contractAddress }` if no mapping is found. Any page that opens a minted contract's chat calls this once to decide which prop to hand `XaoMsgComponent` — `useXaoMsg`/`threadIdForShow` is never reached except through this fallback branch.

## 7. Page wiring

- **`create-contract.tsx`**: its existing Chat tab (`<XaoMsgComponent peer={peerAddress} .../>`) switches to `<XaoMsgComponent draftId={draftId} .../>`. Its three proposal-sending call sites (`handleSendProposal`, the mint-success effect, the sign-success effect) switch from `dmThread.postProposal`/`postSystem` to the equivalent calls on a `useXaoEvent({ draftId, peer: peerAddress, session })` instance. Every time a proposal is sent, an event `ThreadNotice` is also published to both party1's and party2's inbox topics (idempotent — the receiving store just keeps whichever notice has the latest activity), so both sides discover the thread on next login even without opening anything. The mint-success effect's existing in-thread `SYSTEM` "minted" message is joined by the inbox mint-pairing notice from §5 (`contractAddress` added to the same `ThreadNotice`), which is what lets this same thread keep being used after mint. No Edit/Send button, no new page — the existing Contract tab is the edit surface, the existing Chat tab is the draft chat.
- **`Negotiation.tsx`**: unchanged. `handleDraftClick` already routes to create-contract with the draft prefilled via `sessionStorage`, landing on the Contract tab as today.
- **`Search.tsx`**: Events tab replaces the tokenId-only stub with the same on-chain-summaries + off-chain-drafts merge `Negotiation.tsx` already does (`useAllContractsWithSummaries` + `useOffchainContracts`). Clicking an off-chain draft → same prefill-and-navigate as `Negotiation.tsx`'s `handleDraftClick`, but with a `tab=chat` query param so create-contract opens on the **Chat** tab instead of Contract (the param drives create-contract's initial `selected` state; defaults to `contract` everywhere else, so `Negotiation.tsx`'s behavior is untouched). Clicking an on-chain event → `contracts-detail`, updated per below. Conversations tab is untouched — DMs only.
- **`contracts-detail.tsx`**: currently embeds `<XaoMsgComponent showContract={contractAddr} embedded={true} />` unconditionally. Switches to calling `useResolveEventThread(contractAddr)` first and passing whichever prop it resolves — `draftId` for anything minted after this ships (continuous history + real key), `showContract` only as the legacy fallback for a contract this device can't map (§4, §6).

## 8. Login / sync flow

`syncAllKnownThreads(myAddress, session)` generalizes to process both notice kinds from one inbox replay:
- `kind === 'dm'` → `upsertConversation` into `conversationStore` (unchanged), queue peer for DM thread backfill.
- `kind === 'event'` → queue `(draftId, from)` for event thread backfill; if the notice also carries `contractAddress`, record that pairing into the draft's `mintedContractAddress` field immediately (the same field `recordMint` already writes when the in-thread `SYSTEM` message is processed) — this is what makes `useResolveEventThread` (§6) able to answer for a contract before its full message history has even been replayed.

Backfill then, for every queued DM peer, replays that DM thread's history (unchanged, no longer touches the draft store); and for every queued event, derives/caches that draft's key via ECDH and replays `threadIdForDraft(draftId)`'s history straight into `offchainContracts` via `applyDraftMessage`. This removes today's chicken-and-egg limitation, where an event could only be backfilled if a draft for it was already known locally, and is also what makes a minted contract's chat resolvable on a device that never saw the negotiation live.

## 9. Migration / compatibility

No data migration — this is pre-production/dev-stage; existing localStorage draft data was built from the old DM-embedded model and simply stops being written to going forward.

What does need to be a real, permanent code path (not throwaway migration script) is the **legacy fallback** in `useResolveEventThread` (§6) and the thread taxonomy's third row (§3): any contract minted *before* this ships, or reached by a device whose Waku store lookup misses the mint notice (outside store retention), has no resolvable draftId mapping and keeps using today's `threadIdForShow`/`deriveDeterministicThreadKey` mechanism indefinitely. This is a permanent compatibility floor, not a temporary migration step.

## 10. Testing

- **Unit:** `threadIdForDraft` determinism; per-draft key derivation uniqueness (two drafts between the same pair → two different keys, neither equal to their DM key); `ThreadNotice` kind-based validation (an event notice with a mismatched `draftId`/`threadId`, or missing `draftId`, is rejected — same as today's dm-notice check).
- **Regression:** DM thread carries zero contract content after the change; existing DM/contact-card test suites stay green after `useXaoDm` drops `applyDraftMessage`.
- **Flow (mock Waku):** sending a new draft's first proposal publishes an event notice to both inboxes; a fresh login (no locally-known draft) backfills `offchainContracts` purely from the inbox replay; `Negotiation.tsx` and Search's Events tab both reflect it without either party opening Chat first.
- **Mint continuity (mock Waku):** minting publishes the `contractAddress`-bearing notice to both inboxes; a fresh device (no local negotiation history) replays its inbox, resolves `useResolveEventThread(contractAddress)` to `{ mode: 'draft', draftId }`, and opens the same continuous thread with the same key — no chain read involved. A contract with no such notice in the store's retention window resolves to `{ mode: 'legacy', showContract }` instead.
- **Existing** on-chain contract-chat (`useXaoMsg`) and Negotiation on-chain summary suites are unaffected on the legacy-fallback path — untouched code paths.

## 11. Non-goals / known limitations

- No new UI surface for event chat — it lives entirely inside `create-contract.tsx`'s existing Chat tab.
- No on-chain / smart-contract change of any kind — mint continuity is achieved entirely through the existing inbox mechanism.
- Mint-continuity resolution is bounded by Waku's store retention window, same bound the rest of the discovery/inbox system already accepts — a device logging in for the first time after that window has passed for a given mint notice falls back to the legacy path rather than failing.
- No migration of pre-existing localStorage draft data; contracts minted before this ships permanently use the legacy fallback path (§9).
- No change to the Conversations tab's DM-only semantics.

## 12. Decisions locked during brainstorming

- Event chat is a **full chat** (free-text bubbles + structured system lines), fully independent of the DM thread. ✅
- Event thread + inbox notices are created **on send/propose**, not on first save. ✅
- Clicking a draft on **Negotiation** always opens the create-contract **edit form** (Contract tab) — drafts must never appear inside the DM conversation between two users. ✅
- Clicking an off-chain event on **Search** opens the **same create-contract page**, on its existing **Chat tab** — no new page, no Edit/Send button; the Contract tab already is that. ✅
- Search's Events tab shows **all contracts** (on-chain + off-chain), merged the same way Negotiation already merges them. ✅
- Pre-/post-mint continuity is achieved via an **inbox-published `{draftId, contractAddress}` pairing** at mint time, not by storing anything on-chain — resolvable by either party on any device via the same store-replay mechanism already used for conversation/event discovery. `threadIdForShow`/`deriveDeterministicThreadKey` becomes a legacy-only fallback for contracts that predate this or fall outside Waku's store retention window. ✅
