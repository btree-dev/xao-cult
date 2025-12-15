import { useContractRead } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../lib/web3/chains';
import { CONTRACT_NFT_ABI } from '../lib/web3/contracts';

export const useGetUserNFTs = (userAddress?: string, chainId?: number) => {
  const contractAddress = chainId
    ? (CONTRACT_ADDRESSES[chainId]?.ContractNFT as `0x${string}`)
    : '0x';

  const { data, isLoading, error } = useContractRead({
    address: contractAddress,
    abi: CONTRACT_NFT_ABI,
    functionName: 'getUserNFTs',
    args: [userAddress as `0x${string}`],
    enabled: !!userAddress && !!contractAddress,
  });

  return {
    tokenIds: (data as bigint[]) || [],
    isLoading,
    error,
  };
};

export const useGetContractData = (tokenId?: bigint, chainId?: number) => {
  const contractAddress = chainId
    ? (CONTRACT_ADDRESSES[chainId]?.ContractNFT as `0x${string}`)
    : '0x';

  const { data, isLoading, error } = useContractRead({
    address: contractAddress,
    abi: CONTRACT_NFT_ABI,
    functionName: 'getContractData',
    args: [tokenId as bigint],
    enabled: !!tokenId && !!contractAddress,
  });

  return {
    contractData: data as {
      party1: string;
      party2: string;
      terms: string;
      createdAt: bigint;
      isSigned: boolean;
    } | undefined,
    isLoading,
    error,
  };
};
