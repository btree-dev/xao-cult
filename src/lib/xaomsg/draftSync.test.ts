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
        expiresAtUnixMs: Date.now() + 1000,
        chainId: 84532,
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
    applyDraftMessage(resolved, BOB, ALICE, index);
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
    applyDraftMessage(resolved, BOB, ALICE, index);
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
      BOB, ALICE, index,
    );
    const accept = makeResolved({
      contentType: ContentType.ACCEPT,
      payload: { kind: 'accept', proposalHash },
      sender: ALICE,
    });
    applyDraftMessage(accept, BOB, ALICE, index);
    expect(loadDraft('d1')?.approvals.map((a) => a.toLowerCase())).toEqual([ALICE.toLowerCase()]);
  });

  it('ACCEPT with an unknown proposalHash is a no-op', () => {
    const index: ProposalHashIndex = new Map();
    const accept = makeResolved({
      contentType: ContentType.ACCEPT,
      payload: { kind: 'accept', proposalHash: ('0x' + '99'.repeat(32)) as Hex },
      sender: ALICE,
    });
    expect(() => applyDraftMessage(accept, BOB, ALICE, index)).not.toThrow();
  });

  it('SYSTEM minted event records the mint on the draft', () => {
    const index: ProposalHashIndex = new Map();
    applyDraftMessage(
      makeResolved({ contentType: ContentType.PROPOSAL, payload: { kind: 'proposal', revisionNumber: 1, data: { draftId: 'd1' } }, sender: ALICE }),
      BOB, ALICE, index,
    );
    const CONTRACT = '0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc' as Address;
    const system = makeResolved({
      contentType: ContentType.SYSTEM,
      payload: { kind: 'system', event: 'minted', draftId: 'd1', contractAddress: CONTRACT },
      sender: ALICE,
    });
    applyDraftMessage(system, BOB, ALICE, index);
    expect(loadDraft('d1')?.mintedContractAddress).toBe(CONTRACT);
  });

  it('a PROPOSAL with no draftId in its payload is ignored', () => {
    const index: ProposalHashIndex = new Map();
    const resolved = makeResolved({
      contentType: ContentType.PROPOSAL,
      payload: { kind: 'proposal', revisionNumber: 1, data: {} },
      sender: ALICE,
    });
    expect(() => applyDraftMessage(resolved, BOB, ALICE, index)).not.toThrow();
    expect(index.size).toBe(0);
  });
});
