import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import { mergeResolved } from './merge';
import { ContentType, type ResolvedMessage } from './types';

function msg(messageId: string, sentAt: number): ResolvedMessage {
  return {
    envelope: {
      body: {
        v: 1,
        messageId: messageId as Hex,
        threadId: ('0x' + '11'.repeat(32)) as Hex,
        contentType: ContentType.TEXT,
        parentHash: ('0x' + '00'.repeat(32)) as Hex,
        payload: { kind: 'text', text: messageId },
        sentAt,
        sender: '0x0000000000000000000000000000000000000001',
      },
      payloadHash: ('0x' + '22'.repeat(32)) as Hex,
      signature: ('0x' + '33'.repeat(64)) as Hex,
      cert: {
        v: 1,
        walletAddress: '0x0000000000000000000000000000000000000001',
        sessionPublicKeyHex: '0x00',
        walletSignature: '0x00' as Hex,
      },
    },
    bodyHash: ('0x' + '44'.repeat(32)) as Hex,
    receivedAtUnixMs: sentAt,
  };
}

describe('mergeResolved', () => {
  it('inserts a new message', () => {
    const out = mergeResolved([], msg('a', 100));
    expect(out).toHaveLength(1);
  });

  it('dedupes by messageId — same id is not added twice', () => {
    const first = mergeResolved([], msg('a', 100));
    const second = mergeResolved(first, msg('a', 100));
    expect(second).toHaveLength(1);
  });

  it('returns the same array reference when deduping (lets React bail out)', () => {
    const first = mergeResolved([], msg('a', 100));
    const second = mergeResolved(first, msg('a', 100));
    expect(second).toBe(first);
  });

  it('sorts by sentAt', () => {
    let list: ResolvedMessage[] = [];
    list = mergeResolved(list, msg('late', 300));
    list = mergeResolved(list, msg('early', 100));
    list = mergeResolved(list, msg('mid', 200));
    expect(list.map((m) => m.envelope.body.messageId)).toEqual(['early', 'mid', 'late']);
  });
});
