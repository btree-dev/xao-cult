import { describe, it, expect, beforeEach } from 'vitest';
import type { Address, Hex } from 'viem';
import { applyDraftMessage, type ProposalHashIndex } from './draftSync';
import { loadDraft } from './offchainContracts';
import { ContentType, type ResolvedMessage } from './types';

const ALICE = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as Address;
const BOB = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb' as Address;

function makeResolved(overrides: {
  contentType: ContentType;
  payload: unknown;
  sender: Address;
  sentAt?: number;
  bodyHash?: Hex;
}): ResolvedMessage {
  return {
    envelope: {
      body: {
        v: 1,
        messageId: ('0x' + '11'.repeat(32)) as Hex,
        threadId: ('0x' + '22'.repeat(32)) as Hex,
        contentType: overrides.contentType,
        parentHash: ('0x' + '00'.repeat(32)) as Hex,
        payload: overrides.payload as never,
        sentAt: overrides.sentAt ?? Date.now(),
        sender: overrides.sender,
      },
      payloadHash: ('0x' + '33'.repeat(32)) as Hex,
      signature: ('0x' + '44'.repeat(64)) as Hex,
      cert: {
        v: 1,
        walletAddress: overrides.sender,
        sessionPublicKeyHex: '0x02' + 'ab'.repeat(32),
        walletSignature: ('0x' + 'cd'.repeat(65)) as Hex,
      },
    },
    bodyHash: overrides.bodyHash ?? (('0x' + '55'.repeat(32)) as Hex),
    receivedAtUnixMs: Date.now(),
  };
}

describe('applyDraftMessage', () => {
  beforeEach(() => localStorage.clear());

  it('PROPOSAL upserts a draft keyed by the payload draftId', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1', promotion: { value: 'Show' } } },
      sender: ALICE,
    });
    applyDraftMessage(resolved, BOB, ALICE, index, 'd1');
    const draft = loadDraft('d1');
    expect(draft?.revisionNumber).toBe(1);
    expect([draft?.party1, draft?.party2].map((a) => a?.toLowerCase())).toEqual(
      [ALICE, BOB].map((a) => a.toLowerCase()).sort(),
    );
  });

  it('PROPOSAL records the bodyHash -> draftId mapping for later ACCEPT resolution', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } },
      sender: ALICE,
      bodyHash: ('0x' + '77'.repeat(32)) as Hex,
    });
    applyDraftMessage(resolved, BOB, ALICE, index, 'd1');
    expect(index.get(('0x' + '77'.repeat(32)) as Hex)).toBe('d1');
  });

  it('ACCEPT records an approval against the draft its proposalHash maps to', () => {
    const index: ProposalHashIndex = new Map();
    const proposalHash = ('0x' + '77'.repeat(32)) as Hex;
    // Seed the draft via a real PROPOSAL first, using `proposalHash` as its
    // own bodyHash — this is what populates the index entry ACCEPT resolves.
    applyDraftMessage(
      makeResolved({
        contentType: ContentType.PROPOSAL,
        payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } },
        sender: ALICE,
        bodyHash: proposalHash,
      }),
      BOB, ALICE, index, 'd1',
    );
    const accept = makeResolved({
      contentType: ContentType.ACCEPT,
      payload: { kind: 'accept', proposalHash },
      sender: ALICE,
    });
    applyDraftMessage(accept, BOB, ALICE, index, 'd1');
    expect(loadDraft('d1')?.approvals.map((a) => a.toLowerCase())).toEqual([ALICE.toLowerCase()]);
  });

  it('ACCEPT with an unknown proposalHash is a no-op', () => {
    const index: ProposalHashIndex = new Map();
    const accept = makeResolved({
      contentType: ContentType.ACCEPT,
      payload: { kind: 'accept', proposalHash: ('0x' + '99'.repeat(32)) as Hex },
      sender: ALICE,
    });
    expect(() => applyDraftMessage(accept, BOB, ALICE, index, 'd1')).not.toThrow();
  });

  it('SYSTEM minted event records the mint on the draft', () => {
    const index: ProposalHashIndex = new Map();
    applyDraftMessage(
      makeResolved({ contentType: ContentType.PROPOSAL, payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } }, sender: ALICE }),
      BOB, ALICE, index, 'd1',
    );
    const CONTRACT = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    const system = makeResolved({
      contentType: ContentType.SYSTEM,
      payload: { kind: 'system', event: 'minted', draftId: 'd1', contractAddress: CONTRACT },
      sender: ALICE,
    });
    applyDraftMessage(system, BOB, ALICE, index, 'd1');
    expect(loadDraft('d1')?.mintedContractAddress).toBe(CONTRACT);
  });

  it('a PROPOSAL with no draftId in its payload is ignored', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: {} },
      sender: ALICE,
    });
    expect(() => applyDraftMessage(resolved, BOB, ALICE, index, 'd1')).not.toThrow();
    expect(index.size).toBe(0);
  });

  // ---- Fix 1 (defense-in-depth): a message's own claimed draftId must
  // match the thread it actually arrived on ----

  it('a PROPOSAL claiming a draftId different from the thread it arrived on is dropped', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1', promotion: { value: 'Attacker draft' } } },
      sender: ALICE,
      bodyHash: ('0x' + '88'.repeat(32)) as Hex,
    });
    // This message arrived on the thread for 'd2', not 'd1'.
    applyDraftMessage(resolved, BOB, ALICE, index, 'd2');
    expect(loadDraft('d1')).toBeNull();
    expect(index.size).toBe(0);
  });

  it('a COUNTER_PROPOSAL claiming a mismatched draftId is dropped without regressing an existing draft', () => {
    const index: ProposalHashIndex = new Map();
    // A legitimate 'd1' proposal already applied on 'd1's own thread.
    applyDraftMessage(
      makeResolved({ contentType: ContentType.PROPOSAL, payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } }, sender: ALICE }),
      BOB, ALICE, index, 'd1',
    );
    // A message arriving on 'd1's thread but claiming to be for 'd2' — dropped.
    const forged = makeResolved({
      contentType: ContentType.COUNTER_PROPOSAL,
      payload: { kind: 'counter-proposal', revisionNumber: 99, data: { draftId: 'd2' } },
      sender: BOB,
    });
    applyDraftMessage(forged, BOB, ALICE, index, 'd1');
    expect(loadDraft('d1')?.revisionNumber).toBe(1);
    expect(loadDraft('d2')).toBeNull();
  });

  it('a SYSTEM minted event claiming a draftId different from the thread it arrived on is dropped', () => {
    const index: ProposalHashIndex = new Map();
    applyDraftMessage(
      makeResolved({ contentType: ContentType.PROPOSAL, payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } }, sender: ALICE }),
      BOB, ALICE, index, 'd1',
    );
    // d2 already exists locally too (e.g. a separate real draft with the same
    // pair), so recordMint('d2', ...) would succeed if the check were
    // missing — this is what makes the assertion below actually meaningful
    // rather than trivially true because recordMint no-ops on an unknown id.
    applyDraftMessage(
      makeResolved({ contentType: ContentType.PROPOSAL, payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd2' } }, sender: ALICE }),
      BOB, ALICE, index, 'd2',
    );
    const CONTRACT = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    // Arrives on d1's own thread (expectedDraftId: 'd1') but claims to mint d2.
    const system = makeResolved({
      contentType: ContentType.SYSTEM,
      payload: { kind: 'system', event: 'minted', draftId: 'd2', contractAddress: CONTRACT },
      sender: ALICE,
    });
    applyDraftMessage(system, BOB, ALICE, index, 'd1');
    expect(loadDraft('d1')?.mintedContractAddress).toBeUndefined();
    expect(loadDraft('d2')?.mintedContractAddress).toBeUndefined();
  });
});
