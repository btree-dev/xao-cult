# XaoMsg Phase 1 — Known Limitations

Phase 1 ships the Waku transport + 24h session keys. Every limitation below is
intentional; each maps to a follow-up plan in the series.

## Cryptography

**Weak thread key (Plan 2 fixes).** The AES-GCM key is derived from
`keccak256("xao-thread-key-v1" || showContractAddress)`. Anyone who knows the
ShowContract address derives the key. Plan 2 replaces this with an ECIES
handshake so each party's wallet wraps a random per-thread key for the other
parties.

**Session key in sessionStorage.** The session private key sits in plain JS
memory and `sessionStorage` for up to 24 hours. Compromise of the browser
storage compromises that day's messages. Plan 5 explores hardware-backed key
storage via WebAuthn / passkey-derived keys.

**No metadata privacy beyond opaque topics.** A Waku observer cannot trivially
map a topic back to a contract, but they can see message size, timing, and
which peers post on which topics. Phase 1 does not pad payloads or batch
messages.

## Negotiation

**TEXT and PROPOSAL only.** The envelope's `parentHash` is recorded for
forward compatibility, but Phase 1 does not implement the proposal /
counter / accept / reject DAG with conflict resolution. That is Plan 3.

## Transport

**Store-node backfill — RESOLVED (2026-07-05).** Live messages are delivered
via light-push + filter-subscribe. In addition, on thread open the client now
backfills history from a Waku store node (`queryHistory` in `waku.ts`), so a
peer that was offline when a message was sent sees it on reconnect within the
store retention window. Backfill is best-effort — if no store peer is reachable
the live path is unaffected. Currently uses `defaultBootstrap` public Waku
Network store peers (no pinned peer); a dedicated/self-hosted store node for
longer, guaranteed retention remains future work.

**No retention policy.** Phase 1 keeps every received message in client
state indefinitely (in memory). Plan 4 adds tiered retention (long /
medium / short) and ephemeral mode.

**Single thread type.** Phase 1 only supports contract-scoped threads (one
thread per ShowContract). Relationship and group threads are Plan 4.

## UX

**Cross-device session is not synced.** A user with two devices unlocks
twice (once per device per 24h). Plan 5 considers a deterministic session
derivation tied to a passkey or hardware key.

**No message acknowledgements.** A sent message is shown optimistically with
no read-receipt or delivery-confirmation indicator.

## Coexistence

**XaoMsg runs in parallel to XMTP.** The legacy `ChatComponent` remains the
default until Plan 1 is validated; flip `NEXT_PUBLIC_USE_XAOMSG=1` to enable
XaoMsg. Old contracts created while XMTP was active stay on XMTP.

## Migration

**No history backfill.** When you flip the flag, existing chat history from
XMTP is not imported. New conversations start empty.
