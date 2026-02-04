import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { EVENT_CONTRACT_ABI } from '../lib/web3/eventcontract';

export const useSignEventContract = () => {
  const { writeContract, writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const signContractAsync = async (contractAddress: `0x${string}`, username: string) => {
    return writeContractAsync({
      address: contractAddress,
      abi: EVENT_CONTRACT_ABI,
      functionName: 'signContract',
      args: [username],
    });
  };
  return {
    signContractAsync,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
  };
};
