// src/lib/xaomsg/conversationStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConversations, upsertConversation, mergeConversations, type ConversationRecord } from './conversationStore';

const OWNER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const T1 = ('0x' + '11'.repeat(32)) as `0x${string}`;
const T2 = ('0x' + '22'.repeat(32)) as `0x${string}`;
const rec = (t: `0x${string}`, ts: number, preview?: string): ConversationRecord =>
  ({ threadId: t, peer: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', lastActivityUnixMs: ts, lastPreview: preview });

describe('conversationStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', () => {
    expect(loadConversations(OWNER)).toEqual([]);
  });

  it('upserts and persists, newest first', () => {
    upsertConversation(OWNER, rec(T1, 100));
    const list = upsertConversation(OWNER, rec(T2, 200));
    expect(list.map((r) => r.threadId)).toEqual([T2, T1]);
    expect(loadConversations(OWNER).map((r) => r.threadId)).toEqual([T2, T1]);
  });

  it('upsert on same threadId keeps the newer activity', () => {
    upsertConversation(OWNER, rec(T1, 100, 'old'));
    const list = upsertConversation(OWNER, rec(T1, 300, 'new'));
    expect(list.length).toBe(1);
    expect(list[0].lastPreview).toBe('new');
    expect(list[0].lastActivityUnixMs).toBe(300);
  });

  it('mergeConversations dedupes by threadId, newest wins', () => {
    const merged = mergeConversations([rec(T1, 100, 'a')], [rec(T1, 50, 'b'), rec(T2, 300)]);
    expect(merged.map((r) => r.threadId)).toEqual([T2, T1]);
    expect(merged.find((r) => r.threadId === T1)!.lastPreview).toBe('a');
  });
});
