import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { SHOW_CONTRACT_ABI, XAO_TICKET_ABI } from '../lib/web3/eventcontract';
import {
  useUserContractsWithSummaries,
  formatContractDate,
  ContractSummary,
} from './useGetContracts';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Enum XAOTicket.TicketType: 0 COMP, 1 PRESALE, 2 GENERAL_ADMISSION, 3 VIP, 4 CUSTOM
const TICKET_TYPE_NAMES = ['Comp', 'Presale', 'General Admission', 'VIP', 'Custom'];

export interface UserTicket {
  id: string;
  title: string;
  image: string;
  profilePic: string;
  artist: string;
  tag: string;
  location: string;
  date: string;
  redeemed: boolean;
  views: number;
  likes: number;
  contractAddress: `0x${string}`;
  ticketCollection: `0x${string}`;
  tokenId: number;
  tierName: string;
}

// Per-collection descriptor: a ShowContract paired with its non-zero XAOTicket collection.
interface CollectionEntry {
  contract: ContractSummary;
  collection: `0x${string}`;
}

// One prospective ERC-1155 token id on a given collection.
interface TokenDescriptor {
  contract: ContractSummary;
  collection: `0x${string}`;
  tokenId: number;
}

// A token the connected wallet actually owns (balance > 0), with on-chain status.
interface OwnedToken extends TokenDescriptor {
  redeemed: boolean;
  tierId: number;
}

/**
 * Enumerate the connected wallet's real, on-chain tickets across all of its
 * ShowContracts. Fully on-chain — no localStorage, no mock data.
 *
 * The reads are dependent, so they are split into stages, each `useReadContracts`
 * gated with `enabled` on the previous stage's results:
 *   Stage 0: the user's ShowContracts + summaries (useUserContractsWithSummaries)
 *   Stage 1: ticketCollection(address) for each contract
 *   Stage 2: totalSold() for each non-zero collection
 *   Stage 3: balanceOf(user, tokenId) + scanned(tokenId) + tokenToTier(tokenId)
 *            for every tokenId in [0, totalSold) on each collection
 *   Stage 4: tiers(tierId) for each token the user owns (balance > 0)
 * The owned tokens are then mapped onto the shape the tickets feed renders.
 */
export const useUserTickets = (chainId?: number, address?: `0x${string}`) => {
  // Stage 0: the user's ShowContracts (with summaries).
  const { contracts, isLoading: contractsLoading } = useUserContractsWithSummaries(chainId, address);

  // Stage 1: read the ticketCollection address for each ShowContract.
  const collectionCalls = useMemo(
    () =>
      contracts.map((c) => ({
        address: c.contractAddress,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'ticketCollection' as const,
      })),
    [contracts]
  );

  const { data: collectionData, isLoading: collectionsLoading } = useReadContracts({
    contracts: collectionCalls,
    query: { enabled: collectionCalls.length > 0, refetchOnWindowFocus: false },
  });

  // Pair each contract with its collection, dropping zero-address (no tickets) collections.
  const collections = useMemo<CollectionEntry[]>(() => {
    if (!collectionData) return [];
    return contracts
      .map((contract, i) => {
        const r = collectionData[i];
        const collection = r?.status === 'success' ? (r.result as `0x${string}`) : (ZERO_ADDRESS as `0x${string}`);
        return { contract, collection };
      })
      .filter((e) => !!e.collection && e.collection.toLowerCase() !== ZERO_ADDRESS);
  }, [contracts, collectionData]);

  // Stage 2: read totalSold() for each non-zero collection.
  const totalSoldCalls = useMemo(
    () =>
      collections.map((e) => ({
        address: e.collection,
        abi: XAO_TICKET_ABI as any,
        functionName: 'totalSold' as const,
      })),
    [collections]
  );

  const { data: totalSoldData, isLoading: totalSoldLoading } = useReadContracts({
    contracts: totalSoldCalls,
    query: { enabled: totalSoldCalls.length > 0, refetchOnWindowFocus: false },
  });

  // Expand each collection into its sequential token ids [0, totalSold).
  const tokenDescriptors = useMemo<TokenDescriptor[]>(() => {
    if (!totalSoldData) return [];
    const list: TokenDescriptor[] = [];
    collections.forEach((e, i) => {
      const r = totalSoldData[i];
      const total = r?.status === 'success' ? Number(r.result as bigint) : 0;
      for (let tokenId = 0; tokenId < total; tokenId++) {
        list.push({ contract: e.contract, collection: e.collection, tokenId });
      }
    });
    return list;
  }, [collections, totalSoldData]);

  // Stage 3: for each token id, read balanceOf(user), scanned, tokenToTier (3 calls each).
  const tokenCalls = useMemo(() => {
    if (!address) return [];
    return tokenDescriptors.flatMap((d) => [
      {
        address: d.collection,
        abi: XAO_TICKET_ABI as any,
        functionName: 'balanceOf' as const,
        args: [address, BigInt(d.tokenId)] as const,
      },
      {
        address: d.collection,
        abi: XAO_TICKET_ABI as any,
        functionName: 'scanned' as const,
        args: [BigInt(d.tokenId)] as const,
      },
      {
        address: d.collection,
        abi: XAO_TICKET_ABI as any,
        functionName: 'tokenToTier' as const,
        args: [BigInt(d.tokenId)] as const,
      },
    ]);
  }, [tokenDescriptors, address]);

  const { data: tokenData, isLoading: tokenLoading } = useReadContracts({
    contracts: tokenCalls,
    query: { enabled: tokenCalls.length > 0 && !!address, refetchOnWindowFocus: false },
  });

  // Keep only tokens the user actually owns (balance > 0), with their status + tier.
  const ownedTokens = useMemo<OwnedToken[]>(() => {
    if (!tokenData) return [];
    return tokenDescriptors
      .map((d, i) => {
        const base = i * 3;
        const balResult = tokenData[base];
        const scannedResult = tokenData[base + 1];
        const tierResult = tokenData[base + 2];

        const balance = balResult?.status === 'success' ? (balResult.result as bigint) : BigInt(0);
        if (balance <= BigInt(0)) return null;

        const redeemed = scannedResult?.status === 'success' ? (scannedResult.result as boolean) : false;
        const tierId = tierResult?.status === 'success' ? Number(tierResult.result as bigint) : 0;
        return { ...d, redeemed, tierId } as OwnedToken;
      })
      .filter((o): o is OwnedToken => o !== null);
  }, [tokenDescriptors, tokenData]);

  // Stage 4: read the tier struct for each owned token (for artwork + display name).
  const tierCalls = useMemo(
    () =>
      ownedTokens.map((o) => ({
        address: o.collection,
        abi: XAO_TICKET_ABI as any,
        functionName: 'tiers' as const,
        args: [BigInt(o.tierId)] as const,
      })),
    [ownedTokens]
  );

  const { data: tierData, isLoading: tierLoading } = useReadContracts({
    contracts: tierCalls,
    query: { enabled: tierCalls.length > 0, refetchOnWindowFocus: false },
  });

  // Assemble the flat list of tickets in the shape the feed renders.
  const tickets = useMemo<UserTicket[]>(() => {
    return ownedTokens.map((o, i) => {
      const tierResult = tierData?.[i];
      const tier = tierResult?.status === 'success' ? (tierResult.result as any) : undefined;

      const ticketTypeEnum = tier ? Number(tier.ticketType ?? tier[0] ?? 0) : 0;
      const customName = tier ? (tier.customName ?? tier[1] ?? '') : '';
      const tierName =
        ticketTypeEnum === 4 ? customName || 'Custom' : TICKET_TYPE_NAMES[ticketTypeEnum] || 'Ticket';
      // Some XAOTicket deployments append a per-tier `image` (string) — read it if present.
      const tierImage = tier ? ((tier.image ?? tier[9] ?? '') as string) : '';

      const eventName = o.contract.eventName || 'Blockchain Event';
      const image = tierImage || o.contract.eventImageUri || '/xao-monster.png';

      return {
        id: `chain-${o.collection}-${o.tokenId}`,
        title: eventName,
        image,
        profilePic: '/xao-monster.png',
        artist: eventName ? String(eventName).split(' ')[0] : 'XAO',
        tag: 'Owned',
        location: o.contract.venueName || '',
        date: formatContractDate(o.contract.showDate),
        redeemed: o.redeemed,
        views: 0,
        likes: 0,
        contractAddress: o.contract.contractAddress,
        ticketCollection: o.collection,
        tokenId: o.tokenId,
        tierName,
      };
    });
  }, [ownedTokens, tierData]);

  const isLoading =
    contractsLoading || collectionsLoading || totalSoldLoading || tokenLoading || tierLoading;

  return { tickets, isLoading };
};
