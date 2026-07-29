// src/hooks/useResolveEventThread.ts
import { useMemo } from 'react';
import type { Address } from 'viem';
import { listDrafts, resolveDraftForContract } from '../lib/xaomsg/offchainContracts';

export type ResolvedEventThread =
  | { mode: 'draft'; draftId: string }
  | { mode: 'legacy'; showContract: Address };

/**
 * Given a minted contract's on-chain address, resolves which thread its
 * chat lives on.
 *
 * A contract minted after this feature shipped has its draftId recorded
 * locally against `mintedContractAddress` (populated either by the in-thread
 * SYSTEM "minted" message, or — for a device with no local negotiation
 * history — by replaying the mint notice published to this wallet's own
 * inbox at mint time; see sync.ts). That draft's own thread is used,
 * carrying real per-draft encryption and continuous pre+post-mint history.
 *
 * A contract with no such mapping (minted before this shipped, or a device
 * whose Waku store lookup missed the mint notice entirely — bounded by
 * store retention) falls back to the legacy address-keyed thread
 * (threadIdForShow / useXaoMsg).
 *
 * SECURITY: `mintedContractAddress` alone is NOT sufficient to trust a
 * local draft match. It is populated from an unauthenticated SYSTEM
 * `{draftId, contractAddress}` claim (applyDraftMessage / a mint-notice
 * replay) — anyone who can get a message into *some* draft's thread with
 * you (e.g. by starting their own throwaway draft with you) can claim any
 * real contract address as "minted" for that draft. `onChainParty1`/
 * `onChainParty2` — the contract's real on-chain parties, read from the
 * chain itself, not from anything Waku-transported — are the authoritative
 * source. Critically, the parties check gates CANDIDACY itself (inside
 * `resolveDraftForContract`), not just which candidate is preferred: a
 * draft is never even considered a match unless both its
 * `mintedContractAddress` AND its own party1/party2 (either order,
 * case-insensitive) agree with the real contract. An earlier version of
 * this check only filtered the address match, then verified parties
 * afterward and fell through to legacy mode on failure — since
 * `listDrafts()` is sorted by recent activity, an attacker's poisoned
 * throwaway draft (fresher activity, address matches, parties don't) could
 * shadow the victim's real, older, genuinely-matching draft, downgrading
 * the chat onto the legacy thread (whose key is derivable by anyone who
 * knows the public contract address). Gating candidacy on both conditions
 * together means a poisoned draft can never suppress a real match, no
 * matter its recency.
 */
export function useResolveEventThread(
  contractAddress: Address | null | undefined,
  onChainParty1?: string,
  onChainParty2?: string,
): ResolvedEventThread | null {
  return useMemo(() => {
    if (!contractAddress) return null;
    if (onChainParty1 && onChainParty2) {
      const match = resolveDraftForContract(listDrafts(), contractAddress, onChainParty1, onChainParty2);
      if (match) return { mode: 'draft', draftId: match.draftId };
    }
    return { mode: 'legacy', showContract: contractAddress };
  }, [contractAddress, onChainParty1, onChainParty2]);
}
