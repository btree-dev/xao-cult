// src/lib/xaomsg/ecies.test.ts
import { describe, it, expect } from 'vitest';
import * as secp from '@noble/secp256k1';
import { wrapBytes, unwrapBytes } from './ecies';

function keypair() {
  const priv = secp.utils.randomPrivateKey();
  const pub = secp.getPublicKey(priv, true);
  const hex = (b: Uint8Array) => '0x' + Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  return { privHex: hex(priv), pubHex: hex(pub) };
}

describe('ecies wrap/unwrap', () => {
  it('round-trips between two parties (sender wraps, recipient unwraps)', async () => {
    const alice = keypair();
    const bob = keypair();
    const secret = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Bob wraps a secret for Alice using Bob's priv + Alice's pub
    const blob = await wrapBytes(secret, alice.pubHex, bob.privHex);
    // Alice unwraps using Alice's priv + Bob's pub
    const out = await unwrapBytes(blob, bob.pubHex, alice.privHex);
    expect(Array.from(out)).toEqual(Array.from(secret));
  });

  it('fails to unwrap with the wrong key', async () => {
    const alice = keypair();
    const bob = keypair();
    const mallory = keypair();
    const blob = await wrapBytes(new Uint8Array([9, 9, 9]), alice.pubHex, bob.privHex);
    await expect(unwrapBytes(blob, bob.pubHex, mallory.privHex)).rejects.toBeTruthy();
  });
});
