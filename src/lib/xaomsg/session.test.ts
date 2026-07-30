import { describe, it, expect, beforeEach, vi } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import {
  deriveSessionKeypair,
  sessionCertChallenge,
  sessionKeyDerivationMessage,
  verifySessionCert,
  signWithSession,
  verifyWithSession,
  loadSession,
  saveSession,
  clearSession,
  type PersistedSession,
} from './session';
import type { Address } from 'viem';

function signer(account: ReturnType<typeof privateKeyToAccount>) {
  return (message: string) => account.signMessage({ message });
}

describe('session', () => {
  it('deriveSessionKeypair produces a valid 32/33-byte secp256k1 pair', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { privateKey, publicKey } = await deriveSessionKeypair(account.address, signer(account));
    expect(privateKey.length).toBe(2 + 64);   // 0x + 32 bytes
    expect(publicKey.length).toBe(2 + 66);    // 0x + 33 bytes (compressed)
  });

  it('is fully deterministic: two independent derivations for the same wallet are byte-identical', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const first = await deriveSessionKeypair(account.address, signer(account));
    const second = await deriveSessionKeypair(account.address, signer(account));
    expect(second.privateKey).toBe(first.privateKey);
    expect(second.publicKey).toBe(first.publicKey);
    expect(second.cert).toEqual(first.cert);
  });

  it('different wallets derive different keypairs', async () => {
    const a = privateKeyToAccount(generatePrivateKey());
    const b = privateKeyToAccount(generatePrivateKey());
    const derivedA = await deriveSessionKeypair(a.address, signer(a));
    const derivedB = await deriveSessionKeypair(b.address, signer(b));
    expect(derivedA.privateKey).not.toBe(derivedB.privateKey);
  });

  it('the derivation message and the cert challenge are distinct strings', () => {
    // Regression guard: if these ever collapsed into one signed message, the
    // cert's public walletSignature (broadcast in every envelope and key
    // bundle) would BE the secret used to derive the private key.
    const addr = '0x000000000000000000000000000000000000dead' as Address;
    const derivation = sessionKeyDerivationMessage(addr);
    const challenge = sessionCertChallenge(addr, '0x' + 'aa'.repeat(33));
    expect(derivation).not.toBe(challenge);
  });

  it('sessionCertChallenge includes wallet and session pubkey, no expiry or chain', () => {
    const s = sessionCertChallenge(
      '0x000000000000000000000000000000000000dead',
      '0x' + 'aa'.repeat(33),
    );
    expect(s).toContain('wallet:0x000000000000000000000000000000000000dead');
    expect(s).toContain('session_pubkey:0x' + 'aa'.repeat(33));
    expect(s).not.toContain('expires:');
    expect(s).not.toContain('chain:');
  });

  it('deriveSessionKeypair + verifySessionCert round-trip via a viem account', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { cert } = await deriveSessionKeypair(account.address, signer(account));
    expect(await verifySessionCert(cert)).toBe(true);
  });

  it('verifySessionCert rejects a cert whose pubkey was swapped after signing', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { cert } = await deriveSessionKeypair(account.address, signer(account));
    const tampered = { ...cert, sessionPublicKeyHex: '0x02' + 'ff'.repeat(32) };
    expect(await verifySessionCert(tampered)).toBe(false);
  });

  it('verifySessionCert rejects a cert claiming a different wallet', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const impostor = privateKeyToAccount(generatePrivateKey());
    const { cert } = await deriveSessionKeypair(account.address, signer(account));
    const tampered = { ...cert, walletAddress: impostor.address };
    expect(await verifySessionCert(tampered)).toBe(false);
  });

  it('signWithSession + verifyWithSession round-trip', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const { privateKey, publicKey } = await deriveSessionKeypair(account.address, signer(account));
    const digest = ('0x' + 'cd'.repeat(32)) as `0x${string}`;
    const sig = await signWithSession(digest, privateKey);
    expect(await verifyWithSession(digest, sig, publicKey)).toBe(true);
    const otherAccount = privateKeyToAccount(generatePrivateKey());
    const wrongPub = (await deriveSessionKeypair(otherAccount.address, signer(otherAccount))).publicKey;
    expect(await verifyWithSession(digest, sig, wrongPub)).toBe(false);
  });
});

describe('session storage (localStorage-backed, permanent — no expiry)', () => {
  const WALLET = '0x000000000000000000000000000000000000dead' as Address;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loadSession returns null when nothing is stored', () => {
    expect(loadSession(WALLET)).toBeNull();
  });

  it('saveSession + loadSession round-trip via localStorage', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    saveSession(WALLET, persisted);
    expect(loadSession(WALLET)).toEqual(persisted);
    // Persisted in localStorage specifically, not sessionStorage.
    expect(localStorage.getItem(`xao-msg-session-${WALLET}`)).not.toBeNull();
    expect(sessionStorage.getItem(`xao-msg-session-${WALLET}`)).toBeNull();
  });

  it('clearSession removes the persisted entry', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    saveSession(WALLET, persisted);
    clearSession(WALLET);
    expect(loadSession(WALLET)).toBeNull();
  });

  it('falls back to an in-memory session when localStorage.setItem throws', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled');
    });
    try {
      saveSession(WALLET, persisted);
      expect(loadSession(WALLET)).toEqual(persisted);
    } finally {
      spy.mockRestore();
    }
  });
});
