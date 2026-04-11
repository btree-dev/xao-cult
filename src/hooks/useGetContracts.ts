import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../lib/web3/chains';
import { EVENT_CONTRACT_FACTORY_ABI, EVENT_CONTRACT_ABI } from '../lib/web3/eventcontract';

export interface ContractSummary {
  contractAddress: `0x${string}`;
  party1Address: string;
  party2Address: string;
  eventName: string;
  venueName: string;
  showDate: bigint;
  endDate: bigint;
  status: number;
  party1Signed: boolean;
  party2Signed: boolean;
  eventImageUri?: string;
}

// ShowContract status enum: DRAFT, PROPOSED, COUNTER_PROPOSED, APPROVED, ACTIVE, COMPLETED, CANCELLED, DISPUTED
export const CONTRACT_STATUS_LABELS = ['Draft', 'Proposed', 'Counter-Proposed', 'Approved', 'Active', 'Completed', 'Cancelled', 'Disputed'];


export const useGetAllContracts = (chainId?: number) => {
  const factoryAddress = chainId && chainId in CONTRACT_ADDRESSES
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.ShowContractFactory as `0x${string}`)
    : undefined;

  const { data: count, isLoading: countLoading } = useReadContract({
    address: factoryAddress,
    abi: EVENT_CONTRACT_FACTORY_ABI,
    functionName: 'getContractCount',
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x',
      refetchOnWindowFocus: false,
    },
  });

  // Read individual contract addresses from allContracts(uint256) array
  const contractCount = count ? Number(count) : 0;
  const contracts = Array.from({ length: contractCount }, (_, i) => ({
    address: factoryAddress!,
    abi: EVENT_CONTRACT_FACTORY_ABI,
    functionName: 'allContracts' as const,
    args: [BigInt(i)] as const,
  }));

  const { data: addressResults, isLoading: addressesLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: contractCount > 0,
      refetchOnWindowFocus: false,
    },
  });

  const contractAddresses = addressResults
    ?.filter((r: any) => r.status === 'success')
    .map((r: any) => r.result as `0x${string}`);

  return {
    contractAddresses,
    isLoading: countLoading || addressesLoading,
    error,
    refetch,
  };
};


export const useGetUserContracts = (chainId?: number, userAddress?: `0x${string}`) => {
  const factoryAddress = chainId && chainId in CONTRACT_ADDRESSES
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.ShowContractFactory as `0x${string}`)
    : undefined;

  const { data: contractAddresses, isLoading, error, refetch } = useReadContract({
    address: factoryAddress,
    abi: EVENT_CONTRACT_FACTORY_ABI,
    functionName: 'getUserContracts',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x' && !!userAddress,
      refetchOnWindowFocus: false,
    },
  });

  return {
    contractAddresses: contractAddresses as `0x${string}`[] | undefined,
    isLoading,
    error,
    refetch,
  };
};

// Get contract summary for a single contract - using individual field reads
export const useGetContractSummary = (contractAddress?: `0x${string}`) => {
  // This function is deprecated - use useGetContractSummaries instead
  // which fetches multiple fields in parallel
  return {
    summary: undefined,
    isLoading: false,
    error: null,
  };
};

export const useGetContractSummaries = (contractAddresses?: `0x${string}`[]) => {
  // ShowContract exposes individual public fields, not struct getters
  // Fields per contract: party1, party2, eventName, venueName, eventStartDate, eventEndDate, flyerDNSLink, status, isFinalized
  const FIELDS_PER_CONTRACT = 9;

  const contracts = contractAddresses?.flatMap((address) => [
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'party1' },       // 0: Party struct {wallet, role, xaoUsername}
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'party2' },       // 1: Party struct
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventName' },    // 2: string
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'venueName' },    // 3: string
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventStartDate' }, // 4: uint256
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventEndDate' },   // 5: uint256
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'flyerDNSLink' },   // 6: string (image URI)
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'status' },         // 7: uint8 enum
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'isFinalized' },    // 8: bool
  ]) || [];

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchOnWindowFocus: false,
    },
  });

  const summaries: ContractSummary[] = contractAddresses?.map((address, index) => {
    const base = index * FIELDS_PER_CONTRACT;
    const party1Result = data?.[base];
    const party2Result = data?.[base + 1];
    const nameResult = data?.[base + 2];
    const venueResult = data?.[base + 3];
    const startDateResult = data?.[base + 4];
    const endDateResult = data?.[base + 5];
    const imageResult = data?.[base + 6];
    const statusResult = data?.[base + 7];
    const finalizedResult = data?.[base + 8];

    if (party1Result?.status === 'success' && party2Result?.status === 'success') {
      const party1 = party1Result.result as any;
      const party2 = party2Result.result as any;
      const isFinalized = finalizedResult?.status === 'success' ? (finalizedResult.result as boolean) : false;

      const summary: ContractSummary = {
        contractAddress: address,
        party1Address: party1.wallet || party1[0],
        party2Address: party2.wallet || party2[0],
        eventName: nameResult?.status === 'success' ? (nameResult.result as string) : 'Untitled',
        venueName: venueResult?.status === 'success' ? (venueResult.result as string) : 'No venue',
        showDate: startDateResult?.status === 'success' ? (startDateResult.result as bigint) : BigInt(0),
        endDate: endDateResult?.status === 'success' ? (endDateResult.result as bigint) : BigInt(0),
        status: statusResult?.status === 'success' ? Number(statusResult.result) : 0,
        // ShowContract uses isFinalized instead of individual p1/p2 signed booleans
        party1Signed: isFinalized,
        party2Signed: isFinalized,
        eventImageUri: imageResult?.status === 'success' ? (imageResult.result as string) : undefined,
      };
      return summary;
    }
    return null;
  }).filter((s): s is ContractSummary => s !== null) || [];

  return {
    summaries,
    isLoading,
    error,
    refetch,
  };
};


export const useUserContractsWithSummaries = (chainId?: number, userAddress?: `0x${string}`) => {
  const { contractAddresses, isLoading: addressesLoading, error: addressesError, refetch: refetchAddresses } = useGetUserContracts(chainId, userAddress);
  const { summaries, isLoading: summariesLoading, error: summariesError, refetch: refetchSummaries } = useGetContractSummaries(contractAddresses);

  const refetch = async () => {
    await refetchAddresses();
    await refetchSummaries();
  };

  return {
    contracts: summaries,
    isLoading: addressesLoading || summariesLoading,
    error: addressesError || summariesError,
    refetch,
  };
};


export const useAllContractsWithSummaries = (chainId?: number) => {
  const { contractAddresses, isLoading: addressesLoading, error: addressesError, refetch: refetchAddresses } = useGetAllContracts(chainId);
  const { summaries, isLoading: summariesLoading, error: summariesError, refetch: refetchSummaries } = useGetContractSummaries(contractAddresses);

  const refetch = async () => {
    await refetchAddresses();
    await refetchSummaries();
  };

  return {
    contracts: summaries,
    isLoading: addressesLoading || summariesLoading,
    error: addressesError || summariesError,
    refetch,
  };
};


export const formatContractDate = (timestamp: bigint | number | undefined): string => {

  if (!timestamp) return 'TBD';


  const timestampNum = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;

 
  if (timestampNum === 0 || isNaN(timestampNum)) return 'TBD';


  const date = new Date(timestampNum * 1000);

 
  if (isNaN(date.getTime())) return 'TBD';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
