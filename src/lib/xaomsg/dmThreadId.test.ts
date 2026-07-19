import { describe, it, expect } from 'vitest';
import { dmThreadId } from './dmThreadId';

const A = '0x1111111111111111111111111111111111111111' as const;
const B = '0x2222222222222222222222222222222222222222' as const;

describe('dmThreadId', () => {
  it('is identical regardless of argument order', () => {
    expect(dmThreadId(A, B)).toBe(dmThreadId(B, A));
  });
  it('is case-insensitive', () => {
    expect(dmThreadId(A.toUpperCase() as any, B)).toBe(dmThreadId(A, B));
  });
  it('differs for a different pair', () => {
    const C = '0x3333333333333333333333333333333333333333' as const;
    expect(dmThreadId(A, B)).not.toBe(dmThreadId(A, C));
  });
  it('returns a 0x-prefixed 32-byte hex', () => {
    expect(dmThreadId(A, B)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
