// src/lib/xaomsg/conversationKey.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRawConversationKey,
  saveConversationKeyRaw,
  loadConversationKeyRaw,
  importAesKey,
} from './conversationKey';

const TID = ('0x' + 'ab'.repeat(32)) as `0x${string}`;

describe('conversationKey cache', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is cached', () => {
    expect(loadConversationKeyRaw(TID)).toBeNull();
  });

  it('round-trips a saved key', () => {
    const raw = generateRawConversationKey();
    expect(raw.length).toBe(32);
    saveConversationKeyRaw(TID, raw);
    const loaded = loadConversationKeyRaw(TID);
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!)).toEqual(Array.from(raw));
  });

  it('imports a usable AES-GCM key', async () => {
    const raw = generateRawConversationKey();
    const key = await importAesKey(raw);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('hi'));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    expect(new TextDecoder().decode(pt)).toBe('hi');
  });
});
