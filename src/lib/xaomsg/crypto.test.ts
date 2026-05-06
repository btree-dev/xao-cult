import { describe, it, expect } from 'vitest';
import { generateThreadKey, encryptBody, decryptBody, deriveDeterministicThreadKey } from './crypto';

describe('crypto', () => {
  it('round-trips a body via AES-GCM', async () => {
    const key = await generateThreadKey();
    const plaintext = JSON.stringify({ hello: 'world', emoji: '🚀' });
    const ct = await encryptBody(plaintext, key);
    expect(await decryptBody(ct, key)).toEqual(plaintext);
  });

  it('fails decryption with the wrong key', async () => {
    const a = await generateThreadKey();
    const b = await generateThreadKey();
    const ct = await encryptBody('secret', a);
    await expect(decryptBody(ct, b)).rejects.toThrow();
  });

  it('deriveDeterministicThreadKey is stable for the same address', async () => {
    const k1 = await deriveDeterministicThreadKey('0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3');
    const k2 = await deriveDeterministicThreadKey('0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3');
    const r1 = new Uint8Array(await crypto.subtle.exportKey('raw', k1));
    const r2 = new Uint8Array(await crypto.subtle.exportKey('raw', k2));
    expect(Array.from(r1)).toEqual(Array.from(r2));
  });
});
