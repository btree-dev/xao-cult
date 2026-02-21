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

export const CONTRACT_STATUS_LABELS = ['Draft', 'Pending', 'Signed', 'Cancelled', 'Completed'];


export const useGetAllContracts = (chainId?: number) => {
  const factoryAddress = chainId && chainId in CONTRACT_ADDRESSES
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.EventContractFactory as `0x${string}`)
    : undefined;

  const { data: contractAddresses, isLoading, error, refetch } = useReadContract({
    address: factoryAddress,
    abi: EVENT_CONTRACT_FACTORY_ABI,
    functionName: 'getContracts',
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x',
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


export const useGetUserContracts = (chainId?: number, userAddress?: `0x${string}`) => {
  const factoryAddress = chainId && chainId in CONTRACT_ADDRESSES
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.EventContractFactory as `0x${string}`)
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
  // Build contracts array to fetch all needed fields in parallel
  const contracts = contractAddresses?.flatMap((address) => [
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'party1' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'party2' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'name' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'location' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'dates' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'imageUri' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'status' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'p1Signed' as const },
    { address, abi: EVENT_CONTRACT_ABI as any, functionName: 'p2Signed' as const },
  ]) || [];

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchOnWindowFocus: false,
    },
  });

  const summaries: ContractSummary[] = contractAddresses?.map((address, index) => {
    const baseIndex = index * 9; // 9 fields per contract
    const party1Result = data?.[baseIndex];
    const party2Result = data?.[baseIndex + 1];
    const nameResult = data?.[baseIndex + 2];
    const locationResult = data?.[baseIndex + 3];
    const datesResult = data?.[baseIndex + 4];
    const imageResult = data?.[baseIndex + 5];
    const statusResult = data?.[baseIndex + 6];
    const p1SignedResult = data?.[baseIndex + 7];
    const p2SignedResult = data?.[baseIndex + 8];

    if (party1Result?.status === 'success' && party2Result?.status === 'success') {
      const party1 = party1Result.result as any;
      const party2 = party2Result.result as any;
      const location = locationResult?.status === 'success' ? (locationResult.result as any) : null;
      const dates = datesResult?.status === 'success' ? (datesResult.result as any) : null;

      const summary: ContractSummary = {
        contractAddress: address,
        party1Address: party1.addr || party1[0],
        party2Address: party2.addr || party2[0],
        eventName: nameResult?.status === 'success' ? (nameResult.result as string) : 'Untitled',
        venueName: location ? (location.venue || location[0]) : 'No venue',
        showDate: dates ? (dates.show || dates[1]) : BigInt(0),
        endDate: dates ? (dates.end || dates[5]) : BigInt(0),
        status: statusResult?.status === 'success' ? Number(statusResult.result) : 0,
        party1Signed: p1SignedResult?.status === 'success' ? (p1SignedResult.result as boolean) : false,
        party2Signed: p2SignedResult?.status === 'success' ? (p2SignedResult.result as boolean) : false,
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
