// src/lib/xaomsg/inbox.ts
import type { Address, Hex } from 'viem';
import type { SessionCert } from './types';
import { inboxTopicForAddress } from './inboxTopic';
import { wrapBytes, unwrapBytes } from './ecies';
import { publishToTopic, subscribeToTopic, queryHistory } from './waku';
import { verifySessionCert, isExpired } from './session';

export interface DmNotice {
  from: Address;
  threadId: Hex;
  convKeyB64: string; // base64 of the raw 32-byte conversation key
  preview?: string;
  ts: number;
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

// ---- DM notice (ECIES-encrypted to owner) ----
export async function encodeDmNotice(
  notice: DmNotice,
  ownerSessionPubHex: string,
  mySessionPrivHex: string,
  mySessionPubHex: string,
): Promise<Uint8Array> {
  const encBlob = await wrapBytes(enc.encode(JSON.stringify(notice)), ownerSessionPubHex, mySessionPrivHex);
  return enc.encode(JSON.stringify({ t: 'dm', spk: mySessionPubHex, enc: encBlob }));
}
export async function tryDecodeDmNotice(bytes: Uint8Array, mySessionPrivHex: string): Promise<DmNotice | null> {
  try {
    const o = JSON.parse(dec.decode(bytes));
    if (o?.t !== 'dm' || !o.spk || !o.enc) return null;
    const plain = await unwrapBytes(o.enc, o.spk, mySessionPrivHex);
    return JSON.parse(dec.decode(plain)) as DmNotice;
  } catch { return null; }
}

// ---- Waku wiring ----
export async function publishKeyBundle(cert: SessionCert): Promise<void> {
  await publishToTopic(inboxTopicForAddress(cert.walletAddress), encodeKeyBundle(cert));
}

export async function publishDmNotice(ownerAddress: Address, noticeBytes: Uint8Array): Promise<void> {
  await publishToTopic(inboxTopicForAddress(ownerAddress), noticeBytes);
}

/** Fetch the peer's most recent valid, unexpired key bundle (their session pubkey).
 *  Returns null if the peer has never published one (→ caller blocks the cold DM). */
export async function queryPeerKeyBundle(peer: Address): Promise<SessionCert | null> {
  // The inbox topic is publicly writable, so any bundle in history is
  // attacker-controlled until its wallet signature verifies. Collect every
  // shape-valid, unexpired candidate, then verify newest-first — a forged
  // bundle with an inflated expiry must not mask the peer's real one.
  const candidates: SessionCert[] = [];
  await queryHistory(inboxTopicForAddress(peer), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (!cert) return;
    if (typeof cert.expiresAtUnixMs !== 'number') return;
    if (isExpired(cert)) return;
    candidates.push(cert);
  });
  candidates.sort((a, b) => b.expiresAtUnixMs - a.expiresAtUnixMs);
  const peerLower = peer.toLowerCase();
  for (const cert of candidates) {
    // A cert can be genuinely self-signed by a wallet that is NOT the peer —
    // anyone can post their own cert onto the peer's public topic. Only a
    // cert whose walletAddress matches the queried peer proves ownership.
    if (cert.walletAddress?.toLowerCase() !== peerLower) continue;
    if (await verifySessionCert(cert)) return cert;
  }
  return null;
}

/** Subscribe to my inbox. Returns an unsubscribe fn. Routes each message to the
 *  right callback; ignores anything that isn't a signature-verified, unexpired
 *  bundle or a notice I can read. */
export async function subscribeInbox(
  myAddress: Address,
  mySessionPrivHex: string,
  onKeyBundle: (cert: SessionCert) => void,
  onDmNotice: (notice: DmNotice) => void,
): Promise<() => Promise<void>> {
  return subscribeToTopic(inboxTopicForAddress(myAddress), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (cert) {
      // Never surface an unverified cert — the topic is publicly writable.
      if (isExpired(cert)) return;
      // Only my own cert belongs on my topic (publishKeyBundle publishes a
      // wallet's cert to its own topic); a validly self-signed cert for a
      // different wallet is off-invariant and must not reach the callback.
      if (cert.walletAddress?.toLowerCase() !== myAddress.toLowerCase()) return;
      void verifySessionCert(cert).then((ok) => { if (ok) onKeyBundle(cert); });
      return;
    }
    void tryDecodeDmNotice(bytes, mySessionPrivHex).then((n) => { if (n) onDmNotice(n); });
  });
}

/** Replay inbox store history to recover DM notices (conversation index). */
export async function queryInboxNotices(
  myAddress: Address,
  mySessionPrivHex: string,
  onDmNotice: (notice: DmNotice) => void,
): Promise<void> {
  await queryHistory(inboxTopicForAddress(myAddress), async (bytes) => {
    try {
      const n = await tryDecodeDmNotice(bytes, mySessionPrivHex);
      if (
        n &&
        typeof n.threadId === 'string' &&
        typeof n.convKeyB64 === 'string' &&
        typeof n.from === 'string' &&
        typeof n.ts === 'number'
      ) {
        onDmNotice(n);
      }
    } catch (err) {
      console.warn('[xaomsg] failed to process inbox notice; skipping', err);
    }
  });
}
