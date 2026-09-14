import { describe, it, expect, beforeEach } from 'vitest';
import type { Address, Hex } from 'viem';
import {
  buildContactCardPayload, applyContactCard, hashContactCardProfile,
  lastSentContactCardHash, markContactCardSent,
} from './contactCard';

describe('contactCard', () => {
  beforeEach(() => localStorage.clear());

  it('buildContactCardPayload stamps kind and sentAt', () => {
    const before = Date.now();
    const payload = buildContactCardPayload({ walletAddress: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address, username: 'alice', profilePictureUrl: 'https://x/y.png' });
    expect(payload.kind).toBe('contact-card');
    expect(payload.walletAddress).toBe('0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa');
    expect(payload.username).toBe('alice');
    expect(payload.profilePictureUrl).toBe('https://x/y.png');
    expect(payload.sentAt).toBeGreaterThanOrEqual(before);
  });

  it('buildContactCardPayload omits profilePictureUrl when not given', () => {
    const payload = buildContactCardPayload({ walletAddress: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address, username: 'alice' });
    expect(payload.profilePictureUrl).toBeUndefined();
  });

  it('applyContactCard maps a payload to a cache-shaped record with a fresh cachedAt', () => {
    const before = Date.now();
    const payload = buildContactCardPayload({ walletAddress: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address, username: 'alice', profilePictureUrl: 'https://x/y.png' });
    const applied = applyContactCard(payload);
    expect(applied).toEqual({
      walletAddress: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
      username: 'alice',
      profilePictureUrl: 'https://x/y.png',
      cachedAt: applied.cachedAt,
    });
    expect(applied.cachedAt).toBeGreaterThanOrEqual(before);
  });

  it('lastSentContactCardHash is undefined until markContactCardSent is called for that thread', () => {
    const threadId = '0x' + '11'.repeat(32) as Hex;
    const hash = hashContactCardProfile('alice', 'https://x/y.png');
    expect(lastSentContactCardHash(threadId)).toBeUndefined();
    markContactCardSent(threadId, hash);
    expect(lastSentContactCardHash(threadId)).toBe(hash);
  });

  it('markContactCardSent is scoped per-thread and case-insensitive', () => {
    const threadA = '0x' + '22'.repeat(32) as Hex;
    const threadB = '0x' + '33'.repeat(32) as Hex;
    const hash = hashContactCardProfile('alice', 'https://x/y.png');
    markContactCardSent(threadA, hash);
    expect(lastSentContactCardHash(threadA)).toBe(hash);
    expect(lastSentContactCardHash(threadB)).toBeUndefined();
    expect(lastSentContactCardHash(('0x' + '22'.repeat(32)).toUpperCase().replace('0X', '0x') as Hex)).toBe(hash);
  });

  it('hashContactCardProfile changes when username or profilePictureUrl changes', () => {
    const base = hashContactCardProfile('alice', 'https://x/y.png');
    expect(hashContactCardProfile('bob', 'https://x/y.png')).not.toBe(base);
    expect(hashContactCardProfile('alice', 'https://x/z.png')).not.toBe(base);
    expect(hashContactCardProfile('alice', undefined)).not.toBe(base);
    expect(hashContactCardProfile('alice', 'https://x/y.png')).toBe(base);
  });
});
