# XaoMsg Phase 2 — Waku-Only Messaging: Direct DMs, Contact Cards & Off-Chain Contracts (Design Spec)

**Status:** Design — awaiting approval before an implementation plan is written.
**Date:** 2026-07-19
**Supersedes limitations:** the "Weak thread key (Plan 2 fixes)", "Single thread type" / "Relationship threads (Plan 4)", and "XaoMsg runs in parallel to XMTP" items in `docs/superpowers/plans/2026-04-22-xaomsg-phase1-known-limits.md`.

## 1. Problem & goals

Today XaoMsg threads are scoped to a **deployed ShowContract address** (`threadIdForShow`). Two users can't message unless a contract already exists. Separately, the app still carries a disabled **XMTP** stack that once handled chat, contact-card exchange, and contract-proposal delivery.

This phase makes **Waku the single messaging channel** and removes XMTP entirely. Over one Waku DM relationship we carry three kinds of payload:

1. **Direct chat** — Bob can **cold-message** Alice by wallet address alone (no contract). Either party opens the conversation from just the two addresses and sees full history. Incoming DMs appear as a **conversation list on the Search page** (`/chat-Section/Search`), which currently shows "Messaging is currently disabled".
2. **Contact cards** — a user's profile (username, picture, …) is delivered over the same channel. It does **not** render as a chat bubble; it updates the local profile cache behind the scenes and drops a muted system line ("Alice updated her profile details").
3. **Off-chain contracts** — a user can compose a contract and send it to the counterparty **without deploying on-chain first**. It does **not** render as a chat bubble; it appears in the **Contracts Under Negotiation page** (`/contracts/Negotiation`) and drops a muted system line ("Alice sent a contract"). Negotiation happens off-chain; either party can later mint it on-chain, which is itself announced via a system line.

All message content is **end-to-end encrypted** so only the two wallets can read it — even someone who knows both addresses cannot. Profiles and contracts are cached in **localStorage** for instant load and updated gradually as messages arrive.

Non-goals are in §11.

## 2. Key facts that shape the design

1. **The Waku/topic layers are already generic.** `contentTopicForThread(threadId: Hex)` and all of `waku.ts` take an opaque `threadId`, not an address. A DM only needs a different threadId derivation; the transport is unchanged.
2. **A wallet address is not a public key** — it's `keccak256(pubkey)[12:]`, a one-way hash. You cannot ECIES-encrypt to an address; you need the secp256k1 public key.
3. **XaoMsg already mints a real, wallet-verified public key per user.** `session.ts` makes a secp256k1 **session keypair**; the `SessionCert` binds `walletAddress → sessionPublicKeyHex` via a wallet signature (`verifySessionCert`). **Every envelope already carries this cert**, so receiving any message from Bob yields Bob's ECDH-capable, wallet-attested public key for free.
4. **Waku has no server-side conversation list.** XMTP had `conversations.list()`; Waku remembers nothing. The Search-page list must be reconstructed by us.
5. **The payload shapes already exist.** `src/types/contactMessage.ts` (`ContactCardMessage`) and `src/types/contractMessage.ts` (`ContractProposalMessage`, carrying `Partial<IContract>`) were built for XMTP and map directly onto the xaomsg envelope. `ContentType` already includes `PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT`/`REJECT`/`SYSTEM`.
6. **The caches already exist / are trivial.** `ProfileCacheContext` is already a localStorage cache keyed by wallet address (`setProfile()`), so a contact card just calls `setProfile()`. An off-chain contract store is a new, analogous localStorage cache.
7. **Encryption cost is negligible vs. Waku propagation** (AES-GCM = µs; one ECDH per conversation, cached). ECIES will not make chat feel slower.

## 3. Transport architecture

Two Waku topics per relationship, plus one per user:

| Topic | Derived from | Who reads | Contents |
|---|---|---|---|
| **Pair topic** `pairTopic(a,b)` | `contentTopicForThread(dmThreadId(a,b))` — opaque | The two parties (need both addresses) | All encrypted envelopes: chat + contact cards + contracts |
| **Inbox topic** `inboxTopic(x)` | `keccak256(domain ‖ x)` — derivable from x's address alone | Anyone can subscribe; only x can read notices | (a) x's public **key bundle**; (b) **DM notices** encrypted to x |

`dmThreadId(a,b)` sorts the two lowercased addresses so both parties independently derive the **same** pair topic regardless of who started — this powers "open by both addresses and see history."

The inbox topic is intentionally derivable from an address alone (a cold sender must find it). Consequences, both handled:
- **Key bundle** there is *public* (the cert is already broadcast with every message — no new exposure).
- **DM notices** there are *ECIES-encrypted to the owner*, so an observer watching `inboxTopic(Alice)` learns only that Alice receives DMs and their timing/volume — not who from or what about (§11).

### Inbox topic replaces XMTP's server list — three roles
1. **Key-bundle registry** — on session unlock a user publishes their current `SessionCert` here, so cold senders can fetch a verified public key to encrypt to.
2. **Cold-DM notification** — starting a conversation drops an encrypted notice here so the recipient discovers it without prior knowledge of the sender.
3. **Durable conversation index** — every conversation leaves a notice here; on login (even fresh device) the client replays Waku **store** history of its own inbox topic and rebuilds the conversation list — **no database**.

## 4. Encryption (ECIES via session keys)

**Per-conversation content key, ECIES-wrapped** (chosen so history survives the 24h session-key rotation):

- The initiator generates a random 256-bit AES-GCM **conversation key `K`**.
- `K` is ECIES-**wrapped** to the recipient's current session pubkey and to the initiator's own, delivered in the DM notice / pair topic. Wrapping = `ECDH(mySessionPriv, theirSessionPub) → HKDF-SHA256 → AES-GCM` over `K` (`@noble/secp256k1` for ECDH, `@noble/hashes` for HKDF — SubtleCrypto has no secp256k1).
- **Every envelope body** (chat, contact card, contract) is encrypted with `K` (plain AES-GCM), reusing `encryptBody`/`decryptBody`. The signing/verification chain (`buildEnvelope`/`verifyEnvelope`) is unchanged.
- Both parties **cache `K` in localStorage** per conversation, so history stays readable across session-key rotations on that device.

**No-key fallback (decided):** if a cold sender finds **no key bundle** in the recipient's inbox (recipient never used XaoMsg), the send is **blocked** with a clear message. Never silently downgrade.

## 5. Message taxonomy — visible vs. side-channel

All three payload kinds ride the same envelope on the pair topic; the receive pipeline routes by `ContentType`:

| ContentType | Renders as | Side effect |
|---|---|---|
| `TEXT` | **Chat bubble** | — |
| `CONTACT_CARD` *(new)* | Muted **system line** ("Alice updated her profile details") | `ProfileCache.setProfile()` |
| `CONTRACT_PROPOSAL` / `COUNTER_PROPOSAL` | Muted **system line** ("Alice sent a contract" / "Alice sent an updated contract") | Upsert into off-chain contract store |
| `ACCEPT` / `REJECT` | Muted **system line** | Update draft approval state |
| `SYSTEM` | Muted **system line** (e.g. "Contract minted on-chain") | May reference an on-chain contract |

System lines are non-bubble, centered, muted, and **not** persisted as chat content — they're derived from the side-channel events in the thread. Only `TEXT` counts as conversation content for previews/unread.

## 6. Contact cards → profile cache

- On opening/first-contact in a DM, a client auto-sends its own contact card (built from `currentUserProfile`) as a `CONTACT_CARD` envelope.
- On receipt, the pipeline calls `ProfileCache.setProfile(card)` (existing localStorage cache) and emits the "updated profile" system line. No chat bubble.
- Profiles thus populate gradually as cards arrive; the Search/Chat UI already reads names/pictures via `useProfileCache().getProfile()`.

## 7. Off-chain contracts → Negotiation page

### Lifecycle (decided)
1. **Compose & send.** A party composes a contract and sends a `CONTRACT_PROPOSAL` (carrying `Partial<IContract>` + `revisionNumber`). It is upserted into a local **off-chain contract store** and appears in Negotiation as an off-chain draft; a system line fires.
2. **Negotiate off-chain.** While unsigned, **either party may modify** and send a `COUNTER_PROPOSAL` (same draft, bumped `revisionNumber`). Latest revision wins in the store.
3. **Approve.** Both parties signal approval by signing/approving (`ACCEPT`). Approval state is tracked per draft.
4. **Mint on-chain.** **Either party** may mint the contract on-chain (existing minting flow). On success they send a `SYSTEM` "minted on-chain" message referencing the new contract.
5. **Promote & dedup.** Once an on-chain ShowContract exists for the pair, the off-chain draft is **dropped** and the UI refers to the on-chain contract. **Dedup key: `(party1, party2, eventName)`** (case-insensitive, party order-independent) — no Solidity change required.

### Negotiation page merge
`Negotiation.tsx` currently lists only on-chain summaries (`useAllContractsWithSummaries`). It will render **`merge(onChainSummaries, offChainDraftsNotYetMinted)`**, where a draft is "minted" (and hidden) if an on-chain summary matches its dedup key. Off-chain drafts show a distinct label (e.g. "Draft — off-chain"); the existing on-chain "Requires Attention" / "Waiting" sections are unchanged.

### Off-chain contract store
A new localStorage cache `xao-cult-offchain-contracts`, keyed by dedup key (or a draftId), holding `{ parties, terms (Partial<IContract>), revisionNumber, approvals, lastActivityTs }`. Populated by `CONTRACT_PROPOSAL`/`COUNTER_PROPOSAL`/`ACCEPT` envelopes; entries pruned when a matching on-chain contract appears.

## 8. XMTP removal

Delete the XMTP stack; keep the reusable **payload type shapes** (`ContactCardMessage`, `ContractProposalMessage`) re-homed as Waku payloads.

| File | XMTP usage | Action |
|---|---|---|
| `contexts/XMTPContext.tsx`, `hooks/useXMTPClient.ts`, `hooks/useXMTPConversation.ts`, `lib/xmtp.ts`, `components/Chat/ChatComponent.tsx` | Core XMTP | **Delete** |
| `components/DynamicProviders.tsx` | Wraps app in `<XMTPProvider>` | Remove provider |
| `pages/chat-Section/Search.tsx` | XMTP conversation loading | Rewire to `useXaoInbox` |
| `pages/chat-Section/Notification.tsx` | Loads notifications from XMTP | Rewire to Waku inbox events (or minimal stub) |
| `pages/contracts/create-contract.tsx` | `sendContractProposal` via XMTP | Rewire to Waku `CONTRACT_PROPOSAL` send |
| `components/Navbar.tsx`, `components/FloatingNav.tsx` | Only `unreadCount`/`clearUnread` badge | Repoint to Waku unread, or drop badge |
| `components/RecipientSelector.tsx` | UI copy only ("XMTP inbox ID"); no calls | **Retire** (Waku uses addresses; Search has address entry) |
| `pages/contracts/contracts-detail.tsx` | Stale comment only | Delete comment |
| `backend/legaldata.ts` | One legal-copy sentence | Text edit |
| `package.json` | `@xmtp/browser-sdk` | Remove dep |

**Sequencing (recommended):** build Waku DMs + contact-card/contract side-channels and rewire pages first, then delete the XMTP stack as the **final** task. XMTP is already flag-disabled, so nothing live breaks mid-migration.

## 9. Components / files

### New (`src/lib/xaomsg/`)
- `dmThreadId.ts` — `dmThreadId(a,b): Hex` (sorted, domain-prefixed keccak).
- `inboxTopic.ts` — `inboxTopicForAddress(addr): string`; notice/key-bundle guards.
- `ecies.ts` — `wrapKey` / `unwrapKey` (ECDH + HKDF + AES-GCM).
- `conversationKey.ts` — generate / cache (localStorage) / load per-conversation `K`.
- `inbox.ts` — `publishKeyBundle`, `publishDmNotice`, `queryInbox`, `subscribeInbox`.
- `conversationStore.ts` — localStorage conversation index + `mergeConversations`.
- `contactCard.ts` — build/apply contact-card payloads (wraps existing `contactMessage` shape).
- `offchainContracts.ts` — off-chain contract store: upsert, list, dedup/prune vs on-chain.

### New (`src/hooks/`)
- `useXaoThread.ts` — extracted shared pipeline (subscribe → decrypt → verify → **route by ContentType** → merge/side-effect → post), parameterized by `{ threadId, contentTopic, key }`. **Refactor:** `useXaoMsg` (contract chat) is reshaped to build on this.
- `useXaoDm.ts` — given a `peer` address: derive `dmThreadId`, negotiate/load `K`, delegate to `useXaoThread`; expose `postText`, `sendContactCard`, `sendContractProposal`.
- `useXaoInbox.ts` — subscribe to own inbox; expose conversation list for Search; publish own key bundle on unlock.
- `useOffchainContracts.ts` — read/merge off-chain drafts for the Negotiation page.

### Modified
- `src/lib/xaomsg/types.ts` — add `CONTACT_CARD` to `ContentType`; add `ContactCardPayload`, `DmNotice`, `KeyBundle`, conversation-index & off-chain-contract types.
- `src/pages/chat-Section/Search.tsx` — replace XMTP loading with `useXaoInbox`; keep the address-paste "Start new conversation" UX.
- `src/pages/chat-Section/Chat.tsx` — render Waku pair thread via `useXaoDm(peer)`.
- `src/pages/chat-Section/Notification.tsx` — Waku inbox events (or minimal stub).
- `src/pages/contracts/create-contract.tsx` — send `CONTRACT_PROPOSAL` over Waku.
- `src/pages/contracts/Negotiation.tsx` — merge on-chain summaries + off-chain drafts (dedup by parties+eventName).
- `src/components/Chat/XaoMsgComponent.tsx` — generalize to a resolved thread context (contract or DM); render bubbles for `TEXT`, muted system lines for side-channel types.
- `src/components/Navbar.tsx`, `src/components/FloatingNav.tsx` — unread badge repointed/removed.
- `src/components/DynamicProviders.tsx` — drop `<XMTPProvider>`.
- `src/components/RecipientSelector.tsx`, `src/pages/contracts/contracts-detail.tsx`, `src/backend/legaldata.ts` — copy/comment cleanup.
- `package.json` — remove `@xmtp/browser-sdk`.

### Deleted
`contexts/XMTPContext.tsx`, `hooks/useXMTPClient.ts`, `hooks/useXMTPConversation.ts`, `lib/xmtp.ts`, `components/Chat/ChatComponent.tsx`.

### Untouched core
`waku.ts`, `topicId.ts`, `envelope.ts`, `crypto.ts`, `session.ts` (additive only). No `ContractNFT.sol` change.

## 10. Testing

- **Unit:** `dmThreadId` symmetry (case-insensitive, order-independent); inbox topic derivation; ECIES `wrap`→`unwrap` round-trip (peer & self); notice encrypt/decrypt; `mergeConversations` dedupe; contact-card apply → profile cache; off-chain contract upsert + revision-wins + dedup/prune vs a matching on-chain summary.
- **Routing:** pipeline sends `TEXT` to bubbles and `CONTACT_CARD`/`CONTRACT_PROPOSAL` to side-effects + system lines (no bubble).
- **Flow (mock Waku):** cold DM blocked when no key bundle; success path delivers + indexes both sides; contact card updates peer profile; contract draft appears in Negotiation, then is hidden after a matching on-chain contract exists.
- **Existing** contract-chat suites stay green after the `useXaoThread` refactor.

## 11. Known limitations (intentional, Phase-2)

- **Fresh-device history after rotation.** `K` cached locally, wrapped to the *current* session pubkey; on a new device after both parties rotated, old `K` may be unrecoverable until a peer re-wraps it (KEY_OFFER auto re-wrap deferred).
- **Inbox metadata leak.** An observer who knows your address can compute `inboxTopic(you)` and see *that* you receive DMs + timing/volume (not sender/content). Publishing a key bundle reveals you use XaoMsg.
- **Contract dedup is heuristic.** `(party1, party2, eventName)` can mis-merge two genuinely different contracts with the same event name between the same parties, or fail to merge if `eventName` was edited between draft and mint. Acceptable for Phase-2; a draftId-on-chain reference is future work.
- **No cold-DM spam control.** Anyone can post a notice to your inbox topic. Proof-of-work / allowlist is future work.
- **Store retention.** Cold notices and history live only within Waku store retention; the localStorage caches are the durable layer.
- **Single 1:1 model.** Group DMs out of scope.

## 12. Decisions locked during brainstorming

- Discovery: **per-user inbox topic** (+ pair channel). ✅
- Encryption: **ECIES now** via session certs, wrapped per-conversation key. ✅
- No-key behavior: **block with a clear message**. ✅
- Conversation index: **inbox topic + localStorage cache**. ✅
- Surface: **existing Search page**, reusing its address-paste entry point. ✅
- **Waku is the only channel; XMTP removed entirely** (built first, deleted last). ✅
- **Contact cards** ride Waku → update the existing profile cache; no chat bubble, muted system line. ✅
- **Contracts** negotiated off-chain over Waku → appear in Negotiation; either party mints; system line on mint; draft dropped after mint; **dedup by (party1, party2, eventName)**; both edit while unsigned; both sign to approve. ✅
- Scope: **plumbing + minimal UI** (Search list, Chat view, Negotiation merge, contact-card/contract side-channels); no contacts/unread/notification polish or spam control this pass. ✅
