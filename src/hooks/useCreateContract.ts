import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES, CHAINS, TREASURY_ADDRESS, USDC_ADDRESS_TESTNET, USDC_ADDRESS_MAINNET } from "../lib/web3/chains";
import { SHOW_CONTRACT_FACTORY_ABI } from "../lib/web3/eventcontract";

// ─── ShowContract.PartyRole enum (matches Solidity) ──────────────────
export enum PartyRole {
  PROMOTER = 0,
  ARTIST = 1,
  VENUE = 2,
  BOOKING_AGENT = 3,
  PRODUCTION = 4,
  OTHER = 5,
}

// ─── Structs matching ShowContract.sol ────────────────────────────────

export interface PartyConfig {
  wallet: `0x${string}`;
  role: PartyRole;
  xaoUsername: string;
}

export interface DatesConfig {
  announcementDate: bigint;
  eventStartDate: bigint;
  eventEndDate: bigint;
  loadInTime: bigint;
  doorsTime: bigint;
  startTime: bigint;
  endTime: bigint;
  setTime: bigint;
  setLengthMinutes: bigint;
}

export interface LocationConfig {
  venueName: string;
  venueAddress: string;
  radiusMiles: bigint;
  radiusDays: bigint;
}

export interface TicketConfig {
  ticketsEnabled: boolean;
  totalCapacity: bigint;
  salesTaxBPS: bigint;
}

export interface FinancialConfig {
  guaranteeUSDC: bigint;
  guaranteePctBPS: bigint;
  backendBPS: bigint;
  barSplitBPS: bigint;
  merchSplitBPS: bigint;
}

export interface PromoConfig {
  eventName: string;
  flyerDNSLink: string;
  flyerCIDHash: `0x${string}`;
  riderIPFSCID: string;
  contractLegal: string;
  ticketLegal: string;
  contractCIDHash: `0x${string}`;
}

export interface CreateShowContractParams {
  party1Config: PartyConfig;
  party2Address: `0x${string}`;
  party2Role: PartyRole;
  dates: DatesConfig;
  location: LocationConfig;
  ticketConfig: TicketConfig;
  financialConfig: FinancialConfig;
  promoConfig: PromoConfig;
  chainId?: number;
}

// Keep old name as alias for imports that haven't been updated yet
export type CreateEventContractParams = CreateShowContractParams;

// ─── Zero bytes32 constant ───────────────────────────────────────────
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export const useCreateEventContract = (chainId?: number) => {
  const contractAddress =
    chainId && chainId in CONTRACT_ADDRESSES
      ? (CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
          ?.ShowContractFactory as `0x${string}`)
      : "0x";

  const usdcAddress = chainId === 8453 ? USDC_ADDRESS_MAINNET : USDC_ADDRESS_TESTNET;

  const { writeContract, isPending, error, data: hash } = useWriteContract();

  const {
    isLoading: isWaiting,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Extract created contract address from ShowContractCreated(address indexed contractAddr, address indexed party1, address indexed party2)
  const SHOW_CONTRACT_CREATED_TOPIC = '0xe98b066e0643e24d221c7699992e6e24aa6fe39887a4c2daf277e11a9b812406';
  const showCreatedLog = receipt?.logs?.find(
    (log) => log.topics[0] === SHOW_CONTRACT_CREATED_TOPIC
  );
  const createdContractAddress = showCreatedLog?.topics?.[1]
    ? (`0x${showCreatedLog.topics[1].slice(26)}` as `0x${string}`)
    : null;

  if (receipt && !createdContractAddress) {
    console.warn("[useCreateContract] Could not find ShowContractCreated event in logs:", receipt.logs);
  }

  const createEventContract = (params: CreateShowContractParams) => {
    // Prevent duplicate transactions
    if (isPending || isWaiting) {
      console.log("Transaction already in progress, skipping duplicate call");
      return;
    }

    console.log("=== CREATE SHOW CONTRACT DEBUG ===");
    console.log("Chain ID:", chainId);
    console.log("Factory Address:", contractAddress);
    console.log("USDC Address:", usdcAddress);
    console.log("Treasury Address:", TREASURY_ADDRESS);
    console.log("Params:", params);

    writeContract({
      address: contractAddress,
      abi: SHOW_CONTRACT_FACTORY_ABI,
      functionName: "create",
      chainId: chainId || CHAINS.baseSepolia.id,
      gas: BigInt(8_000_000),
      args: [
        // PartyConfig struct
        {
          wallet: params.party1Config.wallet,
          role: params.party1Config.role,
          xaoUsername: params.party1Config.xaoUsername,
        },
        // _p2Wallet
        params.party2Address,
        // _p2Role
        params.party2Role,
        // DatesConfig struct
        {
          announcementDate: params.dates.announcementDate,
          eventStartDate: params.dates.eventStartDate,
          eventEndDate: params.dates.eventEndDate,
          loadInTime: params.dates.loadInTime,
          doorsTime: params.dates.doorsTime,
          startTime: params.dates.startTime,
          endTime: params.dates.endTime,
          setTime: params.dates.setTime,
          setLengthMinutes: params.dates.setLengthMinutes,
        },
        // LocationConfig struct
        {
          venueName: params.location.venueName,
          venueAddress: params.location.venueAddress,
          radiusMiles: params.location.radiusMiles,
          radiusDays: params.location.radiusDays,
        },
        // TicketConfig struct
        {
          ticketsEnabled: params.ticketConfig.ticketsEnabled,
          totalCapacity: params.ticketConfig.totalCapacity,
          salesTaxBPS: params.ticketConfig.salesTaxBPS,
        },
        // FinancialConfig struct
        {
          guaranteeUSDC: params.financialConfig.guaranteeUSDC,
          guaranteePctBPS: params.financialConfig.guaranteePctBPS,
          backendBPS: params.financialConfig.backendBPS,
          barSplitBPS: params.financialConfig.barSplitBPS,
          merchSplitBPS: params.financialConfig.merchSplitBPS,
        },
        // PromoConfig struct
        {
          eventName: params.promoConfig.eventName,
          flyerDNSLink: params.promoConfig.flyerDNSLink,
          flyerCIDHash: params.promoConfig.flyerCIDHash || ZERO_BYTES32,
          riderIPFSCID: params.promoConfig.riderIPFSCID,
          contractLegal: params.promoConfig.contractLegal,
          ticketLegal: params.promoConfig.ticketLegal,
          contractCIDHash: params.promoConfig.contractCIDHash || ZERO_BYTES32,
        },
        // _usdc
        usdcAddress as `0x${string}`,
        // _treasury
        TREASURY_ADDRESS as `0x${string}`,
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
