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
 *  attacker-controlled until its wallet signature verifies. Because the
 *  session keypair is now a deterministic function of the wallet
 *  (session.ts), every genuinely-signed cert for a given wallet carries the
 *  identical session pubkey — there is no "which one is the current
 *  session" ambiguity left to resolve (see the 2026-07-29 publish-time fix
 *  this replaces, described in docs/architecture/xaomsg-messaging.md), so
 *  this just needs to find ANY structurally-matching, signature-valid cert
 *  for the peer's address. */
export async function queryPeerKeyBundle(peer: Address): Promise<SessionCert | null> {
  const peerLower = peer.toLowerCase();
  const candidates: SessionCert[] = [];
  await queryHistory(inboxTopicForAddress(peer), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (!cert) return;
    // A cert can be genuinely self-signed by a wallet that is NOT the peer —
    // anyone can post their own cert onto the peer's public topic. Only a
    // cert whose walletAddress matches the queried peer proves ownership.
    if (cert.walletAddress?.toLowerCase() !== peerLower) return;
    candidates.push(cert);
  });
  for (const cert of candidates) {
    if (await verifySessionCert(cert)) return cert;
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
