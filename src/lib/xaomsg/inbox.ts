// src/lib/xaomsg/inbox.ts
import type { Address, Hex } from 'viem';
import type { SessionCert } from './types';
import { inboxTopicForAddress } from './inboxTopic';
import { wrapBytes, unwrapBytes } from './ecies';
import { publishToTopic, subscribeToTopic, queryHistory } from './waku';
import { verifySessionCert } from './session';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';

export interface ThreadNotice {
  kind: 'dm' | 'event';
  from: Address;
  threadId: Hex;
  ts: number;
  preview?: string;
  /** present iff kind === 'event' */
  draftId?: string;
  /** present iff kind === 'event' and this draft has been minted on-chain —
   *  lets any device resolve the minted contract's address back to this
   *  same thread (see useResolveEventThread / sync.ts). */
  contractAddress?: Address;
}

/** Dedupe key for live/replayed event-notice backfills (see useXaoInbox).
 *  Keyed on draftId AND whether this notice carries a contractAddress —
 *  NOT draftId alone — because `notifyThread` fires at least twice per
 *  draft over its lifetime with the same draftId: once on the initial
 *  proposal (no contractAddress) and again at mint (contractAddress set).
 *  A draftId-only key lets the pre-mint notice claim the slot and silently
 *  swallows the mint notice — the one `recordMint`/`useResolveEventThread`
 *  actually depend on — on any session that already saw the pre-mint
 *  notice live. */
export function eventBackfillDedupeKey(draftId: string, contractAddress?: string): string {
  return `${draftId}:${contractAddress ?? ''}`;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---- Key bundle (public) ----
export function encodeKeyBundle(cert: SessionCert): Uint8Array {
  return enc.encode(JSON.stringify({ t: 'kb', cert }));
}
export function tryDecodeKeyBundle(bytes: Uint8Array): SessionCert | null {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'kb' || !o.cert) return null;
    return o.cert as SessionCert;
  } catch { return null; }
}

// ---- Thread notice (ECIES-encrypted to owner, authenticated by sender's session cert) ----
export async function encodeThreadNotice(
  notice: ThreadNotice,
  ownerSessionPubHex: string,
  mySessionPrivHex: string,
  myCert: SessionCert,
): Promise<Uint8Array> {
  const encBlob = await wrapBytes(enc.encode(JSON.stringify(notice)), ownerSessionPubHex, mySessionPrivHex);
  // 't: dm' is on-wire transport framing (distinguishes a notice from a key
  // bundle) — unrelated to the notice's own `kind` field, so it stays as-is
  // for both dm- and event-kind notices.
  return enc.encode(JSON.stringify({ t: 'dm', cert: myCert, enc: encBlob }));
}

export async function tryDecodeThreadNotice(bytes: Uint8Array, mySessionPrivHex: string): Promise<ThreadNotice | null> {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'dm' || !o.cert || !o.enc) return null;
    const senderCert = o.cert as SessionCert;
    if (!(await verifySessionCert(senderCert))) return null;
    const plain = await unwrapBytes(o.enc, senderCert.sessionPublicKeyHex, mySessionPrivHex);
    const notice = JSON.parse(dec.decode(plain)) as ThreadNotice;
    if (typeof notice.from !== 'string' || notice.from.toLowerCase() !== senderCert.walletAddress.toLowerCase()) {
      return null;
    }
    return notice;
  } catch { return null; }
}

/** Full shape + threadId-recomputation check, shared by subscribeInbox and
 *  queryInboxNotices — a wallet-attested sender can never claim a threadId
 *  that doesn't match what it's actually supposed to be, for either kind. */
function isValidThreadNotice(myAddress: Address, n: unknown): n is ThreadNotice {
  if (!n || typeof n !== 'object') return false;
  const notice = n as ThreadNotice;
  if (typeof notice.from !== 'string' || typeof notice.threadId !== 'string' || typeof notice.ts !== 'number') {
    return false;
  }
  if (notice.kind === 'dm') {
    return notice.threadId.toLowerCase() === dmThreadId(myAddress, notice.from as Address).toLowerCase();
  }
  if (notice.kind === 'event') {
    if (typeof notice.draftId !== 'string' || !notice.draftId) return false;
    return notice.threadId.toLowerCase() === threadIdForDraft(notice.draftId).toLowerCase();
  }
  return false;
}

// ---- Waku wiring ----
export async function publishKeyBundle(cert: SessionCert): Promise<void> {
  await publishToTopic(inboxTopicForAddress(cert.walletAddress), encodeKeyBundle(cert));
}

export async function publishThreadNotice(ownerAddress: Address, noticeBytes: Uint8Array): Promise<void> {
  await publishToTopic(inboxTopicForAddress(ownerAddress), noticeBytes);
}

/** Fetch the peer's session cert (their session pubkey) from their inbox
 *  topic history. Returns null if the peer has never published one (→
 *  caller blocks the cold DM).
 *
 *  The inbox topic is publicly writable, so any bundle in history is
 *  attacker-controlled until its wallet signature verifies. Session keys are
 *  a deterministic function of the wallet going forward (session.ts), so any
 *  cert published from 2026-07-30 onward carries the wallet's one true
 *  pubkey — BUT this store is long-lived and pre-dates that migration:
 *  wallets that used the app before `8a8891d` still have OLDER,
 *  differently-pubkeyed certs (from the prior random/30-day-rotating scheme)
 *  sitting in their inbox history, each just as signature-valid as the
 *  current one. `queryHistory`'s callback order is not guaranteed to be
 *  newest-first, so picking the first structurally-valid cert found (as this
 *  used to, see the 2026-07-29 publish-time fix this replaced) can return a
 *  stale pubkey — the resulting ECDH conversation key then silently fails to
 *  match what the peer, using their real current key, actually encrypts
 *  with (observed live: `useXaoThread`'s `thread#17` decrypt failing on
 *  freshly-arrived *live* messages, not just history). `useXaoInbox.ts`
 *  republishes the current session cert on every mount, so the peer's real
 *  cert is reliably the most-recently-published one — prefer that over
 *  "first found" rather than reintroducing full ranking logic.
 *
 *  Retries a few times on zero valid candidates: `queryHistory` swallows its
 *  own errors (a transient Store-node failure — observed live as a Postgres
 *  "out of shared memory" error — looks identical to "peer has no cert yet"
 *  from here). Without a retry, that transient failure surfaced to the user
 *  as "This user hasn't joined XaoMsg yet," which is wrong and misleading —
 *  the peer had published a cert all along. */
export async function queryPeerKeyBundle(peer: Address): Promise<SessionCert | null> {
  const peerLower = peer.toLowerCase();
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const candidates: { cert: SessionCert; publishedAtMs: number }[] = [];
    await queryHistory(inboxTopicForAddress(peer), (bytes, timestamp) => {
      const cert = tryDecodeKeyBundle(bytes);
      if (!cert) return;
      // A cert can be genuinely self-signed by a wallet that is NOT the peer —
      // anyone can post their own cert onto the peer's public topic. Only a
      // cert whose walletAddress matches the queried peer proves ownership.
      if (cert.walletAddress?.toLowerCase() !== peerLower) return;
      candidates.push({ cert, publishedAtMs: timestamp ? timestamp.getTime() : 0 });
    });
    candidates.sort((a, b) => b.publishedAtMs - a.publishedAtMs);
    for (const { cert } of candidates) {
      if (await verifySessionCert(cert)) return cert;
    }

    if (attempt < MAX_ATTEMPTS) {
      console.warn(
        `[xaomsg] queryPeerKeyBundle: no valid cert found for ${peer} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying — ` +
          'could be a transient Store query failure rather than the peer never having published',
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  return null;
}

/** Subscribe to my inbox. Returns an unsubscribe fn. Routes each message to the
 *  right callback; ignores anything that isn't a signature-verified
 *  bundle or a notice I can read and that passes isValidThreadNotice. */
export async function subscribeInbox(
  myAddress: Address,
  mySessionPrivHex: string,
  onKeyBundle: (cert: SessionCert) => void,
  onThreadNotice: (notice: ThreadNotice) => void,
): Promise<() => Promise<void>> {
  return subscribeToTopic(inboxTopicForAddress(myAddress), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (cert) {
      // Never surface an unverified cert — the topic is publicly writable.
      // Only my own cert belongs on my topic (publishKeyBundle publishes a
      // wallet's cert to its own topic); a validly self-signed cert for a
      // different wallet is off-invariant and must not reach the callback.
      if (cert.walletAddress?.toLowerCase() !== myAddress.toLowerCase()) return;
      void verifySessionCert(cert).then((ok) => { if (ok) onKeyBundle(cert); });
      return;
    }
    void tryDecodeThreadNotice(bytes, mySessionPrivHex).then((n) => {
      if (!n || !isValidThreadNotice(myAddress, n)) return;
      onThreadNotice(n);
    });
  });
}

/** Replay inbox store history to recover thread notices (conversation +
 *  event index). */
export async function queryInboxNotices(
  myAddress: Address,
  mySessionPrivHex: string,
  onThreadNotice: (notice: ThreadNotice) => void,
): Promise<void> {
  await queryHistory(inboxTopicForAddress(myAddress), async (bytes) => {
    try {
      const n = await tryDecodeThreadNotice(bytes, mySessionPrivHex);
      if (n && isValidThreadNotice(myAddress, n)) {
        onThreadNotice(n);
      }
    } catch (err) {
      console.warn('[xaomsg] failed to process inbox notice; skipping', err);
    }
  });
}
