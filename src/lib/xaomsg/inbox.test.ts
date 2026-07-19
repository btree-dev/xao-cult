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
  encodeDmNotice,
  tryDecodeDmNotice,
  queryPeerKeyBundle,
  subscribeInbox,
  type DmNotice,
} from './inbox';
import { createSessionKeypair, mintSessionCert } from './session';
import { queryHistory, subscribeToTopic } from './waku';
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
  expiresAtUnixMs: Date.now() + 100000,
  chainId: 84532,
  walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
};

describe('inbox key bundle', () => {
  it('round-trips a key bundle', () => {
    const out = tryDecodeKeyBundle(encodeKeyBundle(cert));
    expect(out?.sessionPublicKeyHex).toBe(cert.sessionPublicKeyHex);
  });
  it('returns null for a dm message', async () => {
    const owner = keypair();
    const sender = keypair();
    const notice: DmNotice = { from: '0x2222222222222222222222222222222222222222', threadId: ('0x' + '33'.repeat(32)) as any, convKeyB64: 'AAAA', ts: 1 };
    const bytes = await encodeDmNotice(notice, owner.pubHex, sender.privHex, sender.pubHex);
    expect(tryDecodeKeyBundle(bytes)).toBeNull();
  });
});

describe('inbox dm notice', () => {
  it('round-trips an encrypted notice to the owner', async () => {
    const owner = keypair();
    const sender = keypair();
    const notice: DmNotice = { from: '0x2222222222222222222222222222222222222222', threadId: ('0x' + '33'.repeat(32)) as any, convKeyB64: 'S0VZBYTES', preview: 'hi', ts: 42 };
    const bytes = await encodeDmNotice(notice, owner.pubHex, sender.privHex, sender.pubHex);
    const out = await tryDecodeDmNotice(bytes, owner.privHex);
    expect(out).toEqual(notice);
  });
  it('returns null when decrypted by the wrong owner', async () => {
    const owner = keypair();
    const sender = keypair();
    const mallory = keypair();
    const notice: DmNotice = { from: '0x2222222222222222222222222222222222222222', threadId: ('0x' + '33'.repeat(32)) as any, convKeyB64: 'x', ts: 1 };
    const bytes = await encodeDmNotice(notice, owner.pubHex, sender.privHex, sender.pubHex);
    expect(await tryDecodeDmNotice(bytes, mallory.privHex)).toBeNull();
  });
});

// ---- key-bundle trust logic (mocked Waku layer) ----

/** Real, signature-verifiable cert minted the same way the app does. */
async function makeGenuineCert(expiresAtUnixMs = Date.now() + 60 * 60 * 1000): Promise<SessionCert> {
  const account = privateKeyToAccount(generatePrivateKey());
  const kp = await createSessionKeypair();
  return mintSessionCert({
    walletAddress: account.address,
    sessionPublicKeyHex: kp.publicKey,
    expiresAtUnixMs,
    chainId: 84532,
    signMessage: (message) => account.signMessage({ message }),
  });
}

/** Attacker-shaped cert: valid JSON shape, unexpired, but the signature never recovers to walletAddress. */
function forgeCert(base: SessionCert, expiresAtUnixMs: number): SessionCert {
  return { ...base, expiresAtUnixMs, walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}` };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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
  it('returns the genuine bundle even when a forged bundle with higher expiry is in history', async () => {
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine, genuine.expiresAtUnixMs + 1_000_000);
    scriptHistory([encodeKeyBundle(forged), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('is not locked out by a malformed bundle with undefined expiry appearing first', async () => {
    const genuine = await makeGenuineCert();
    const malformed = { ...genuine, expiresAtUnixMs: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(malformed), encodeKeyBundle(genuine)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toEqual(genuine);
  });

  it('returns null when only forged/invalid bundles exist', async () => {
    const genuine = await makeGenuineCert();
    const forged1 = forgeCert(genuine, genuine.expiresAtUnixMs + 5000);
    const malformed = { ...genuine, expiresAtUnixMs: undefined } as unknown as SessionCert;
    scriptHistory([encodeKeyBundle(forged1), encodeKeyBundle(malformed)]);
    const out = await queryPeerKeyBundle(genuine.walletAddress);
    expect(out).toBeNull();
  });

  it('returns null on an empty history', async () => {
    scriptHistory([]);
    const out = await queryPeerKeyBundle('0x1111111111111111111111111111111111111111');
    expect(out).toBeNull();
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
    const onDmNotice = vi.fn();
    const genuine = await makeGenuineCert();
    const forged = forgeCert(genuine, genuine.expiresAtUnixMs + 1000);
    await subscribeInbox(genuine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onDmNotice);
    getDeliver()(encodeKeyBundle(forged));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
    expect(onDmNotice).not.toHaveBeenCalled();
  });

  it('invokes onKeyBundle for a genuine cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onDmNotice = vi.fn();
    const genuine = await makeGenuineCert();
    await subscribeInbox(genuine.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onDmNotice);
    getDeliver()(encodeKeyBundle(genuine));
    await flush();
    expect(onKeyBundle).toHaveBeenCalledTimes(1);
    expect(onKeyBundle).toHaveBeenCalledWith(genuine);
    expect(onDmNotice).not.toHaveBeenCalled();
  });

  it('does not invoke onKeyBundle for an expired but genuinely signed cert', async () => {
    const getDeliver = captureSubscription();
    const onKeyBundle = vi.fn();
    const onDmNotice = vi.fn();
    const expired = await makeGenuineCert(Date.now() - 1000);
    await subscribeInbox(expired.walletAddress, '0x' + '11'.repeat(32), onKeyBundle, onDmNotice);
    getDeliver()(encodeKeyBundle(expired));
    await flush();
    expect(onKeyBundle).not.toHaveBeenCalled();
  });
});
