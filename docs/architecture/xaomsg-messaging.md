# XaoMsg Messaging (Waku)

**Scope:** client-only, wallet-to-wallet encrypted messaging over Waku — chat, contact-card exchange, and off-chain contract negotiation, with zero backend/server component. Historical design rationale and the decisions behind this shape live in `docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md` and `docs/superpowers/specs/2026-07-24-waku-login-unlock-sync-design.md` (plus earlier `docs/superpowers/plans/2026-04-22-xaomsg-phase1-*.md`) — this doc is **current-state only**; treat those specs as "why," not "what's true today" (see Spec drift below).

## Purpose

XaoMsg replaces a former XMTP-based chat stack (fully removed) with a Waku light-client transport carrying three payload kinds over one encrypted 1:1 relationship: **direct chat** (cold-message by wallet address, no contract required), **contact cards** (profile sync, no chat bubble), and **off-chain contract negotiation** (compose/counter/approve a contract before it's minted on-chain). Everything is end-to-end encrypted so only the two wallets can read it; Waku itself is a dumb relay with no server-side conversation list, so the client reconstructs all indexing itself from `localStorage` + Waku store replay.

## Key modules

Identity & crypto (`src/lib/xaomsg/`):
- `session.ts` — session keypair + `SessionCert` (wallet-signed authorization), 30-day `localStorage`-persisted session
- `crypto.ts` — AES-GCM encrypt/decrypt primitives + the legacy deterministic per-show-address thread key (still used for on-chain contract chat, see Gotchas)
- `ecies.ts` — ECDH + HKDF key derivation: both the deterministic DM conversation key and the ECIES wrap/unwrap used for inbox notices
- `envelope.ts` — canonical JSON hashing, envelope build/sign/verify
- `conversationKey.ts` — `localStorage` cache of each DM thread's raw AES key (keyed `xao-cult-dm-convkeys-v2`)

Transport & addressing:
- `waku.ts` — lazy-singleton Waku light node (publish / subscribe / store-query history)
- `threadId.ts` / `dmThreadId.ts` — thread ID derivation (per-contract vs. per-address-pair)
- `topicId.ts` / `inboxTopic.ts` — opaque Waku content-topic derivation from a thread ID / from an address

Discovery & indexing:
- `inbox.ts` — per-address inbox topic: public key-bundle publish, ECIES-encrypted DM notices, verified read-back
- `conversationStore.ts` — `localStorage` conversation list (`xao-cult-dm-conversations`), owner-keyed, merge-by-latest-activity
- `sync.ts` — headless `syncAllKnownThreads()`, the post-unlock background backfill
- `merge.ts` — dedupe+sort resolved messages by `messageId`/`sentAt`, shared by live/store/optimistic paths

Payload/content-type handling:
- `types.ts` — `ContentType` enum + all payload shapes (wire format)
- `contactCard.ts` — build/apply contact-card payload + "already sent" localStorage flag
- `offchainContracts.ts` — `localStorage` off-chain draft store (`xao-cult-offchain-contracts`): upsert/approve/mint/dedup
- `draftSync.ts` — routes a resolved PROPOSAL/COUNTER_PROPOSAL/ACCEPT/SYSTEM message into the draft store; shared by live (`useXaoDm`) and headless (`sync.ts`) paths
- `messagePreview.ts` — per-content-type conversation-list preview text

Hooks (`src/hooks/`):
- `useXaoThread.ts` — the shared pipeline: subscribe → decrypt → verify → merge → post; every content type goes through `post()`
- `useXaoDm.ts` — wraps `useXaoThread` for a wallet-pair DM: derives thread ID + conversation key, auto-sends contact card once ready, routes inbound messages to profile cache / draft store
- `useXaoMsg.ts` — wraps `useXaoThread` for a deployed contract's chat (legacy Phase-1 path, thread key still deterministic — see Gotchas)
- `useXaoInbox.ts` — subscribes to own inbox topic, publishes key bundle, feeds the Search-page conversation list
- `useXaoMsgSession.ts` — the `unlock()` React hook (mint keypair → wallet signature → persist session)
- `useOffchainContracts.ts` — reads/merges off-chain drafts for the Negotiation page, filtered to not-yet-minted

## Identity & encryption

- **Session keypair**: `session.ts` mints a fresh secp256k1 keypair per unlock; `SessionCert` binds `walletAddress ↔ sessionPublicKeyHex ↔ expiresAtUnixMs` via an EIP-191 wallet signature (`sessionChallengeString`, locked format, "do NOT change without a v2"). Every envelope carries the sender's cert, so verifying one message yields the sender's wallet-attested public key for free.
- **Duration & storage — current**: `SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000` (30 days), persisted in `localStorage` under `xao-msg-session-<wallet lowercased>` (survives tab/browser close; only explicit logout or expiry clears it). Falls back to an in-memory `Map` if `localStorage` throws (some private-browsing modes) — session then only lasts the tab's lifetime.
- **DM conversation key — current mechanism is deterministic ECDH, not transported.** `ecies.deriveDmConversationKeyRaw(mySessionPriv, theirSessionPub)` does `ECDH → HKDF-SHA256(info="xao-dm-convkey-v1")` — both parties independently compute the *same* 32-byte AES key from nothing but each other's session pubkey (obtained via the peer's key-bundle on their inbox topic). No key generation, no wrapping, no "who generates it" race. Cached locally in `conversationKey.ts` (`xao-cult-dm-convkeys-v2` — the `-v2` suffix deliberately orphans a stale v1 scheme, see Gotchas).
- **Inbox notices** still use real ECIES: `ecies.wrapBytes`/`unwrapBytes` derive a separate KEK via `HKDF(info="xao-dm-kek-v1")` (domain-separated from the conv-key HKDF) and AES-GCM-wrap the notice payload to the recipient's session pubkey.
- **On-chain contract chat threads** (`threadIdForShow`) still use `crypto.deriveDeterministicThreadKey(showAddress)` — a plain `keccak256(domain ‖ address)`, no ECDH at all. See Gotchas: this is a known-weak Phase-1 leftover that DMs upgraded past but contract threads did not.

## Data flow / lifecycle

1. **Login → unlock.** `src/pages/index.tsx` redirects to `src/pages/unlock-chat.tsx` after Dynamic login completes (`src/pages/index.tsx:16`). `/unlock-chat`: if an unexpired session exists, skip straight to `/dashboard`; otherwise auto-fire `unlock()` (gated on `isWalletReady`, not just `address` — `useXaoMsgSession.ts:23` — because wagmi's wallet client hydrates a render or two after `address` appears, and calling `unlock()` before it's ready silently no-ops).
2. **Unlock signs & persists.** `useXaoMsgSession.unlock()` mints a session keypair, builds+signs the challenge string, persists `{cert, privateKeyHex}` to `localStorage`.
3. **Background sync (fire-and-forget).** On session ready, `unlock-chat.tsx` calls `syncAllKnownThreads(address, session)` without awaiting, then immediately `router.replace('/dashboard')`. `sync.ts`: publishes own key bundle → replays own inbox-topic store history to discover DM peers → for every peer already known from a local draft or a newly-discovered notice, derives (or reuses) the conversation key and replays that thread's store history through `draftSync.applyDraftMessage`, so the Negotiation tab is current without visiting Chat first.
4. **Opening a DM thread.** `useXaoDm({peer, session})` derives `dmThreadId(me, peer)` → `contentTopicForThread(...)`. `negotiateKey()`: check `conversationKey` cache; if missing, `queryPeerKeyBundle(peer)` (reads peer's inbox topic, verifies newest-first, matches wallet address), then `deriveDmConversationKeyRaw`, cache it, `upsertConversation`, and best-effort publish a discovery `DmNotice` to the peer's inbox (failure here doesn't block — the key is already usable locally). If no peer key bundle is found at all, status is `'no-peer-key'` and sends are blocked (peer has never used XaoMsg).
5. **Thread pipeline.** `useXaoThread` subscribes live *before* backfilling history (so nothing published mid-query is missed; `mergeResolved` dedupes overlap), decodes each byte payload → `decryptBody` → `JSON.parse` → `verifyEnvelope` (cert valid, not expired, sender matches cert, payload hash matches, signature valid) → `record()` → `onMessage` callback (fired once per unique `messageId`, guards against the sender's own light-push echo landing before/after the optimistic insert).
6. **Content-type routing.** `useXaoDm`'s `onMessage`: `CONTACT_CARD` → verify sender===peer and payload's own claimed address===sender, then `ProfileCache.setProfile()`; everything else → `draftSync.applyDraftMessage` (upserts/approves/mints the off-chain draft store) → `messagePreview.formatMessagePreview` → `conversationStore.upsertConversation` (only `TEXT` produces a preview/unread-worthy update; other types return `null` preview but still bump `lastActivityUnixMs` via the thread mechanics... actually only TEXT calls `upsertConversation` here — non-TEXT previews are `null` and skip the conversation-list bump entirely).
7. **Sending.** `useXaoThread.post()` builds the unsigned body, signs+hashes it into an `OnWireEnvelope`, AES-GCM-encrypts with the thread key, publishes to the topic, and does an optimistic local `record()` insert (deduped against the inevitable Waku echo of your own light-push).

## Data model / key types

`OnWireEnvelope = { body: MessageBody, payloadHash, signature, cert }`. `MessageBody = { v, messageId, threadId, contentType, parentHash, payload, sentAt, sender }`. Hashing goes through `hashableStringify` = `canonicalStringify(JSON.parse(JSON.stringify(value)))` — a real JSON round-trip *before* canonicalization, specifically so `undefined`-valued keys (routine in a partially-filled contract-proposal form) hash identically to what the wire actually carries after its own `JSON.stringify`/`JSON.parse` trip (see the long comment in `envelope.ts:5` — this was a real, previously-shipped bug: `8835072 fix(xaomsg): canonicalStringify must drop undefined-valued keys`).

`ContentType` (wire-locked integer values, do not reorder): `TEXT=0, PROPOSAL=1, COUNTER_PROPOSAL=2, ACCEPT=3, REJECT=4, SYSTEM=5, CONTACT_CARD=6`.

Thread ID derivation — two independent domains:
- `threadIdForShow(showAddress)` = `keccak256("xao-thread-v1" ‖ lower(address))` — one thread per deployed contract.
- `dmThreadId(a,b)` = `keccak256("xao-dm-thread-v1" ‖ sorted(lower(a), lower(b)))` — sorted so both parties derive the same ID regardless of who opens first.
- Both feed `contentTopicForThread(threadId)` = `/xao/1/<keccak256("xao-msg-topic-v1" ‖ threadId)>/json` — a *second* hash, so the Waku topic string doesn't reveal the thread ID (or contract address) to an outside observer.
- `inboxTopicForAddress(addr)` = `/xao/1/<keccak256("xao-inbox-topic-v1" ‖ lower(addr))>/json` — deliberately *derivable from the address alone* (a cold sender needs to find it without prior contact).

## Off-chain contract drafts & contact cards

Both ride the same DM envelope pipeline as chat but never render as bubbles — `XaoMsgComponent`'s `renderMessage()` routes them to a muted, centered "system line" instead (`ContactCardDisplay`-style copy, contract proposal/accept/reject/mint lines with emoji markers).

- **Contact card**: `useXaoDm` auto-sends one `CONTACT_CARD` envelope per thread the first time status flips to `'ready'` (guarded by `hasSentContactCard`/`markContactCardSent`, a `localStorage` set so a remount doesn't resend). Receiver applies it straight into `ProfileCacheContext.setProfile()`.
- **Off-chain draft lifecycle**: compose → `PROPOSAL` (carries `Partial<IContract>` + `revisionNumber` + a stable `draftId` embedded in `payload.data.draftId`) → `offchainContracts.upsertDraft()` (strictly-higher `revisionNumber` always wins, so an out-of-order store replay can't regress a newer counter-proposal). Either party may `COUNTER_PROPOSAL` (same `draftId`, bumped revision). `ACCEPT` carries only a `proposalHash`; `draftSync` resolves it back to a `draftId` via a per-thread-replay `Map<bodyHash, draftId>` built as proposals are seen (assumes causal order, which Waku store replay preserves) and calls `recordApproval`. Minting is an **existing on-chain flow** (see `contracts-nft` doc) — completely untouched by XaoMsg; XaoMsg's only involvement is that after a successful mint, the minter posts a `SYSTEM` message (`{event:'minted', draftId, contractAddress}`) so the peer's `recordMint()` retires exactly that draft. **Fallback dedup** (`isMinted()`): if a draft has no recorded mint (e.g. minted on a device that never saw the SYSTEM message), it's hidden anyway once an on-chain summary matches `(party1, party2 in either order, eventName)` — heuristic, can mis-merge same-named contracts between the same parties.
- **Negotiation page** (`src/pages/contracts/Negotiation.tsx`) renders on-chain summaries (`useAllContractsWithSummaries`) plus not-yet-minted off-chain drafts (`useOffchainContracts`, which filters `listDrafts()` through `isMinted()`) as three visual buckets: "Requires Attention" (on-chain status 1/2), "Draft — off-chain", "Waiting" (on-chain status 0).

## Integration points

- **`ProfileCacheContext`** (`src/contexts/ProfileCacheContext.tsx`) — generic `localStorage` profile cache (`xao-cult-profile-cache`), keyed by lowercased address, predates XaoMsg but is XaoMsg's only write path for peer profile data now.
- **Search page** (`src/pages/chat-Section/Search.tsx`) — conversation list is 100% `useXaoInbox(session).conversations`, mapped into the page's existing render shape; also lists on-chain event/contract NFTs from `useGetUserNFTs` in the same feed. "Start new conversation" accepts a raw `0x...` address typed into the search box (no separate contacts list).
- **Negotiation page** — see above; `contracts-nft` subsystem doc covers the actual minting call this page's `handleDraftClick` eventually leads to via `create-contract.tsx`.
- **`useGetContracts.ts` (`ContractSummary`/`useAllContractsWithSummaries`)** — the on-chain read side that `isMinted()`/`useOffchainContracts` merge against; not part of this subsystem.

## Gotchas & constraints

- **Spec drift — conversation-key transport.** Both spec docs (2026-07-19 and 2026-07-24) describe the DM conversation key as *initiator-generated and ECIES-wrapped for transport*. That was replaced (commit `cb570d4 fix(xaomsg): derive DM conversation keys via ECDH instead of racing to transport one`) with the deterministic-ECDH-derivation scheme described above — no key is generated or transported at all anymore; `DmNotice.convKeyB64` still exists on the wire type but is dead weight kept only for backward wire-compatibility / discovery-ping purposes (comment in `useXaoInbox.ts:29` confirms "Key material no longer travels in the notice"). Don't trust the specs' §4 on this point.
- **`src/lib/xaomsg/README.md` is stale.** It describes the pre-DM Phase-1 world (24h session, per-thread key from ShowContract address only, sessionStorage). Every one of those facts has changed. Update or delete it — this doc supersedes it.
- **Contract-thread encryption was never upgraded.** `threadKey.ts`'s comment ("Plan 2 swaps in an ECIES handshake") never happened for the *contract-address-keyed* thread — `useXaoMsg`/`loadThreadKey` still calls `deriveDeterministicThreadKey(showAddress)`, a bare hash with no wallet-binding at all. Anyone who knows the deployed contract's address can derive that thread's AES key and read its chat. Only DM threads got the ECDH upgrade. This is a real, currently-live weakness, not just historical.
- **In-component "24h" copy is stale and misleading.** `XaoMsgComponent.tsx:69,85` (the fallback in-chat unlock button, used only if a session expires mid-session) still says "XaoMsg unlocks for 24 hours" / "Unlock chat for 24h" — the actual duration is 30 days. Cosmetic but user-facing; fix opportunistically if touching that file.
- **Waku light-push peer count.** Default is 1 peer; if that peer requires an RLN anti-spam proof (which this client never generates), every send fails outright. Fixed by requesting 3 peers (`waku.ts:27`, commit `916fd8b`) so one RLN-requiring peer isn't a single point of failure. A partial per-peer failure (some succeed, some don't) is treated as success; only *total* failure throws.
- **`conversationKey` storage key is versioned (`-v2`).** A prior scheme (pre-ECDH, each side could independently generate a key with no negotiation, permanently diverging the two views of a thread) is intentionally orphaned rather than migrated — old `-v1` entries are simply ignored, forcing a fresh ECDH derivation.
- **`useXaoMsgSession.ts` comment says "Restore from sessionStorage"** (line 34) but the actual backing store is `localStorage` (per the 30-day change) — comment lagged the code, harmless but can mislead a reader.
- **StrictMode / concurrent-negotiation guard.** `useXaoDm.ts` keeps a module-level `inFlightNegotiations: Map<Hex, Promise>` specifically to dedupe React StrictMode's dev-mode mount→cleanup→mount (or any fast remount) so two effect instances never both fire a peer-key lookup + discovery-notice publish for the same thread concurrently.
- **`useOffchainContracts` infinite-loop fix.** `useAllContractsWithSummaries`'s `contracts` array is a new reference every render even when on-chain data hasn't changed; depending on it directly caused "Maximum update depth exceeded" (observed live). Fixed by deriving a stable string key (`summariesKey()`) from the array's content and depending on that primitive instead.
- **Inbox topic is a metadata side-channel.** Anyone who knows your address can compute `inboxTopicForAddress(you)` and observe *that* you receive DMs and their timing/volume (notices are ECIES-encrypted, so not sender/content). Publishing a key bundle also reveals you use XaoMsg at all. No spam control on cold notices — anyone can post to your inbox topic; only signature/cert checks gate what's *trusted*, not what's *accepted onto the topic*.
- **Waku store peers are best-effort.** `queryHistory` waits up to 15s for a Store protocol peer and silently returns (logs a warning) if none connects — some bootstrap nodes don't serve Store. History backfill can silently be a no-op; this is not surfaced to the UI.
- **`src/pages/wallets.tsx`** was confirmed orphaned/unlinked during the 2026-07-24 investigation but deliberately left alone (out of scope) — not part of this subsystem despite the name.
