import { describe, it, expect, beforeEach, vi } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import {
  createSessionKeypair,
  sessionChallengeString,
  mintSessionCert,
  verifySessionCert,
  isExpired,
  signWithSession,
  verifyWithSession,
  SESSION_DURATION_MS,
  loadSession,
  saveSession,
  clearSession,
  type PersistedSession,
} from './session';
import type { Address } from 'viem';

describe('session', () => {
  it('createSessionKeypair generates a valid 32/33 byte secp256k1 pair', async () => {
    const { privateKey, publicKey } = await createSessionKeypair();
    expect(privateKey.length).toBe(2 + 64);             // 0x + 32 bytes
    expect(publicKey.length).toBe(2 + 66);              // 0x + 33 bytes (compressed)
  });

  it('sessionChallengeString includes wallet, pubkey, expiry, chainId', () => {
    const s = sessionChallengeString({
      walletAddress: '0x000000000000000000000000000000000000dead',
      sessionPublicKeyHex: '0x' + 'aa'.repeat(33),
      expiresAtUnixMs: 1700000000000,
      chainId: 84532,
    });
    expect(s).toContain('wallet:0x000000000000000000000000000000000000dead');
    expect(s).toContain('session_pubkey:0x' + 'aa'.repeat(33));
    expect(s).toContain('expires:1700000000000');
    expect(s).toContain('chain:84532');
    expect(s).toContain('XaoMsg session v1');
  });

  it('mintSessionCert + verifySessionCert round-trip via a viem account', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { privateKey: sessionPriv, publicKey: sessionPub } = await createSessionKeypair();
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const cert = await mintSessionCert({
      walletAddress: account.address,
      sessionPublicKeyHex: sessionPub,
      expiresAtUnixMs: expiresAt,
      chainId: 84532,
      signMessage: async (msg) => account.signMessage({ message: msg }),
    });
    expect(await verifySessionCert(cert)).toBe(true);
    void sessionPriv;
  });

  it('verifySessionCert rejects a tampered expiry', async () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { publicKey: sessionPub } = await createSessionKeypair();
    const cert = await mintSessionCert({
      walletAddress: account.address,
      sessionPublicKeyHex: sessionPub,
      expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
      chainId: 84532,
      signMessage: async (msg) => account.signMessage({ message: msg }),
    });
    const tampered = { ...cert, expiresAtUnixMs: cert.expiresAtUnixMs + 1 };
    expect(await verifySessionCert(tampered)).toBe(false);
  });

  it('isExpired flags certs whose expiresAt has passed', () => {
    expect(isExpired({ expiresAtUnixMs: Date.now() - 1 } as any)).toBe(true);
    expect(isExpired({ expiresAtUnixMs: Date.now() + 1000 } as any)).toBe(false);
  });

  it('signWithSession + verifyWithSession round-trip', async () => {
    const { privateKey, publicKey } = await createSessionKeypair();
    const digest = ('0x' + 'cd'.repeat(32)) as `0x${string}`;
    const sig = await signWithSession(digest, privateKey);
    expect(await verifyWithSession(digest, sig, publicKey)).toBe(true);
    const wrongPub = (await createSessionKeypair()).publicKey;
    expect(await verifyWithSession(digest, sig, wrongPub)).toBe(false);
  });
});

describe('session storage (localStorage-backed, 30-day duration)', () => {
  const WALLET = '0x000000000000000000000000000000000000dead' as Address;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('SESSION_DURATION_MS is 30 days', () => {
    expect(SESSION_DURATION_MS).toBe(30 * 24 * 60 * 60 * 1000);
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
        expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
        chainId: 84532,
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

  it('loadSession returns null for an expired persisted session', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        expiresAtUnixMs: Date.now() - 1000,
        chainId: 84532,
        walletSignature: ('0x' + 'cd'.repeat(65)) as `0x${string}`,
      },
      privateKeyHex: ('0x' + '11'.repeat(32)) as `0x${string}`,
    };
    saveSession(WALLET, persisted);
    expect(loadSession(WALLET)).toBeNull();
  });

  it('clearSession removes the persisted entry', () => {
    const persisted: PersistedSession = {
      cert: {
        v: 1,
        walletAddress: WALLET,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
        chainId: 84532,
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
        expiresAtUnixMs: Date.now() + SESSION_DURATION_MS,
        chainId: 84532,
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
