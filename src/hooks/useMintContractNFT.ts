import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../lib/web3/chains';
import { CONTRACT_NFT_ABI } from '../lib/web3/contracts';

export const useMintContractNFT = (chainId?: number) => {
  const contractAddress = chainId && chainId in CONTRACT_ADDRESSES
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.ContractNFT as `0x${string}`)
    : '0x';

  const { writeContract, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const mintNFT = (party1: string, party2: string, terms: string) => {
    writeContract({
      address: contractAddress,
      abi: CONTRACT_NFT_ABI,
      functionName: 'mintContractNFT',
      args: [party1, party2, terms],
    });
  };

  return {
    mintNFT,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
  };
};
