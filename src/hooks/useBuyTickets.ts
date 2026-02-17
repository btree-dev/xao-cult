import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { EVENT_CONTRACT_ABI } from '../lib/web3/eventcontract';
import { parseEther } from 'viem';

export const useBuyTickets = () => {
  const { writeContract, writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buyTickets = async (
    contractAddress: `0x${string}`,
    typeId: number,
    quantity: number,
    totalPrice: string // in ETH/USDC
  ) => {
    console.log('=== BUY TICKETS DEBUG ===');
    console.log('Contract Address:', contractAddress);
    console.log('Type ID:', typeId);
    console.log('Quantity:', quantity);
    console.log('Total Price (ETH):', totalPrice);

    return writeContractAsync({
      address: contractAddress,
      abi: EVENT_CONTRACT_ABI,
      functionName: 'buyTickets',
      args: [BigInt(typeId), BigInt(quantity)],
      value: parseEther(totalPrice), // Send ETH/USDC with the transaction
    });
  };

  return {
    buyTickets,
    isPending,
    isWaiting,
    isSuccess,
    error,
    hash,
  };
};
