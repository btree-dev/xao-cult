// src/lib/xaomsg/draftSync.ts
import type { Address, Hex } from 'viem';
import { upsertDraft, recordApproval, recordMint } from './offchainContracts';
import {
  ContentType, type AcceptPayload, type ProposalPayload, type ResolvedMessage, type SystemPayload,
} from './types';

/** Mutable per-replay correlation from a PROPOSAL/COUNTER_PROPOSAL's own
 *  bodyHash to the draftId it carries, so a later ACCEPT (which only carries
 *  the proposalHash it approves) can be resolved to the right draft. Callers
 *  own one fresh Map per thread replay — mirrors useXaoDm's original
 *  per-hook-instance ref, just lifted out so a headless caller (sync.ts) can
 *  supply its own short-lived instance instead of a React ref. */
export type ProposalHashIndex = Map<Hex, string>;

/** Routes one resolved DM message into the off-chain draft store. Shared by
 *  useXaoDm's live onMessage handler and the headless sync in sync.ts, so a
 *  draft update is applied identically whether it arrives live or via
 *  backfill. Deliberately does not handle CONTACT_CARD — that stays in
 *  useXaoDm, which has access to ProfileCacheContext. */
export function applyDraftMessage(
  resolved: ResolvedMessage,
  myAddress: Address,
  peer: Address,
  proposalHashIndex: ProposalHashIndex,
): void {
  const { body, cert } = resolved.envelope;
  switch (body.contentType) {
    case ContentType.PROPOSAL:
    case ContentType.COUNTER_PROPOSAL: {
      const p = body.payload as ProposalPayload;
      const draftId = String((p.data as { draftId?: unknown }).draftId || '');
      if (!draftId) return;
      proposalHashIndex.set(resolved.bodyHash, draftId);
      const [party1, party2] = ([myAddress, peer] as Address[]).sort(
        (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
      ) as [Address, Address];
      upsertDraft({
        draftId, party1, party2, terms: p.data, revisionNumber: p.revisionNumber,
        approvals: [], lastActivityUnixMs: body.sentAt,
      });
      return;
    }
    case ContentType.ACCEPT: {
      const a = body.payload as AcceptPayload;
      const draftId = proposalHashIndex.get(a.proposalHash);
      if (draftId) recordApproval(draftId, cert.walletAddress);
      return;
    }
    case ContentType.SYSTEM: {
      const s = body.payload as SystemPayload;
      if (s.event === 'minted') recordMint(s.draftId, s.contractAddress);
      return;
    }
    default:
      return;
  }
}
