import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '../wagmi';
import { XAO_TICKET_ABI, SHOW_CONTRACT_ABI } from '../lib/web3/eventcontract';

// Minimal ERC20 ABI for approve + allowance
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Buy tickets from a ShowContract's XAOTicket collection.
 *
 * Flow:
 * 1. Check existing USDC allowance
 * 2. If insufficient, send approve tx and wait for confirmation
 * 3. Call XAOTicket.buyTicket(tierId)
 */
export const useBuyTickets = () => {
  const { writeContractAsync, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const buyTickets = async (
    showContractAddress: `0x${string}`,
    ticketCollectionAddress: `0x${string}`,
    usdcAddress: `0x${string}`,
    tierId: number,
    priceUSDC: bigint, // price in USDC (6 decimals)
  ) => {
    console.log('=== BUY TICKET (XAOTicket) ===');
    console.log('ShowContract:', showContractAddress);
    console.log('XAOTicket:', ticketCollectionAddress);
    console.log('USDC:', usdcAddress);
    console.log('Tier ID:', tierId);
    console.log('Price USDC:', priceUSDC.toString());

    // Step 1: Approve USDC if price > 0
    if (priceUSDC > BigInt(0)) {
      console.log('Step 1: Approving USDC spend...');
      const approveTxHash = await writeContractAsync({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ticketCollectionAddress, priceUSDC],
      });

      // Wait for approve to be confirmed on-chain before proceeding
      console.log('Waiting for approve confirmation...', approveTxHash);
      await waitForTransactionReceipt(config, {
        hash: approveTxHash,
      });
      console.log('USDC approve confirmed!');
    }

    // Step 2: Buy the ticket
    console.log('Step 2: Calling buyTicket...');
    return writeContractAsync({
      address: ticketCollectionAddress,
      abi: XAO_TICKET_ABI,
      functionName: 'buyTicket',
      args: [BigInt(tierId)],
      gas: BigInt(500_000),
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

/**
 * Hook to read the XAOTicket contract address from a ShowContract.
 */
export const useTicketCollection = (showContractAddress?: `0x${string}`) => {
  const { data, isLoading, error } = useReadContract({
    address: showContractAddress,
    abi: SHOW_CONTRACT_ABI,
    functionName: 'ticketCollection',
    query: { enabled: !!showContractAddress },
  });

  return {
    ticketCollectionAddress: data as `0x${string}` | undefined,
    isLoading,
    error,
  };
};
