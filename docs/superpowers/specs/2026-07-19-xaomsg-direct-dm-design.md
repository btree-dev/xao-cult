# XaoMsg Phase 2 — Direct Wallet-to-Wallet DMs (Design Spec)

**Status:** Design — awaiting approval before an implementation plan is written.
**Date:** 2026-07-19
**Supersedes limitations:** the "Weak thread key (Plan 2 fixes)" and "Single thread type" / "Relationship threads (Plan 4)" items in `docs/superpowers/plans/2026-04-22-xaomsg-phase1-known-limits.md`.

## 1. Problem

Today XaoMsg can only open a thread that is scoped to a **deployed ShowContract address** (`threadIdForShow(showAddress)`). Two users cannot message each other unless a contract already exists between them.

We want **direct, wallet-to-wallet DMs**:

- Bob can **cold-message** Alice knowing only her wallet address — no pre-existing contract.
- Either party can open the conversation from just the two wallet addresses and see the full history.
- Incoming DMs (cold messages and ongoing chats) must appear as a **conversation list on the existing Search page** (`/chat-Section/Search`), which currently shows "Messaging is currently disabled" because it is still wired to the (disabled) XMTP client.
- Messages must be **end-to-end encrypted** so only the two wallets can read them — even someone who knows both addresses cannot.

Non-goals for this phase are listed in §9.

## 2. Key facts that shape the design

1. **The Waku/topic layers are already generic.** `contentTopicForThread(threadId: Hex)` and everything in `waku.ts` take an opaque `threadId`, not an address. A DM only needs a *different threadId derivation*; the transport is unchanged.
2. **A wallet address is not a public key.** An EVM address is `keccak256(pubkey)[12:]` — a one-way hash. You cannot ECIES-encrypt to an address; you need the actual secp256k1 public key.
3. **XaoMsg already mints a real, wallet-verified public key per user.** `session.ts` generates a secp256k1 **session keypair**; the `SessionCert` binds `walletAddress → sessionPublicKeyHex` with a wallet signature (`verifySessionCert`). **Every envelope already carries this cert.** So the moment Alice receives any message from Bob she has Bob's ECDH-capable, wallet-attested public key for free. The session key is what makes ECIES cheap here.
4. **Waku has no server-side conversation list.** XMTP offered `conversations.list()`; Waku is pure topic pub/sub and remembers nothing about "conversations". The Search-page list must be reconstructed by us.
5. **Encryption cost is negligible vs. Waku propagation.** AES-GCM is microseconds; one ECDH per conversation is ~1–5 ms and cached. Perceived latency is 100% Waku network propagation. Adding ECIES will not make chat feel slower.

## 3. Architecture overview

Two Waku topics per relationship, plus one per user:

| Topic | Derived from | Who reads | Contents |
|---|---|---|---|
| **Pair topic** `pairTopic(a,b)` | `contentTopicForThread(dmThreadId(a,b))` — opaque | The two parties (need both addresses) | The actual encrypted messages |
| **Inbox topic** `inboxTopic(x)` | `keccak256(domain ‖ x)` — derivable from x's address alone | Anyone can subscribe; only x can read notices | (a) x's public **key bundle**; (b) **DM notices** encrypted to x |

`dmThreadId(a,b)` sorts the two lowercased addresses so Alice and Bob independently derive the **same** pair topic regardless of who started — this is what powers "open by both addresses and see history."

The inbox topic is intentionally derivable from an address alone (it must be, so a cold sender can find it). This has two consequences, both handled:
- **Key bundle** posted there is *public* (the cert is already broadcast with every message — no new exposure).
- **DM notices** posted there are *encrypted to the owner* (ECIES to the owner's session pubkey), so an observer watching `inboxTopic(Alice)` learns only that Alice receives DMs and their timing/volume — not who from or what about. (Metadata leak noted in §9.)

### Roles of the inbox topic (it replaces XMTP's server list)

1. **Key-bundle registry** — on session unlock a user publishes their current `SessionCert` here, so cold senders can fetch a verified public key to encrypt to.
2. **Cold-DM notification** — starting a conversation drops an encrypted notice here so the recipient discovers it without prior knowledge of the sender.
3. **Durable conversation index** — every conversation the user is part of leaves a notice here. On login (even on a fresh device) the client queries Waku **store** history of its own inbox topic and rebuilds the conversation list — **no database**.

## 4. Encryption design (ECIES via session keys)

**Per-conversation content key, ECIES-wrapped — not raw per-message ECDH.** Chosen so message history survives the 24h session-key rotation.

- The **initiator** generates a random 256-bit AES-GCM **conversation key `K`**.
- `K` is ECIES-**wrapped** to the recipient's current session pubkey (and to the initiator's own session pubkey) and delivered in the DM notice / on the pair topic. Wrapping = `ECDH(mySessionPriv, theirSessionPub) → HKDF-SHA256 → AES-GCM` encrypt of `K`. (`@noble/secp256k1` for ECDH, `@noble/hashes` for HKDF — SubtleCrypto only does P-256, so we already use `@noble` for secp256k1 elsewhere.)
- **Every message body** is encrypted with `K` (plain AES-GCM, microseconds), reusing the existing `encryptBody`/`decryptBody`. The envelope signing/verification chain (`buildEnvelope`/`verifyEnvelope`) is unchanged.
- Both parties **cache `K` in localStorage** keyed by conversation, so history stays readable across session-key rotations on that device.

Why wrapped-`K` rather than "derive key = HKDF(ECDH(session,session)) directly": a direct ECDH key changes every 24h when either session key rotates, making old history undecryptable on a fresh device. A stable wrapped `K` decouples message encryption from ephemeral session keys. (Fresh-device-after-rotation recovery of `K` is a documented Phase-2 limitation — §9.)

**No-key fallback (decided):** if a cold sender queries the recipient's inbox and finds **no key bundle** (recipient has never used XaoMsg), the send is **blocked** with a clear message ("This user hasn't joined XaoMsg yet, so messages can't be encrypted to them"). We never silently downgrade to a weaker key.

## 5. Conversation index (Search page source of truth)

**Inbox topic + localStorage cache (decided).**

- `localStorage` holds the assembled conversation list `{ peer, threadId, convKeyRef, lastActivityTs, lastPreview }[]` — instant load, survives store-retention gaps.
- On login the client also replays `store(inboxTopic(me))` and **merges** any notices not already cached — this is the cross-device / fresh-device recovery path.
- The merged list feeds the Search page conversation list.

Trade-off accepted: Waku store retention is finite; the local cache is the durable layer and the inbox replay is best-effort recovery, mirroring the existing `queryHistory` best-effort pattern.

## 6. End-to-end flow — Bob cold-DMs Alice

1. Bob enters Alice's address on the Search page → existing "Start new conversation" card → `/chat-Section/Chat?peer=0xAlice`.
2. Bob's client queries `store(inboxTopic(Alice))` for Alice's **key bundle**. If none → **block** with the no-key message.
3. Bob verifies Alice's cert (`verifySessionCert`) and extracts her session pubkey.
4. Bob generates conversation key `K`; wraps it to Alice's session pubkey and to his own; caches `K` locally.
5. Bob publishes a **DM notice** to `inboxTopic(Alice)`: `{ peer: Bob, threadId, wrappedKForAlice, ts }` (readable only by Alice).
6. Bob publishes his first message to `pairTopic(Bob,Alice)`, body encrypted with `K`, via the existing envelope pipeline.
7. Alice — subscribed to `inboxTopic(Alice)` — receives the notice, unwraps `K` with her session priv, caches the conversation, subscribes to `pairTopic`, backfills history (`queryHistory`), and sees Bob's message.
8. Both now chat live on `pairTopic` with `K`. Each side's inbox notice keeps the conversation in their durable index.

On any later login, Alice's Search page = merge(localStorage cache, replay of `store(inboxTopic(Alice))`).

## 7. Components / files

### New (`src/lib/xaomsg/`)
- `dmThreadId.ts` — `dmThreadId(a, b): Hex` (sorted, domain-prefixed keccak).
- `inboxTopic.ts` — `inboxTopicForAddress(addr): string` (Waku content topic); notice/key-bundle type guards.
- `ecies.ts` — `wrapKey(rawKey, theirPubHex, mySessionPrivHex)` / `unwrapKey(...)` (ECDH + HKDF + AES-GCM).
- `conversationKey.ts` — generate / cache (localStorage) / load per-conversation `K`.
- `inbox.ts` — `publishKeyBundle`, `publishDmNotice`, `queryInbox`, `subscribeInbox`.
- `conversationStore.ts` — localStorage conversation index + `mergeConversations`.

### New (`src/hooks/`)
- `useXaoThread.ts` — extracted shared pipeline (subscribe → decrypt → verify → merge → post) parameterized by `{ threadId, contentTopic, key }`. **Refactor:** `useXaoMsg` (contract) is reshaped to build on this so contract-chat and DMs share one code path.
- `useXaoDm.ts` — given a `peer` address: derive `dmThreadId`, negotiate/load `K`, then delegate to `useXaoThread`.
- `useXaoInbox.ts` — subscribe to own inbox, expose the conversation list for the Search page; publish own key bundle on unlock.

### Modified
- `src/lib/xaomsg/types.ts` — add `DmNotice`, `KeyBundle`, conversation-index types; add a `KEY_OFFER`/notice content type if needed (integer order stays append-only).
- `src/pages/chat-Section/Search.tsx` — replace the XMTP `useXMTPClient` loading with `useXaoInbox`; keep the existing address-paste "Start new conversation" UX and card rendering.
- `src/pages/chat-Section/Chat.tsx` — render a Waku pair thread via `useXaoDm(peer)` instead of XMTP.
- `src/components/Chat/XaoMsgComponent.tsx` — generalize to accept a resolved thread context (contract thread *or* DM), so one component renders both.

### Untouched
- `waku.ts`, `topicId.ts`, `envelope.ts`, `crypto.ts`, `session.ts` core (additive only). Legacy XMTP files stay until DMs are validated.

## 8. Testing

- **Unit:** `dmThreadId` symmetry (`(a,b)===(b,a)`, case-insensitive); inbox topic derivation stability; ECIES `wrap`→`unwrap` round-trip; `K` wrapped to peer *and* self both unwrap; notice encrypt/decrypt; `mergeConversations` dedupe + newest-wins.
- **Flow (mock Waku):** two in-memory sessions perform a cold DM — sender blocked when no key bundle; success path delivers + indexes on both sides.
- **Existing suites** for contract chat must stay green after the `useXaoThread` refactor.

## 9. Known limitations (intentional, Phase-2)

- **Fresh-device history after rotation.** `K` is cached locally and wrapped to the *current* session pubkey. On a brand-new device after both parties rotated session keys, old `K` may be unrecoverable until a peer re-wraps it. Auto re-wrap (KEY_OFFER handshake) is deferred.
- **Inbox metadata leak.** An observer who knows your address can compute `inboxTopic(you)` and see *that* you receive DMs, plus timing/volume — not sender identity or content (notices are ECIES-encrypted). Publishing a key bundle also reveals you use XaoMsg.
- **No cold-DM spam control.** Anyone can post a notice to your inbox topic. Proof-of-work / allowlist is future work.
- **Store retention.** Cold notices and history live only within Waku store retention; the localStorage cache is the durable layer.
- **Single 1:1 model.** Group DMs are out of scope.

## 10. Open decisions (all resolved during brainstorming)

- Discovery: **per-user inbox topic** (+ pair channel). ✅
- Encryption: **ECIES now**, via session certs, wrapped per-conversation key. ✅
- No-key behavior: **block with a clear message**. ✅
- Conversation index: **inbox topic + localStorage cache**. ✅
- Surface: **existing Search page**, reusing its address-paste entry point. ✅
- Scope: **plumbing + minimal UI** (Search list + Chat view on Waku); no contacts/unread/notification polish this pass.
