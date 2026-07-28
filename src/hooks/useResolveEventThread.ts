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
 */
export function useResolveEventThread(contractAddress: Address | null | undefined): ResolvedEventThread | null {
  return useMemo(() => {
    if (!contractAddress) return null;
    const lower = contractAddress.toLowerCase();
    const match = listDrafts().find((d) => d.mintedContractAddress?.toLowerCase() === lower);
    if (match) return { mode: 'draft', draftId: match.draftId };
    return { mode: 'legacy', showContract: contractAddress };
  }, [contractAddress]);
}
