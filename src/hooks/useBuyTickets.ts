import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { EVENT_CONTRACT_ABI } from '../lib/web3/eventcontract';

export const useBuyTickets = () => {
  const { writeContract, writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buyTickets = async (
    contractAddress: `0x${string}`,
    typeId: number,
    quantity: number,
    totalWei: bigint // exact wei amount from on-chain price
  ) => {
    console.log('=== BUY TICKETS DEBUG ===');
    console.log('Contract Address:', contractAddress);
    console.log('Type ID:', typeId);
    console.log('Quantity:', quantity);
    console.log('Total Price (wei):', totalWei.toString());

    return writeContractAsync({
      address: contractAddress,
      abi: EVENT_CONTRACT_ABI,
      functionName: 'buyTickets',
      args: [BigInt(typeId), BigInt(quantity)],
      value: totalWei,
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
