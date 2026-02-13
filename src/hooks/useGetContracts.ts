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
    functionName: 'getAllContracts',
    query: {
      enabled: !!factoryAddress && factoryAddress !== '0x',
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
    },
  });

  return {
    contractAddresses: contractAddresses as `0x${string}`[] | undefined,
    isLoading,
    error,
    refetch,
  };
};

// Get contract summary for a single contract
export const useGetContractSummary = (contractAddress?: `0x${string}`) => {
  const { data, isLoading, error } = useReadContract({
    address: contractAddress,
    abi: EVENT_CONTRACT_ABI,
    functionName: 'getContractSummary',
    query: {
      enabled: !!contractAddress,
    },
  });

  const summary: ContractSummary | undefined = data ? {
    contractAddress: contractAddress!,
    party1Address: (data as any)[0],
    party2Address: (data as any)[1],
    eventName: (data as any)[2],
    venueName: (data as any)[3],
    showDate: (data as any)[4],
    status: Number((data as any)[5]),
    party1Signed: (data as any)[6],
    party2Signed: (data as any)[7],
  } : undefined;

  return {
    summary,
    isLoading,
    error,
  };
};

export const useGetContractSummaries = (contractAddresses?: `0x${string}`[]) => {

  const summaryContracts = contractAddresses?.map((address) => ({
    address,
    abi: EVENT_CONTRACT_ABI as any,
    functionName: 'getContractSummary' as const,
  })) || [];


  const imageContracts = contractAddresses?.map((address) => ({
    address,
    abi: EVENT_CONTRACT_ABI as any,
    functionName: 'eventImageUri' as const,
  })) || [];

  
  const allContracts = [...summaryContracts, ...imageContracts];

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: allContracts,
    query: {
      enabled: allContracts.length > 0,
    },
  });

  const summaries: ContractSummary[] = contractAddresses?.map((address, index) => {
    const summaryResult = data?.[index];
    const imageResult = data?.[contractAddresses.length + index];

    if (summaryResult?.status === 'success' && summaryResult.result) {
      const r = summaryResult.result as any;
      const summary: ContractSummary = {
        contractAddress: address,
        party1Address: r[0],
        party2Address: r[1],
        eventName: r[2],
        venueName: r[3],
        showDate: r[4],
        status: Number(r[5]),
        party1Signed: r[6],
        party2Signed: r[7],
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
