// src/hooks/useResolveEventThread.ts
import { useMemo } from 'react';
import type { Address } from 'viem';
import { listDrafts } from '../lib/xaomsg/offchainContracts';

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
 * real contract address as "minted" for that draft. Without a further
 * check, that draft's thread/key would silently be used to show a real
 * contract's chat, handing your side of that conversation to whoever
 * controls the attacker's draft. `onChainParty1`/`onChainParty2` — the
 * contract's real on-chain parties, read from the chain itself, not from
 * anything Waku-transported — are the authoritative source; a local match
 * is only trusted when the draft's own party1/party2 agree with them
 * (either order, case-insensitive). A draft between you and an unrelated
 * third party can never satisfy this check against a real contract you
 * hold with someone else.
 */
export function useResolveEventThread(
  contractAddress: Address | null | undefined,
  onChainParty1?: string,
  onChainParty2?: string,
): ResolvedEventThread | null {
  return useMemo(() => {
    if (!contractAddress) return null;
    const lower = contractAddress.toLowerCase();
    const match = listDrafts().find((d) => d.mintedContractAddress?.toLowerCase() === lower);
    if (match && onChainParty1 && onChainParty2) {
      const dp1 = match.party1.toLowerCase();
      const dp2 = match.party2.toLowerCase();
      const cp1 = onChainParty1.toLowerCase();
      const cp2 = onChainParty2.toLowerCase();
      const partiesMatch = (dp1 === cp1 && dp2 === cp2) || (dp1 === cp2 && dp2 === cp1);
      if (partiesMatch) return { mode: 'draft', draftId: match.draftId };
    }
    return { mode: 'legacy', showContract: contractAddress };
  }, [contractAddress, onChainParty1, onChainParty2]);
}
