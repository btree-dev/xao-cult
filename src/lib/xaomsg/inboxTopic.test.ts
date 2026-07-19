import { describe, it, expect } from 'vitest';
import { inboxTopicForAddress } from './inboxTopic';

const A = '0x1111111111111111111111111111111111111111' as const;

describe('inboxTopicForAddress', () => {
  it('is stable and case-insensitive', () => {
    expect(inboxTopicForAddress(A)).toBe(inboxTopicForAddress(A.toUpperCase() as any));
  });
  it('matches the Waku content-topic format', () => {
    expect(inboxTopicForAddress(A)).toMatch(/^\/xao\/1\/[0-9a-f]{64}\/json$/);
  });
  it('differs per address', () => {
    const B = '0x2222222222222222222222222222222222222222' as const;
    expect(inboxTopicForAddress(A)).not.toBe(inboxTopicForAddress(B));
  });
});
