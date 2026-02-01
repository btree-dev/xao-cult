import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../lib/web3/chains';
import { EVENT_CONTRACT_FACTORY_ABI } from '../lib/web3/eventcontract';

export interface DatesAndTimes {
  eventAnnouncement: bigint;
  showDate: bigint;
  loadIn: bigint;
  doors: bigint;
  startTime: bigint;
  endTime: bigint;
  setTime: bigint;
  setLength: bigint;
}

export interface Location {
  venueName: string;
  physicalAddress: string;
  radiusMiles: bigint;
  radiusDays: bigint;
}

export interface TicketConfig {
  ticketsEnabled: boolean;
  totalCapacity: bigint;
  salesTaxPercentage: bigint;
  ticketTypeCount: bigint;
}

export interface ResaleRules {
  party1Percentage: bigint;
  party2Percentage: bigint;
  resellerPercentage: bigint;
}

export interface PayInConfig {
  guaranteeAmount: bigint;
  guaranteePercentage: bigint;
  backendPercentage: bigint;
  barSplitPercentage: bigint;
  merchSplitPercentage: bigint;
}

export interface CreateEventContractParams {
  party1Username: string;
  party2Address: `0x${string}`;
  dates: DatesAndTimes;
  location: Location;
  ticketConfig: TicketConfig;
  resaleRules: ResaleRules;
  payIn: PayInConfig;
  eventName: string;
  eventImageUri: string;
  genres: string[];
  rider: string;
  contractLegalLanguage: string;
  ticketLegalLanguage: string;
}

export const useCreateEventContract = (chainId?: number) => {
  const contractAddress = chainId && chainId in CONTRACT_ADDRESSES
    ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.EventContractFactory as `0x${string}`)
    : '0x';

  const { writeContract, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  // Extract created contract address from ContractCreated event logs
  const createdContractAddress = receipt?.logs?.[0]?.topics?.[1]
    ? (`0x${receipt.logs[0].topics[1].slice(26)}` as `0x${string}`)
    : null;

  const createEventContract = (params: CreateEventContractParams) => {
    writeContract({
      address: contractAddress,
      abi: EVENT_CONTRACT_FACTORY_ABI,
      functionName: 'createEventContract',
      args: [
        params.party1Username,
        params.party2Address,
        params.dates,
        params.location,
        params.ticketConfig,
        params.resaleRules,
        params.payIn,
        params.eventName,
        params.eventImageUri,
        params.genres,
        params.rider,
        params.contractLegalLanguage,
        params.ticketLegalLanguage,
      ],
    });
  };

  return {
    createEventContract,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
    contractAddress: createdContractAddress,
  };
};
