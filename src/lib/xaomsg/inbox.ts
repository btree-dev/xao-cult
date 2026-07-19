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
  let best: SessionCert | null = null;
  await queryHistory(inboxTopicForAddress(peer), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (!cert) return;
    if (isExpired(cert)) return;
    if (!best || cert.expiresAtUnixMs > best.expiresAtUnixMs) best = cert;
  });
  if (best && (await verifySessionCert(best))) return best;
  return null;
}

/** Subscribe to my inbox. Returns an unsubscribe fn. Routes each message to the
 *  right callback; ignores anything that isn't a valid bundle or a notice I can read. */
export async function subscribeInbox(
  myAddress: Address,
  mySessionPrivHex: string,
  onKeyBundle: (cert: SessionCert) => void,
  onDmNotice: (notice: DmNotice) => void,
): Promise<() => Promise<void>> {
  return subscribeToTopic(inboxTopicForAddress(myAddress), (bytes) => {
    const cert = tryDecodeKeyBundle(bytes);
    if (cert) { onKeyBundle(cert); return; }
    void tryDecodeDmNotice(bytes, mySessionPrivHex).then((n) => { if (n) onDmNotice(n); });
  });
}

/** Replay inbox store history to recover DM notices (conversation index). */
export async function queryInboxNotices(
  myAddress: Address,
  mySessionPrivHex: string,
  onDmNotice: (notice: DmNotice) => void,
): Promise<void> {
  await queryHistory(inboxTopicForAddress(myAddress), (bytes) => {
    void tryDecodeDmNotice(bytes, mySessionPrivHex).then((n) => { if (n) onDmNotice(n); });
  });
}
