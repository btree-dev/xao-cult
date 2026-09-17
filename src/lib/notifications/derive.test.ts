import { describe, it, expect } from 'vitest';
import { deriveNotifications } from './derive';
import type { DeriveInput } from './types';

const ME = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';
const PEER = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb';
const C = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc';

const NOW = new Date('2026-06-15T12:00:00').getTime(); // local noon

function base(overrides: Partial<DeriveInput> = {}): DeriveInput {
  return { nowMs: NOW, contracts: [], tickets: [], chat: [], transactions: [], ...overrides };
}
const secOf = (ms: number) => Math.floor(ms / 1000);

describe('deriveNotifications', () => {
  it('new contract received only for party2 on Proposed', () => {
    const c = { contractAddress: C, party1: PEER, party2: ME, eventName: 'Show', status: 1, showDate: 0 };
    const asParty2 = deriveNotifications(base({ contracts: [c] }), ME);
    expect(asParty2.find((n) => n.id === `${C}-status-1`)).toBeTruthy();
    // party1's view of the same Proposed contract gets no "received" notice
    const asParty1 = deriveNotifications(base({ contracts: [{ ...c, party1: ME, party2: PEER }] }), ME);
    expect(asParty1.find((n) => n.id === `${C}-status-1`)).toBeUndefined();
  });

  it('maps signed / live / canceled statuses', () => {
    const mk = (status: number) => deriveNotifications(base({ contracts: [{ contractAddress: C, party1: ME, party2: PEER, eventName: 'Show', status, showDate: 0 }] }), ME);
    expect(mk(3).find((n) => n.title === 'Contract signed')).toBeTruthy();
    expect(mk(4).find((n) => n.title === 'Event is live')).toBeTruthy();
    expect(mk(6).find((n) => n.title === 'Event canceled')).toBeTruthy();
  });

  it('deposit notifications are skipped for now (mechanic unconfirmed)', () => {
    const dueSoon = secOf(NOW + 6 * 3600_000);
    const items = deriveNotifications(base({ contracts: [{ contractAddress: C, party1: ME, party2: PEER, eventName: 'Show', status: 4, showDate: 0, myDepositsDue: [dueSoon], myPayoutsDue: [dueSoon] }] }), ME);
    expect(items.find((n) => n.id.includes('deposit') || n.id.includes('payin') || n.id.includes('payout'))).toBeUndefined();
  });

  it('event day fires at/after 8am local on show date, within a day', () => {
    const showToday = secOf(new Date('2026-06-15T20:00:00').getTime()); // today 8pm
    const items = deriveNotifications(base({ contracts: [{ contractAddress: C, party1: ME, party2: PEER, eventName: 'Show', status: 4, showDate: showToday }] }), ME);
    expect(items.find((n) => n.id === `${C}-eventday`)).toBeTruthy();
  });

  it('doors fires once doorsTime has passed (within window)', () => {
    const doors = secOf(NOW - 30 * 60_000); // 30 min ago
    const items = deriveNotifications(base({ contracts: [{ contractAddress: C, party1: ME, party2: PEER, eventName: 'Show', status: 4, showDate: 0, doorsTime: doors }] }), ME);
    expect(items.find((n) => n.id === `${C}-doors`)).toBeTruthy();
  });

  it('ticket holder: show today + doors', () => {
    const showToday = secOf(new Date('2026-06-15T21:00:00').getTime());
    const doors = secOf(NOW - 10 * 60_000);
    const items = deriveNotifications(base({ tickets: [{ contractAddress: C, tokenId: '1', eventName: 'Gig', showDate: showToday, doorsTime: doors }] }), ME);
    expect(items.find((n) => n.id === `ticket-${C}-1-today`)).toBeTruthy();
    expect(items.find((n) => n.id === `ticket-${C}-1-doors`)).toBeTruthy();
  });

  it('chat + tx notifications, newest first, stable dedupe', () => {
    const items = deriveNotifications(base({
      chat: [{ threadId: 't1', peer: PEER, lastActivityMs: NOW - 1000, preview: 'hi' }],
      transactions: [{ hash: '0xabc', kind: 'swap', timestampMs: NOW - 5000, summary: 'Swapped' }],
    }), ME);
    expect(items[0].category).toBe('chat'); // most recent
    expect(items.find((n) => n.id === 'tx-0xabc')).toBeTruthy();
  });

  it('drops chat/tx older than the recency window', () => {
    const old = NOW - 60 * 86400_000;
    const items = deriveNotifications(base({
      chat: [{ threadId: 't1', peer: PEER, lastActivityMs: old }],
      transactions: [{ hash: '0xold', kind: 'sent', timestampMs: old, summary: 'old' }],
    }), ME);
    expect(items).toHaveLength(0);
  });
});
