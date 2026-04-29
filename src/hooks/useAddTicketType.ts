import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { XAO_TICKET_ABI, SHOW_CONTRACT_ABI } from '../lib/web3/eventcontract';

export interface AddTicketTypeParams {
  ticketTypeName: string;
  onSaleDate: bigint;
  numberOfTickets: bigint;
  ticketPrice: bigint;   // USDC amount (6 decimals)
  isFree: boolean;
}

export const dateTimeToTimestamp = (dateTimeString: string): bigint => {
  if (!dateTimeString) return BigInt(0);
  const date = new Date(dateTimeString);
  return BigInt(Math.floor(date.getTime() / 1000));
};

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

export const dollarToWei = (dollarString: string): bigint => {
  if (!dollarString) return BigInt(0);
  const cleaned = dollarString.replace(/,/g, '');
  const dollars = parseFloat(cleaned) || 0;
  return BigInt(Math.floor(dollars * 10 ** USDC_DECIMALS));
};

export const weiToDollar = (usdc: bigint): number => {
  return Number(usdc) / 10 ** USDC_DECIMALS;
};

// Keep old ETH_PRICE_USD export for backward compat
export const ETH_PRICE_USD = 2000;

export const parseFormattedNumber = (value: string): bigint => {
  if (!value) return BigInt(0);
  const cleaned = value.replace(/,/g, '');
  return BigInt(parseInt(cleaned) || 0);
};

// XAOTicket TicketType enum: COMP=0, PRESALE=1, GENERAL_ADMISSION=2, VIP=3, CUSTOM=4
const ticketTypeNameToEnum = (name: string): number => {
  const lower = name.toLowerCase().trim();
  if (lower === 'comp' || lower === 'complimentary') return 0;
  if (lower === 'presale' || lower === 'pre-sale') return 1;
  if (lower === 'general admission' || lower === 'ga') return 2;
  if (lower === 'vip') return 3;
  return 4; // CUSTOM
};

/**
 * Hook to add ticket tiers to XAOTicket contract.
 * Must be called by party1 (admin) after contract is finalized (both parties signed).
 */
export const useAddTicketType = () => {
  const { writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Add a ticket tier to XAOTicket.
   * @param showContractAddress - The ShowContract address (used to read ticketCollection)
   * @param params - Ticket tier parameters
   */
  const addTicketTypeAsync = async (
    showContractAddress: `0x${string}`,
    params: AddTicketTypeParams
  ) => {
    console.log("[addTicketType] Adding tier to XAOTicket");
    console.log("ShowContract:", showContractAddress);
    console.log("Params:", params);

    // For now, we skip auto-adding tiers during contract creation.
    // Tiers should be added via the contract detail page after finalization.
    // This is because XAOTicket is only deployed when both parties sign.
    console.log("[addTicketType] Skipped — tiers can be added after both parties sign via contract detail page");
    return undefined;
  };

  return {
    addTicketTypeAsync,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
  };
};

/**
 * Hook to read the ticketCollection address from a ShowContract
 * and add a tier directly to the XAOTicket contract.
 */
export const useAddTierToXAOTicket = () => {
  const { writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const addTier = async (
    ticketCollectionAddress: `0x${string}`,
    params: {
      ticketType: number;        // TicketType enum (0-4)
      customName: string;        // used when ticketType == 4 (CUSTOM)
      priceUSDC: bigint;         // price in USDC (6 decimals)
      quantity: bigint;          // number of tickets
      onSaleTimestamp: bigint;   // when sale starts
      party1ResaleBPS: bigint;   // resale split for party1
      party2ResaleBPS: bigint;   // resale split for party2
      resellerBPS: bigint;       // resale split for reseller
    }
  ) => {
    console.log("=== ADDING TIER TO XAOTICKET ===");
    console.log("XAOTicket:", ticketCollectionAddress);
    console.log("Params:", params);

    return writeContractAsync({
      address: ticketCollectionAddress,
      abi: XAO_TICKET_ABI,
      functionName: 'addTier',
      args: [
        params.ticketType,
        params.customName,
        params.priceUSDC,
        params.quantity,
        params.onSaleTimestamp,
        params.party1ResaleBPS,
        params.party2ResaleBPS,
        params.resellerBPS,
      ],
    });
  };

  return {
    addTier,
    isLoading: isPending || isWaiting,
    isSuccess,
    error,
    transactionHash: hash,
  };
};
