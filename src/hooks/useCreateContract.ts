import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CHAINS, CONTRACT_ADDRESSES } from "../lib/web3/chains";
import { EVENT_CONTRACT_FACTORY_ABI } from "../lib/web3/eventcontract";

export interface DatesAndTimes {
  announce: bigint;
  show: bigint;
  loadIn: bigint;
  doors: bigint;
  start: bigint;
  end: bigint;
  setTime: bigint;
  setLength: bigint;
}

export interface Location {
  venue: string;
  addr: string;
  radius: bigint;
  days1: bigint;
}

export interface TicketConfig {
  enabled: boolean;
  capacity: bigint;
  taxPct: bigint;
  typeCount: bigint;
}

export interface ResaleRules {
  p1Pct: bigint;
  p2Pct: bigint;
  rPct: bigint;
}

export interface PayInConfig {
  guarantee: bigint;
  guaPct: bigint;
  backPct: bigint;
  barPct: bigint;
  merchPct: bigint;
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
  chainId?: number;
}

export const useCreateEventContract = (chainId?: number) => {
  const contractAddress =
    chainId && chainId in CONTRACT_ADDRESSES
      ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
          ?.EventContractFactory as `0x${string}`)
      : "0x";

  const { writeContract, isPending, error, data: hash } = useWriteContract();

  const {
    isLoading: isWaiting,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const createdContractAddress = receipt?.logs?.[0]?.topics?.[1]
    ? (`0x${receipt.logs[0].topics[1].slice(26)}` as `0x${string}`)
    : null;

  const createEventContract = (params: CreateEventContractParams) => {
    // Prevent duplicate transactions
    if (isPending || isWaiting) {
      console.log("Transaction already in progress, skipping duplicate call");
      return;
    }

    console.log("=== CREATE CONTRACT DEBUG ===");
    console.log("Chain ID:", chainId);
    console.log("Contract Address:", contractAddress);
    console.log("Params:", params);
    writeContract({
      address: contractAddress,
      abi: EVENT_CONTRACT_FACTORY_ABI,
      functionName: "createEventContract",
      chainId: CHAINS.baseSepolia.id,
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
