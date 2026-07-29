import { describe, it, expect, beforeEach } from 'vitest';
import type { Address } from 'viem';
import {
  listDrafts, loadDraft, upsertDraft, recordApproval, recordMint, isMinted, resolveDraftForContract, type OffchainContractDraft,
} from './offchainContracts';

const ALICE = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address;
const BOB = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb' as Address;

function makeDraft(overrides: Partial<OffchainContractDraft> = {}): OffchainContractDraft {
  return {
    draftId: 'draft-1',
    party1: ALICE,
    party2: BOB,
    terms: { promotion: { value: 'Big Show' } } as any,
    revisionNumber: 1,
    approvals: [],
    lastActivityUnixMs: Date.now(),
    ...overrides,
  };
}

describe('offchainContracts', () => {
  beforeEach(() => localStorage.clear());

  it('upsertDraft stores a new draft; listDrafts returns it', () => {
    upsertDraft(makeDraft());
    const all = listDrafts();
    expect(all).toHaveLength(1);
    expect(all[0].draftId).toBe('draft-1');
  });

  it('loadDraft returns null for an unknown draftId', () => {
    expect(loadDraft('nope')).toBeNull();
  });

  it('upsertDraft: higher revisionNumber wins', () => {
    upsertDraft(makeDraft({ revisionNumber: 1, terms: { promotion: { value: 'v1' } } as any }));
    upsertDraft(makeDraft({ revisionNumber: 2, terms: { promotion: { value: 'v2' } } as any }));
    expect(loadDraft('draft-1')?.terms).toEqual({ promotion: { value: 'v2' } });
  });

  it('upsertDraft: a lower/stale revisionNumber does not overwrite', () => {
    upsertDraft(makeDraft({ revisionNumber: 2, terms: { promotion: { value: 'v2' } } as any }));
    upsertDraft(makeDraft({ revisionNumber: 1, terms: { promotion: { value: 'v1' } } as any }));
    expect(loadDraft('draft-1')?.terms).toEqual({ promotion: { value: 'v2' } });
  });

  it('recordApproval adds an approver without bumping revisionNumber', () => {
    upsertDraft(makeDraft({ revisionNumber: 3 }));
    const updated = recordApproval('draft-1', ALICE);
    expect(updated?.approvals.map((a) => a.toLowerCase())).toEqual([ALICE.toLowerCase()]);
    expect(updated?.revisionNumber).toBe(3);
  });

  it('recordApproval is idempotent for the same approver', () => {
    upsertDraft(makeDraft());
    recordApproval('draft-1', ALICE);
    const updated = recordApproval('draft-1', ALICE);
    expect(updated?.approvals).toHaveLength(1);
  });

  it('recordApproval returns null for an unknown draftId (proposal not yet upserted)', () => {
    expect(recordApproval('nope', ALICE)).toBeNull();
  });

  it('recordMint sets mintedContractAddress; isMinted becomes true (exact path)', () => {
    upsertDraft(makeDraft());
    const CONTRACT = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    recordMint('draft-1', CONTRACT);
    const draft = loadDraft('draft-1')!;
    expect(draft.mintedContractAddress).toBe(CONTRACT);
    expect(isMinted(draft, [])).toBe(true);
  });

  it('isMinted: fallback matches an on-chain summary by parties (either order) + event name', () => {
    const draft = makeDraft({ terms: { promotion: { value: 'Big Show' } } as any });
    const match = isMinted(draft, [{ party1Address: BOB, party2Address: ALICE, eventName: 'Big Show' }]);
    expect(match).toBe(true);
  });

  it('isMinted: fallback does not match a different event name', () => {
    const draft = makeDraft({ terms: { promotion: { value: 'Big Show' } } as any });
    const match = isMinted(draft, [{ party1Address: ALICE, party2Address: BOB, eventName: 'Other Show' }]);
    expect(match).toBe(false);
  });

  it('isMinted: false with no mint record, no matching summary, and no event name set', () => {
    const draft = makeDraft({ terms: {} });
    expect(isMinted(draft, [{ party1Address: ALICE, party2Address: BOB, eventName: 'anything' }])).toBe(false);
  });

  describe('resolveDraftForContract', () => {
    const MALLORY = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    const CONTRACT = '0xDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDdDd' as Address;

    it('a fresher poisoned draft (address-matches, parties do NOT match) placed before an older legitimate draft (address+parties match) — returns the legitimate draft', () => {
      const poisoned = makeDraft({
        draftId: 'poisoned',
        party1: ALICE,
        party2: MALLORY,
        mintedContractAddress: CONTRACT,
        lastActivityUnixMs: 2000, // fresher
      });
      const legitimate = makeDraft({
        draftId: 'legitimate',
        party1: ALICE,
        party2: BOB,
        mintedContractAddress: CONTRACT,
        lastActivityUnixMs: 1000, // older
      });
      // drafts passed pre-sorted newest-first, as listDrafts() would return
      const result = resolveDraftForContract([poisoned, legitimate], CONTRACT, ALICE, BOB);
      expect(result?.draftId).toBe('legitimate');
    });

    it('an older legitimate draft (address+parties match) placed before a fresher poisoned draft (address-matches, parties do NOT match) — still returns the legitimate draft', () => {
      const legitimate = makeDraft({
        draftId: 'legitimate',
        party1: ALICE,
        party2: BOB,
        mintedContractAddress: CONTRACT,
        lastActivityUnixMs: 1000, // older
      });
      const poisoned = makeDraft({
        draftId: 'poisoned',
        party1: ALICE,
        party2: MALLORY,
        mintedContractAddress: CONTRACT,
        lastActivityUnixMs: 2000, // fresher
      });
      // reverse ordering from the test above — legitimate first, poisoned second
      const result = resolveDraftForContract([legitimate, poisoned], CONTRACT, ALICE, BOB);
      expect(result?.draftId).toBe('legitimate');
    });

    it('only a poisoned (address-matches, parties-do-not-match) draft exists — returns null', () => {
      const poisoned = makeDraft({
        draftId: 'poisoned',
        party1: ALICE,
        party2: MALLORY,
        mintedContractAddress: CONTRACT,
      });
      const result = resolveDraftForContract([poisoned], CONTRACT, ALICE, BOB);
      expect(result).toBeNull();
    });

    it('a genuinely matching draft (address + parties both match) is returned', () => {
      const legitimate = makeDraft({
        draftId: 'legitimate',
        party1: BOB, // reversed order — should still match
        party2: ALICE,
        mintedContractAddress: CONTRACT,
      });
      const result = resolveDraftForContract([legitimate], CONTRACT, ALICE, BOB);
      expect(result?.draftId).toBe('legitimate');
    });
  });
});
