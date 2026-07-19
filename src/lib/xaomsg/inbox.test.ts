// src/lib/xaomsg/inbox.test.ts
import { describe, it, expect } from 'vitest';
import * as secp from '@noble/secp256k1';
import { encodeKeyBundle, tryDecodeKeyBundle, encodeDmNotice, tryDecodeDmNotice, type DmNotice } from './inbox';
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
