import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { EVENT_CONTRACT_ABI } from '../lib/web3/eventcontract';

export interface AddTicketTypeParams {
  ticketTypeName: string;
  onSaleDate: bigint;
  numberOfTickets: bigint;
  ticketPrice: bigint;
}

export const dateTimeToTimestamp = (dateTimeString: string): bigint => {
  if (!dateTimeString) return BigInt(0);
  const date = new Date(dateTimeString);
  return BigInt(Math.floor(date.getTime() / 1000));
};

export const dollarToWei = (dollarString: string): bigint => {
  if (!dollarString) return BigInt(0);
  const cleaned = dollarString.replace(/,/g, '');
  const value = parseFloat(cleaned) || 0;
  return BigInt(Math.floor(value * 1e18));
};

export const parseFormattedNumber = (value: string): bigint => {
  if (!value) return BigInt(0);
  const cleaned = value.replace(/,/g, '');
  return BigInt(parseInt(cleaned) || 0);
};

export const useAddTicketType = () => {
  const { writeContract, writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const addTicketTypeAsync = async (contractAddress: `0x${string}`, params: AddTicketTypeParams) => {
    return writeContractAsync({
      address: contractAddress,
      abi: EVENT_CONTRACT_ABI,
      functionName: 'addTicketType',
      args: [
        params.ticketTypeName,
        params.onSaleDate,
        params.numberOfTickets,
        params.ticketPrice,
      ],
    });
  };

  return {
    addTicketTypeAsync,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
  };
};
