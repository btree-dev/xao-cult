import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { listDrafts, isMinted, type OffchainContractDraft } from '../lib/xaomsg/offchainContracts';
import type { ContractSummary } from './useGetContracts';

export interface UseOffchainContractsResult {
  drafts: OffchainContractDraft[];
  /** Force a re-read of the localStorage draft store — call after a background
   *  inbox sync (syncAllKnownThreads) writes new drafts, so they appear without
   *  a navigation. */
  reload: () => void;
}

// `useAllContractsWithSummaries`'s `contracts` array is rebuilt (new array,
// new objects) on every render, even when the underlying on-chain data is
// unchanged — it isn't memoized. Depending on that array by reference in an
// effect re-fires the effect every render, which calls setDrafts, which
// re-renders, which rebuilds the array again: an infinite loop (observed
// live as "Maximum update depth exceeded" on the Negotiation page). Deriving
// a content-based key and depending on the key (a stable primitive) instead
// of the array itself breaks the loop without touching the shared hook.
function summariesKey(summaries: ContractSummary[]): string {
  return summaries
    .map((s) => `${s.contractAddress}:${s.party1Address}:${s.party2Address}:${s.eventName}`)
    .join('|');
}

/** Re-reads the localStorage draft store whenever the connected wallet or the
 *  on-chain summaries change. Does not subscribe to live Waku updates itself
 *  — Negotiation is not a persistent DM subscriber; a draft appears here once
 *  its owning `useXaoDm` thread (wherever it's mounted) has written it. This
 *  matches the plan's locked "plumbing + minimal UI, no polish" scope. */
export function useOffchainContracts(onChainSummaries: ContractSummary[]): UseOffchainContractsResult {
  const { address } = useAccount();
  const [drafts, setDrafts] = useState<OffchainContractDraft[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const key = summariesKey(onChainSummaries);

  useEffect(() => {
    if (!address) { setDrafts([]); return; }
    const myAddr = address.toLowerCase();
    const mine = listDrafts().filter(
      (d) => d.party1.toLowerCase() === myAddr || d.party2.toLowerCase() === myAddr,
    );
    setDrafts(mine.filter((d) => !isMinted(d, onChainSummaries)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, key, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  return { drafts, reload };
}
