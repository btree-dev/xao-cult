# Deterministic, Wallet-Derived XaoMsg Session Keys (Design Spec)

**Status:** Design — awaiting approval before an implementation plan is written.
**Date:** 2026-07-30
**Builds on:** `docs/superpowers/specs/2026-07-27-event-thread-separation-design.md` §2 fact 7 and §11, which already named this as the closing fix for cross-device/mint continuity and scoped it as separate future work. Also touches the "peer key-bundle selection is by publish time" fix described in `docs/architecture/xaomsg-messaging.md` Gotchas (commit fixing that bug on 2026-07-29).

## 1. Problem

`session.ts`'s `createSessionKeypair()` mints a fresh random secp256k1 keypair on every `unlock()`. The keypair is bound to the wallet via a `SessionCert` (wallet-signed EIP-191 message over `{walletAddress, sessionPublicKeyHex, expiresAtUnixMs, chainId}`), but the keypair itself has no relationship to the wallet beyond that one attestation — it's random, and persisted only in that browser's `localStorage` (`xao-msg-session-<wallet>`).

Consequences, both observed live:
- **Different origins for the same wallet are, cryptographically, different "devices."** `localhost:3000` and a deployed Vercel origin each mint their own random session keypair for the same wallet, so Search/Chat state (DM conversation list, off-chain drafts, contact-card cache — all rebuilt from Waku store replay + local writes) diverges until/unless that replay independently succeeds on each origin. This was the proximate symptom that led to this spec.
- **Mint continuity does not survive a fresh device or a session rotation.** Per the event-thread-separation spec §11: an inbox `ThreadNotice` (including the mint-pairing notice) is ECIES-encrypted to whichever session public key was current when the sender looked up the recipient's key bundle. A different device, or the same device after its 30-day session expires and rotates, derives a different keypair and can never decrypt notices encrypted to the old one — permanently falling back to the legacy `threadIdForShow` chat path for that contract.
- **`queryPeerKeyBundle`'s publish-time ranking exists only to work around this.** A wallet that has ever created more than one session can have several simultaneously-valid certs in its inbox history; picking the wrong one silently encrypts a notice to a session nobody holds the private key for (a real, previously-shipped bug, fixed by ranking on Waku publish time rather than self-declared expiry). That fix is a mitigation for the underlying randomness, not a resolution of it.

This spec makes the session keypair a deterministic function of the wallet (via two wallet signatures) so the *same* wallet always re-derives the *same* keypair, on any device, any origin, any time — closing all three symptoms above at the root.

## 2. Key facts that shape the design

1. **`SessionCert.walletSignature` is public.** It's broadcast in every message envelope and every published key bundle. Any key-derivation scheme that hashes *that* signature to produce the private key would let anyone who ever saw a cert compute the session private key. Key derivation must sign a **second, separate message that is never transmitted anywhere** — `unlock()` therefore needs two wallet signature prompts, not one. Confirmed acceptable (adds one prompt, only on a browser profile's first-ever session for that wallet — cache-hit path via `loadSession` is unchanged).
2. **EOA wallet signatures are deterministic.** `personal_sign`/EIP-191 via `viem`'s `walletClient.signMessage` uses RFC 6979 deterministic-nonce ECDSA for standard EOA wallets — the same message signed twice by the same key produces byte-identical signature bytes. This is the property the whole scheme rests on. (Smart-contract/passkey-backed wallets that don't sign this way would simply not get cross-device continuity — same as today, not a regression.)
3. **The curve library already has what's needed.** `@noble/secp256k1@2.1.0` (already a dependency) exposes `secp.etc.hashToPrivateKey(hash)`, which reduces a 40–1024 byte input mod the curve order into an unbiased valid scalar. `@noble/hashes/hkdf` (already used in `ecies.ts`) can expand a signature into that many bytes. No new dependency.
4. **Pre-launch, no dual-version support needed.** `SessionCert.v` already exists as a field (`v: 1`) but there is no production population of certs that need to keep validating under an old format. This spec redefines what `v: 1` means directly — no `v: 2`, no migration branch. Any already-cached local session simply fails the new `verifySessionCert` and `unlock()` runs fresh, which is already the existing fallback path for "no valid session."
5. **Expiry stops being a real security boundary once the key is permanent.** Today, `expiresAtUnixMs` bounds how long a compromised session key stays trusted. Once the same key is re-derived forever (no per-user rotation — see §6), a compromised key is compromised permanently regardless of any expiry field, so keeping expiry around would be a control that looks real but isn't. This spec removes it rather than keep it as decoration.

## 3. Derivation

Two fixed, wallet-scoped messages (no `chainId` — chat identity should not depend on which chain the wallet happens to be connected to at unlock time; this also removes a second, independent source of cross-origin divergence beyond the keypair randomness itself):

```
Derivation message (secret — signature used once locally, never transmitted):
  "XaoMsg session key derivation v1\nwallet:<lowercased address>"

Cert challenge (public — signature becomes SessionCert.walletSignature):
  "XaoMsg session v1\nwallet:<lowercased address>\nsession_pubkey:<sessionPublicKeyHex>"
```

```
sig1        = await walletClient.signMessage({ account, message: derivationMessage })
seed        = HKDF-SHA256(ikm=sig1 bytes, salt="xao-session-key-v1", info="xao-session-keyseed-v1", length=40)
privateKey  = secp.etc.hashToPrivateKey(seed)      // unbiased scalar in [1, n-1]
publicKey   = secp.getPublicKey(privateKey, true)  // compressed, 33 bytes

sig2        = await walletClient.signMessage({ account, message: certChallenge(publicKey) })
cert        = { v: 1, walletAddress, sessionPublicKeyHex: publicKey, walletSignature: sig2 }
```

Both messages are fixed-format with no variable fields besides the wallet address / derived pubkey — so both signatures are themselves deterministic. A second device unlocking for the same wallet reproduces bit-identical `{privateKey, publicKey, cert}`, not merely an equivalent keypair.

## 4. Cert shape

`SessionCert` drops `expiresAtUnixMs` and `chainId`. `session.ts` deletes `isExpired`/`SESSION_DURATION_MS`. `verifySessionCert` becomes purely: recover the signer of `certChallenge(...)` from `walletSignature` and check it equals `walletAddress` — no time check. `ChallengeFields`/`sessionChallengeString` narrow to `{ walletAddress, sessionPublicKeyHex }`.

## 5. `unlock()` flow (`useXaoMsgSession.ts`)

Sequential, both via the existing `walletClient.signMessage`: sign derivation message → derive keypair (`session.ts`, new `deriveSessionKeypair(walletClient, address)` replacing `createSessionKeypair()`) → sign cert challenge → build cert → persist `{cert, privateKeyHex}` to `localStorage` under the existing key, unchanged shape besides the two dropped fields. `loadSession`'s cache-hit path is untouched — the two prompts only fire when a browser profile has no cached session yet for that wallet (first visit to that origin, or after an explicit logout).

## 6. Downstream cleanup: `queryPeerKeyBundle` (`inbox.ts`)

The publish-time ranking logic (`inbox.ts` candidate-scoring by Waku message timestamp) exists to pick the *live* cert out of several simultaneously-valid ones for a wallet. With one deterministic pubkey per wallet, any structurally-valid cert for that address carries the same pubkey as any other — there is nothing left to disambiguate. `queryPeerKeyBundle` simplifies to: verify the first structurally-valid cert found for the peer's address (correct signature, matching `walletAddress`) and use it. The timestamp-collection/ranking code is deleted, not just bypassed.

## 7. Trade-off accepted: no per-user key rotation

The derived key is permanent — the same wallet always re-derives the same keypair, forever, short of a future hard-coded derivation-message version change affecting all users at once. A leaked session private key can never be rotated away per-user the way today's 30-day random rotation eventually does. This mirrors the trust model DM/event **conversation** keys already use (deterministic ECDH, no rotation within a draft's lifetime) — this spec extends the same model one level down, to the identity key those conversation keys are derived from, rather than introducing a new risk category. Explicitly accepted: the session key signs messages and derives conversation keys; it does not custody funds.

## 8. Migration / compatibility

None needed (see §2 fact 4). An old cached session (old shape with `expiresAtUnixMs`/`chainId`, or an old random keypair) fails the new cert verification/parse on load and `unlock()` runs fresh, producing the new deterministic keypair — the same fallback path that already exists for "no session" or "expired session" today. A peer mid-transition (old device still on its old random cert, new device already deterministic) is indistinguishable from an ordinary session rotation, which the app already handles (re-negotiate DM key, `no-peer-key` status).

## 9. Testing

- **`session.ts`:** derive using a real `viem` local account (`privateKeyToAccount`) rather than a mock, so tests exercise genuine RFC-6979 determinism. Assert: two independent derivations for the same wallet produce byte-identical `{privateKey, publicKey, cert}`; two different wallets produce different keypairs; `verifySessionCert` accepts a valid cert and rejects a tampered one (wrong signer, mutated pubkey); the derivation message and cert challenge are distinct strings (regression guard against ever collapsing them into one signature).
- **`inbox.ts`:** replace publish-time-ranking test cases with "any structurally valid cert for the address is accepted, regardless of order seen" cases; keep existing malformed/wrong-signer rejection cases.
- **Fixture updates only (no behavior change expected):** `envelope.test.ts`, `sync.test.ts`, `draftSync.test.ts`, `merge.test.ts` — their `SessionCert` test builders drop `expiresAtUnixMs`/`chainId`.

## 10. Files touched

`src/lib/xaomsg/session.ts`, `src/lib/xaomsg/inbox.ts`, `src/hooks/useXaoMsgSession.ts`, `src/lib/xaomsg/types.ts` (`SessionCert` shape) — plus the five test files in §9, plus `docs/architecture/xaomsg-messaging.md` (Identity & encryption section, and the "peer key-bundle selection by publish time" / "mint continuity does not survive a fresh device" Gotchas, both of which this spec resolves and must be updated rather than left describing the old behavior).

## 11. Non-goals / known limitations

- No change to `SESSION_DURATION_MS`-style periodic re-attestation UX — there isn't one anymore; a cached local session is used indefinitely until explicit logout or `localStorage` is cleared, at which point re-deriving is silent-to-the-user in effect (same keys, same cert bytes) modulo two wallet prompts.
- No rotation mechanism of any kind is introduced (§7, explicitly accepted, not deferred).
- Non-EOA wallets (smart-contract wallets, passkey-backed signers) that don't produce deterministic signatures simply don't get cross-device continuity from this change — not a regression (they don't have it today either), just not a fix for that subset.
- Does not address the separate, already-documented `peerCertRef` staleness gotcha in `useXaoEvent.ts` (deferred per prior user decision, per `docs/architecture/xaomsg-messaging.md` Gotchas) — unrelated code path, out of scope here.
- Does not touch the legacy on-chain contract-chat thread (`threadIdForShow`/`deriveDeterministicThreadKey`) — that remains a known-weak fallback per the event-thread-separation spec, unrelated to session-key derivation.

## 12. Decisions locked during brainstorming

- Two wallet signature prompts on first unlock per browser profile, to keep the derivation signature never-transmitted. ✅
- Permanent, non-rotatable deterministic key accepted as the trade-off, matching existing conversation-key trust model. ✅
- Expiry (`expiresAtUnixMs`) removed entirely rather than kept as a long/cosmetic field. ✅
- No `SessionCert.v: 2` — redefine `v: 1` in place; pre-launch, no dual-version support needed. ✅
- `queryPeerKeyBundle`'s publish-time ranking simplified/deleted in the same change, not deferred to a follow-up. ✅
- `chainId` dropped from both signed messages — chat identity is chain-independent. ✅
