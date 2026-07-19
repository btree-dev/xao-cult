import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { listDrafts, isMinted, type OffchainContractDraft } from '../lib/xaomsg/offchainContracts';
import type { ContractSummary } from './useGetContracts';

export interface UseOffchainContractsResult {
  drafts: OffchainContractDraft[];
}

/** Re-reads the localStorage draft store whenever the connected wallet or the
 *  on-chain summaries change. Does not subscribe to live Waku updates itself
 *  — Negotiation is not a persistent DM subscriber; a draft appears here once
 *  its owning `useXaoDm` thread (wherever it's mounted) has written it. This
 *  matches the plan's locked "plumbing + minimal UI, no polish" scope. */
export function useOffchainContracts(onChainSummaries: ContractSummary[]): UseOffchainContractsResult {
  const { address } = useAccount();
  const [drafts, setDrafts] = useState<OffchainContractDraft[]>([]);

  useEffect(() => {
    if (!address) { setDrafts([]); return; }
    const myAddr = address.toLowerCase();
    const mine = listDrafts().filter(
      (d) => d.party1.toLowerCase() === myAddr || d.party2.toLowerCase() === myAddr,
    );
    setDrafts(mine.filter((d) => !isMinted(d, onChainSummaries)));
  }, [address, onChainSummaries]);

  return { drafts };
}
