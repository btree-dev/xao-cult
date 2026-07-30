// src/lib/xaomsg/inbox.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as secp from '@noble/secp256k1';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

vi.mock('./waku', () => ({
  publishToTopic: vi.fn(async () => {}),
  subscribeToTopic: vi.fn(),
  queryHistory: vi.fn(async () => {}),
}));

import {
  encodeKeyBundle,
  tryDecodeKeyBundle,
  encodeThreadNotice,
  tryDecodeThreadNotice,
  queryPeerKeyBundle,
  subscribeInbox,
  queryInboxNotices,
  eventBackfillDedupeKey,
  type ThreadNotice,
} from './inbox';
import { deriveSessionKeypair } from './session';
import { queryHistory, subscribeToTopic } from './waku';
import { wrapBytes } from './ecies';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';
import type { SessionCert } from './types';

const hex = (b: Uint8Array) => '0x' + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
function keypair() {
  const priv = secp.utils.randomPrivateKey();
  return { privHex: hex(priv), pubHex: hex(secp.getPublicKey(priv, true)) };
}
const cert: SessionCert = {
  v: 1,
  walletAddress: '0x1111111111111111111111111111111111111111',
  sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
  walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
};

async function makeGenuineCertWithKey(): Promise<{ cert: SessionCert; privateKeyHex: string }> {
  const account = privateKeyToAccount(generatePrivateKey());
  const { privateKey, cert: genuineCert } = await deriveSessionKeypair(account.address, (message) =>
    account.signMessage({ message }),
  );
  return { cert: genuineCert, privateKeyHex: privateKey };
}

async function makeGenuineCert(): Promise<SessionCert> {
  return (await makeGenuineCertWithKey()).cert;
}

// A forged cert: same claimed wallet, but the pubkey was swapped after
// signing, so the signature no longer covers it — verifySessionCert fails.
function forgeCert(base: SessionCert): SessionCert {
  return { ...base, sessionPublicKeyHex: '0x02' + 'ff'.repeat(32) };
}

// A single macrotask tick isn't always enough here: tryDecodeThreadNotice's
// chain (verifySessionCert, then ECIES unwrapBytes -> crypto.subtle
// importKey + decrypt) can take multiple event-loop turns to settle under
// happy-dom's WebCrypto, empirically measured at up to ~3 ticks. Loop a
// handful of ticks so subscribeInbox's fire-and-forget async callback has
// settled before assertions run.
const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
};

// ---- eventBackfillDedupeKey (Fix-round-3 regression: dedupe-set must not
// collapse a draft's pre-mint and mint notices onto the same slot) ----
describe('eventBackfillDedupeKey', () => {
  it('produces different keys for the same draftId with and without a contractAddress', () => {
    const preMint = eventBackfillDedupeKey('draft-1', undefined);
    const mint = eventBackfillDedupeKey('draft-1', '0x2222222222222222222222222222222222222222');
    expect(preMint).not.toBe(mint);
  });

  it('reproduces the "honest user misses the mint notice" scenario: a dedupe Set seeded with the pre-mint key still admits the mint key for the same draftId', () => {
    const seen = new Set<string>();
    const draftId = 'draft-1';
    const contractAddress = '0x2222222222222222222222222222222222222222';

    const preMintKey = eventBackfillDedupeKey(draftId, undefined);
    expect(seen.has(preMintKey)).toBe(false);
    seen.add(preMintKey);

    const mintKey = eventBackfillDedupeKey(draftId, contractAddress);
    expect(seen.has(mintKey)).toBe(false);
  });

  it('produces the same key for repeated calls with identical inputs (idempotent within one mint state)', () => {
    const a = eventBackfillDedupeKey('draft-1', '0x2222222222222222222222222222222222222222');
    const b = eventBackfillDedupeKey('draft-1', '0x2222222222222222222222222222222222222222');
    expect(a).toBe(b);
  });

  it('produces different keys for different draftIds even with the same contractAddress presence', () => {
    const a = eventBackfillDedupeKey('draft-1', undefined);
    const b = eventBackfillDedupeKey('draft-2', undefined);
    expect(a).not.toBe(b);
  });
});

describe('inbox key bundle', () => {
  it('round-trips a key bundle', () => {
    const out = tryDecodeKeyBundle(encodeKeyBundle(cert));
    expect(out?.sessionPublicKeyHex).toBe(cert.sessionPublicKeyHex);
  });
  it('returns null for a thread-notice message', async () => {
    const owner = keypair();
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, sender.privateKeyHex, sender.cert);
    expect(tryDecodeKeyBundle(bytes)).toBeNull();
  });
});

describe('inbox thread notice (dm kind)', () => {
  it('round-trips an encrypted notice to the owner', async () => {
    const owner = keypair();
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = {
      kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, preview: 'hi', ts: 42,
    };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, sender.privateKeyHex, sender.cert);
    const out = await tryDecodeThreadNotice(bytes, owner.privHex);
    expect(out).toEqual(notice);
  });

  it('returns null when decrypted by the wrong owner', async () => {
    const owner = keypair();
    const sender = await makeGenuineCertWithKey();
    const mallory = keypair();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, sender.privateKeyHex, sender.cert);
    expect(await tryDecodeThreadNotice(bytes, mallory.privHex)).toBeNull();
  });

  it("returns null when the cert's wallet does not match the claimed sender", async () => {
    const owner = keypair();
    const senderA = await makeGenuineCertWithKey();
    const walletB = privateKeyToAccount(generatePrivateKey()).address;
    const notice: ThreadNotice = { kind: 'dm', from: walletB, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, senderA.privateKeyHex, senderA.cert);
    expect(await tryDecodeThreadNotice(bytes, owner.privHex)).toBeNull();
  });

  it('returns null when the sender cert fails signature verification', async () => {
    const owner = keypair();
    const genuine = await makeGenuineCertWithKey();
    const forged = forgeCert(genuine.cert);
    const notice: ThreadNotice = { kind: 'dm', from: forged.walletAddress, threadId: ('0x' + '33'.repeat(32)) as any, ts: 1 };
    const bytes = await encodeThreadNotice(notice, owner.pubHex, genuine.privateKeyHex, forged);
    expect(await tryDecodeThreadNotice(bytes, owner.privHex)).toBeNull();
  });
});

// ---- key-bundle trust logic (mocked Waku layer) ----

beforeEach(() => {
  vi.mocked(queryHistory).mockReset().mockImplementation(async () => {});
  vi.mocked(subscribeToTopic).mockReset();
});

function scriptHistory(messages: Uint8Array[]) {
  vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
    for (const m of messages) onMessage(m);
  });
}

describe('queryPeerKeyBundle', () => {
  it('returns the genuine bundle even when a forged bundle (bad signature) is in history', async () => {
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine);
    scriptHistory([encodeKeyBundle(forged), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('is not locked out by a malformed bundle (missing pubkey) appearing first', async () => {
    const genuine = await makeGenuineCert();
    const malformed = { ...genuine, sessionPublicKeyHex: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(malformed), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('returns null when only forged/invalid bundles exist', async () => {
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine);
    const malformed = { ...genuine, sessionPublicKeyHex: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(forged), encodeKeyBundle(malformed)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toBeNull();
  });

  it('returns null on an empty history', async () => {
    scriptHistory([]);
    const out = await queryPeerKeyBundle('0x1111111111111111111111111111111111111111');
    expect(out).toBeNull();
  });

  it('rejects a validly-signed cert for a different wallet posted on the peer topic', async () => {
    const attacker = await makeGenuineCert();
    const peer = '0x9999999999999999999999999999999999999999' as const;
    scriptHistory([encodeKeyBundle(attacker)]);
    const out = await queryPeerKeyBundle(peer);
    expect(out).toBeNull();
  });

  it('still returns the peer bundle when an attacker cert for another wallet sorts first', async () => {
    const genuine = await makeGenuineCert();
    const attacker = await makeGenuineCert();
    scriptHistory([encodeKeyBundle(attacker), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  // Regression-replacement for the 2026-07-29 publish-time-selection bug:
  // that fix is no longer needed because every genuinely-signed cert for a
  // wallet now carries the identical, deterministically-derived pubkey —
  // there is nothing left to disambiguate by order or timestamp.
  it('accepts the peer\'s cert regardless of duplicate entries in its history', async () => {
    const genuine = await makeGenuineCert();
    scriptHistory([encodeKeyBundle(genuine), encodeKeyBundle(genuine), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });
});

describe('subscribeInbox key-bundle verification', () => {
  function captureSubscription() {
    let deliver: ((bytes: Uint8Array) => void) | undefined;
    vi.mocked(subscribeToTopic).mockImplementation(async (_topic, onMessage) => {
      deliver = onMessage;
      return async () => {};
    });
    return () => deliver!;
  }

  it('does not invoke onKeyBundle for a shape-valid but unverified cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine);
    await subscribeInbox(genuine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(forged));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('invokes onKeyBundle for a genuine cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const genuine = await makeGenuineCert();
    await subscribeInbox(genuine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(genuine));
    await flush();
    expect(onKeyBundle).toHaveBeenCalledTimes(1);
    expect(onKeyBundle).toHaveBeenCalledWith(genuine);
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('ignores a validly-signed cert for a different wallet but accepts my own', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const mine = await makeGenuineCert();
    const foreign = await makeGenuineCert();
    await subscribeInbox(mine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onThreadNotice);
    getDeliver()(encodeKeyBundle(foreign));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
    getDeliver()(encodeKeyBundle(mine));
    await flush();
    expect(onKeyBundle).toHaveBeenCalledTimes(1);
    expect(onKeyBundle).toHaveBeenCalledWith(mine);
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('delivers a valid dm-kind notice via onThreadNotice', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: dmThreadId(myAddress, sender.cert.walletAddress), ts: 1 };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).toHaveBeenCalledWith(notice);
  });

  it('rejects a dm-kind notice whose threadId does not match dmThreadId(me, from)', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = { kind: 'dm', from: sender.cert.walletAddress, threadId: ('0x' + '99'.repeat(32)) as any, ts: 1 };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('delivers a valid event-kind notice via onThreadNotice, including a contractAddress mint pairing', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const draftId = 'draft-abc';
    const notice: ThreadNotice = {
      kind: 'event', from: sender.cert.walletAddress, threadId: threadIdForDraft(draftId), draftId,
      contractAddress: '0x2222222222222222222222222222222222222222', ts: 1,
    };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).toHaveBeenCalledWith(notice);
  });

  it('rejects an event-kind notice with a draftId/threadId mismatch', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice: ThreadNotice = {
      kind: 'event', from: sender.cert.walletAddress, threadId: threadIdForDraft('draft-xyz'), draftId: 'draft-abc', ts: 1,
    };
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });

  it('rejects an event-kind notice with no draftId at all', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onThreadNotice = vi.fn();
    const me = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender = await makeGenuineCertWithKey();
    const notice = {
      kind: 'event', from: sender.cert.walletAddress, threadId: threadIdForDraft('draft-abc'), ts: 1,
    } as ThreadNotice;
    await subscribeInbox(myAddress, me.privHex, onKeyBundle, onThreadNotice);
    getDeliver()(await encodeThreadNotice(notice, me.pubHex, sender.privateKeyHex, sender.cert));
    await flush();
    expect(onThreadNotice).not.toHaveBeenCalled();
  });
});

// ---- queryInboxNotices completeness (Finding 1) ----
describe('queryInboxNotices completeness', () => {
  it('does not resolve until every matching, decodable notice has been delivered', async () => {
    const owner = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const sender1 = await makeGenuineCertWithKey();
    const sender2 = await makeGenuineCertWithKey();
    const sender3 = await makeGenuineCertWithKey();

    const notice1: ThreadNotice = { kind: 'dm', from: sender1.cert.walletAddress, threadId: dmThreadId(myAddress, sender1.cert.walletAddress), ts: 100 };
    const notice2: ThreadNotice = { kind: 'dm', from: sender2.cert.walletAddress, threadId: dmThreadId(myAddress, sender2.cert.walletAddress), ts: 200 };
    const notice3: ThreadNotice = { kind: 'dm', from: sender3.cert.walletAddress, threadId: dmThreadId(myAddress, sender3.cert.walletAddress), ts: 300 };

    const bytes1 = await encodeThreadNotice(notice1, owner.pubHex, sender1.privateKeyHex, sender1.cert);
    const bytes2 = await encodeThreadNotice(notice2, owner.pubHex, sender2.privateKeyHex, sender2.cert);
    const bytes3 = await encodeThreadNotice(notice3, owner.pubHex, sender3.privateKeyHex, sender3.cert);

    vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
      for (const m of [bytes1, bytes2, bytes3]) {
        await onMessage(m);
      }
    });

    const onThreadNotice = vi.fn();
    await queryInboxNotices(myAddress, owner.privHex, onThreadNotice);

    expect(onThreadNotice).toHaveBeenCalledTimes(3);
    expect(onThreadNotice).toHaveBeenCalledWith(notice1);
    expect(onThreadNotice).toHaveBeenCalledWith(notice2);
    expect(onThreadNotice).toHaveBeenCalledWith(notice3);
  });

  it('delivers a well-formed event notice alongside dm notices in the same replay', async () => {
    const owner = keypair();
    const myAddress = '0x1111111111111111111111111111111111111111' as const;
    const dmSender = await makeGenuineCertWithKey();
    const eventSender = await makeGenuineCertWithKey();
    const draftId = 'draft-42';

    const dmNotice: ThreadNotice = { kind: 'dm', from: dmSender.cert.walletAddress, threadId: dmThreadId(myAddress, dmSender.cert.walletAddress), ts: 100 };
    const eventNotice: ThreadNotice = { kind: 'event', from: eventSender.cert.walletAddress, threadId: threadIdForDraft(draftId), draftId, ts: 200 };

    const bytes1 = await encodeThreadNotice(dmNotice, owner.pubHex, dmSender.privateKeyHex, dmSender.cert);
    const bytes2 = await encodeThreadNotice(eventNotice, owner.pubHex, eventSender.privateKeyHex, eventSender.cert);

    vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
      for (const m of [bytes1, bytes2]) await onMessage(m);
    });

    const onThreadNotice = vi.fn();
    await queryInboxNotices(myAddress, owner.privHex, onThreadNotice);

    expect(onThreadNotice).toHaveBeenCalledTimes(2);
    expect(onThreadNotice).toHaveBeenCalledWith(dmNotice);
    expect(onThreadNotice).toHaveBeenCalledWith(eventNotice);
  });
});

// ---- queryInboxNotices isolation from malformed decrypted notices ----
describe('queryInboxNotices isolation from malformed decrypted notices', () => {
  const testEnc = new TextEncoder();
  const myAddress = '0x1111111111111111111111111111111111111111' as const;

  async function encodeMalformedNotice(
    malformedPlaintext: unknown,
    ownerSessionPubHex: string,
    mySessionPrivHex: string,
    myCert: SessionCert,
  ): Promise<Uint8Array> {
    const encBlob = await wrapBytes(testEnc.encode(JSON.stringify(malformedPlaintext)), ownerSessionPubHex, mySessionPrivHex);
    return testEnc.encode(JSON.stringify({ t: 'dm', cert: myCert, enc: encBlob }));
  }

  it('delivers both well-formed notices even when a malformed-but-decryptable one sits between them', async () => {
    const owner = keypair();
    const sender1 = await makeGenuineCertWithKey();
    const attacker = await makeGenuineCertWithKey();
    const sender2 = await makeGenuineCertWithKey();

    const notice1: ThreadNotice = { kind: 'dm', from: sender1.cert.walletAddress, threadId: dmThreadId(myAddress, sender1.cert.walletAddress), ts: 100 };
    const malformed = { kind: 'dm', from: attacker.cert.walletAddress, ts: 999 };
    const notice2: ThreadNotice = { kind: 'dm', from: sender2.cert.walletAddress, threadId: dmThreadId(myAddress, sender2.cert.walletAddress), ts: 200 };

    const bytes1 = await encodeThreadNotice(notice1, owner.pubHex, sender1.privateKeyHex, sender1.cert);
    const malformedBytes = await encodeMalformedNotice(malformed, owner.pubHex, attacker.privateKeyHex, attacker.cert);
    const bytes2 = await encodeThreadNotice(notice2, owner.pubHex, sender2.privateKeyHex, sender2.cert);

    vi.mocked(queryHistory).mockImplementation(async (_topic, onMessage) => {
      for (const m of [bytes1, malformedBytes, bytes2]) {
        await onMessage(m);
      }
    });

    const onThreadNotice = vi.fn();

    await expect(queryInboxNotices(myAddress, owner.privHex, onThreadNotice)).resolves.toBeUndefined();

    expect(onThreadNotice).toHaveBeenCalledTimes(2);
    expect(onThreadNotice).toHaveBeenCalledWith(notice1);
    expect(onThreadNotice).toHaveBeenCalledWith(notice2);
  });
});
