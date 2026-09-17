import { describe, it, expect, beforeEach } from 'vitest';
import { resolveTimestamps, stampFirstSeen } from './readState';
import type { NotificationItem } from './types';

const W = '0xWALLET';
const mk = (over: Partial<NotificationItem>): NotificationItem => ({
  id: 'x', category: 'contract', title: 't', body: 'b', timestampMs: 0, href: '/', ...over,
});

describe('readState timestamps', () => {
  beforeEach(() => localStorage.clear());

  it('leaves items with a real timestamp untouched (no overload of 0-check)', () => {
    // A tx item that legitimately has timestampMs 0 but is NOT needsFirstSeen
    // must keep its 0 — it must not be treated as a status sentinel.
    const zeroTx = mk({ id: 'tx-0', category: 'transaction', timestampMs: 0 });
    const realTx = mk({ id: 'tx-1', category: 'transaction', timestampMs: 1234 });
    const [a, b] = resolveTimestamps(W, [zeroTx, realTx]);
    expect(a.timestampMs).toBe(0);
    expect(b.timestampMs).toBe(1234);
  });

  it('needsFirstSeen item resolves to now when unseen, then to the persisted value', () => {
    const status = mk({ id: 's1', needsFirstSeen: true, timestampMs: 0 });
    const before = Date.now();
    const [r1] = resolveTimestamps(W, [status]);
    expect(r1.timestampMs).toBeGreaterThanOrEqual(before); // ~now, not persisted yet

    stampFirstSeen(W, [status]);
    const stamped = resolveTimestamps(W, [status])[0].timestampMs;
    // Second resolve returns the persisted value and is stable across calls.
    expect(resolveTimestamps(W, [status])[0].timestampMs).toBe(stamped);
  });

  it('resolveTimestamps returns fresh objects (never mutates input), even with no wallet', () => {
    const items = [mk({ id: 'a', timestampMs: 5 })];
    const out = resolveTimestamps(null, items);
    expect(out[0]).not.toBe(items[0]);
    out.sort(() => -1); // sorting the result must not reorder the caller's array
    expect(items[0].id).toBe('a');
  });
});
