# XaoMsg Session Lifecycle — Login-Triggered Unlock & Background Sync (Design Spec)

**Status:** Design — awaiting approval before an implementation plan is written.
**Date:** 2026-07-24
**Builds on:** `docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md` (session certs, inbox topic, off-chain contract store, DM/contract-address thread keying — all unchanged in shape, only lifecycle/timing changes here). Note: that spec's §4 mentions "the 24h session-key rotation" as the reason conversation keys are cached — this doc changes that rotation period to 30 days; the caching rationale still holds, just on a longer cycle.

## 1. Problem & goals

Today XaoMsg's "unlock" (a wallet signature that mints a session keypair cert, `session.ts`) is:
- Manual — a button inside a chat panel, only shown once a chat panel is opened.
- Short-lived — 24h, stored in tab-scoped `sessionStorage`, so it's lost on every tab/browser close.
- Disconnected from login — Waku client init and the session unlock have no relationship to Dynamic wallet login completing.

This means users re-prompt for a signature constantly, and the Contracts Under Negotiation tab only reflects new/updated drafts if the user happens to visit Chat first (nothing syncs proactively).

Goals:
1. Users should unlock chat once and not think about it again for a long time (30 days), across tabs and browser restarts.
2. Unlocking should happen as an explicit step immediately after login, not buried behind opening a chat panel.
3. Right after unlocking, the app should proactively catch up on any contract drafts/updates shared while the user was away, so the Negotiation tab is current without a separate visit to Chat.
4. Confirm (no behavior change expected) that pre-mint sharing stays keyed by `draftId` over the DM thread, and post-mint sharing stays keyed by contract address.

Non-goals: new-activity badges/toasts (explicitly deferred to a future feature), any backend/server-side Waku relay, changes to the minting flow itself.

## 2. Session duration & storage

`src/lib/xaomsg/session.ts`:

- `SESSION_DURATION_MS`: `24 * 60 * 60 * 1000` → `30 * 24 * 60 * 60 * 1000`.
- Storage backend: `sessionStorage` → `localStorage`. Same key scheme (`xao-msg-session-<wallet lowercased>`), same `PersistedSession` shape (`{ cert, privateKeyHex }`).
- **Rolling renewal:** every login that finds no valid session mints a fresh cert with `expiresAtUnixMs = Date.now() + 30 days`, overwriting any prior entry for that address. Because unlock now runs on every login (§3), an actively-returning user's session effectively never lapses — only 30+ days of not logging in, a new device/browser, or cleared storage triggers a fresh signature prompt.
- **Logout hygiene:** on explicit Dynamic disconnect/logout, call a new `clearSession(address)` to remove that address's `localStorage` entry. Tab/browser close no longer clears it (that's the point of the change) — only explicit logout does.
- **Fallback:** if `localStorage` is unavailable (e.g. some private-browsing modes), fall back to an in-memory-only session for that tab rather than throwing; the unlock page will simply re-prompt on next load in that mode.
- **Multi-account:** unchanged — keyed by address, so switching Dynamic accounts requires its own unlock the first time.

## 3. Login flow — new unlock page

Today: `src/pages/index.tsx` has a `useEffect` on `dynamicUser` that calls `router.push('/dashboard')` the instant Dynamic login completes. Dynamic's own SDK briefly shows its own connecting/status overlay during this — that's outside our code and not something we can remove, but our job is to add no *additional* delay of our own.

Change: redirect to a new page, `src/pages/unlock-chat.tsx`, instead of `/dashboard`.

`/unlock-chat` behavior:
1. **Guard:** if no wallet is connected (`dynamicUser` falsy), redirect to `/`.
2. **On mount:** check `localStorage` for an existing valid (unexpired) session for the connected address.
   - **Valid session exists** → nothing to do; immediately `router.replace('/dashboard')`.
   - **No valid session** → auto-fire the signature request (`unlock()`) immediately on page load, for *all* wallet types (embedded/Dynamic-managed and external alike — no separate button click required). Show a simple "Unlocking chat…" status while pending.
3. **On signature success:** persist the new 30-day session; kick off the app-wide sync (§4) as fire-and-forget (do not await it); immediately `router.replace('/dashboard')`. Sync results stream into the Negotiation tab as they arrive — no user-visible wait.
4. **On signature failure/rejection:** show an error state with a "Try again" button (re-invokes step 2's auto-fire). Stay on this page — dashboard is blocked until unlocked, since chat is core to the app's workflow.

The existing in-chat-panel "Unlock chat" button/flow in `XaoMsgComponent.tsx` can remain as a fallback path (e.g. if a session expires mid-session without a fresh login), but the primary unlock path moves to this page.

## 4. App-wide background sync

Needs to run once, globally, right after unlock succeeds — independent of any chat component being mounted.

**Approach: headless sync module.** Extract the "decode envelope → upsert into off-chain draft store" logic currently inline in `useXaoDm`'s `onMessage` handler (`src/hooks/useXaoDm.ts`) into a shared pure function (e.g. `src/lib/xaomsg/draftSync.ts`). Add `syncAllKnownThreads(address)` in a new `src/lib/xaomsg/sync.ts` that:

1. Runs the same inbox backfill logic `useXaoInbox` performs today (publish key bundle, `queryHistory` on the address's own inbox topic) to discover new counterparty threads not yet known locally.
2. Iterates the `draftId`s already present in the local off-chain contract store (`offchainContracts.ts`) involving `address`, computes each `dmThreadId`, and runs `queryHistory` on each to catch missed proposal/counter/accept/system messages — feeding results through the shared processor from step 1's extraction.

This is called imperatively (not as a mounted hook) from `/unlock-chat` after unlock succeeds. No new permanent subscriptions are created by the sync itself; live Filter subscriptions continue to be owned by whatever chat UI is actually open, as today.

Rejected alternatives:
- **Mounting hidden instances of `useXaoInbox`/`useXaoDm` at the app root** — reuses hooks as-is but creates N permanent live Waku subscriptions app-wide, duplicating whatever the Chat page separately subscribes to, and ties "Negotiation tab freshness" to component mount lifecycle.
- **Server-side Waku relay writing to Supabase** — most robust against client-side network flakiness, but requires new backend infrastructure and cuts against XaoMsg's fully client-side architecture; out of proportion to this ask.

## 5. Draft/contract chat association (confirmation only)

Verified against the current implementation — already satisfies the requirement, no code change:

- **Pre-onchain:** proposals travel over the wallet-pair DM thread (`dmThreadId(a,b)`), with `draftId` embedded in the message payload (`ContentType.PROPOSAL`/`COUNTER_PROPOSAL`). A draft's full history is reconstructable from that thread + `draftId`.
- **Post-mint:** a `SYSTEM` "minted" message retires the draft; all further chat for that contract happens on the contract-address-keyed thread (`threadIdForShow`).

The sync in §4 backfills both: known-draft DM backfill covers pre-mint, and the existing per-contract backfill on the contract-detail page (unchanged) covers post-mint.

## 6. Error handling & edge cases

- **Sync failure** (Waku network issue during background backfill): log only, fail silently per source. The user has already reached `/dashboard`; on-chain contract data (via wagmi reads) is unaffected since it doesn't depend on Waku. The Negotiation tab shows existing local state until the next successful sync.
- **`/unlock-chat` reached with no wallet connected** (direct nav, stale bookmark): redirect to `/`.
- **`localStorage` unavailable:** in-memory fallback per §2; page re-prompts every load in that mode.
- **Corrupted/tampered session on read** (cert verification fails): treat as no session, fall into the normal unlock flow.

## 7. Testing plan

- Unit: `session.ts` — 30-day duration constant, `localStorage` round-trip, expiry boundary, `clearSession` on logout.
- Unit: extracted envelope→draft-store processor and `syncAllKnownThreads` — mock `queryHistory`, assert store upserts, dedupe against existing `merge.ts` logic.
- Component: `/unlock-chat` — valid-session skip path, auto-fire signature, success → redirect + background sync kickoff, failure → retry UI, no-wallet → redirect to `/`.
- Manual/live (per prior XaoMsg testing experience — code review alone doesn't catch Waku/StrictMode races): two-wallet login flow end-to-end; confirm the Negotiation tab picks up a draft shared while the recipient was logged out, across a real browser restart (not just tab reload) to prove `localStorage` persistence actually survives it.

## 8. Out of scope

- New-activity badges/toasts on the Negotiation nav item.
- Any backend/server-side Waku relay or materialized view.
- Changes to the on-chain minting flow.
- Removing/repurposing `src/pages/wallets.tsx` (confirmed orphaned/unlinked during investigation, but not part of this change's scope — left as is unless separately requested).
