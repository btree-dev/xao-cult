import { describe, it, expect } from 'vitest';
import { threadIdForDraft, threadIdForShow } from './threadId';

describe('threadIdForDraft', () => {
  it('is deterministic for the same draftId', () => {
    expect(threadIdForDraft('draft-1')).toBe(threadIdForDraft('draft-1'));
  });

  it('differs for a different draftId', () => {
    expect(threadIdForDraft('draft-1')).not.toBe(threadIdForDraft('draft-2'));
  });

  it('returns a 0x-prefixed 32-byte hex', () => {
    expect(threadIdForDraft('draft-1')).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('throws on an empty draftId', () => {
    expect(() => threadIdForDraft('')).toThrow();
  });

  it('is domain-separated from threadIdForShow even if a draftId string looks like an address', () => {
    const looksLikeAddress = '0x1111111111111111111111111111111111111111';
    expect(threadIdForDraft(looksLikeAddress)).not.toBe(
      threadIdForShow(looksLikeAddress as `0x${string}`),
    );
  });
});
