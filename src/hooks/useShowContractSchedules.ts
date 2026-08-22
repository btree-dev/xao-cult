import { useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '../wagmi';
import { SHOW_CONTRACT_ABI } from '../lib/web3/eventcontract';

/**
 * The six ShowContract payment-schedule setters. All share the same
 * `(uint256, uint256, uint256)` signature and are `onlyParty1 notFinalized`
 * on-chain, so they must be called by the contract creator (party1) after the
 * draft is deployed and before both parties sign (finalization).
 */
export type ScheduleFn =
  | 'addParty1Deposit'
  | 'addParty2Deposit'
  | 'addParty1Payout'
  | 'addParty2Payout'
  | 'addParty1CancellationRefund'
  | 'addParty2CancellationRefund';

/**
 * Hook to push a single payment-schedule / cancellation-refund entry to a
 * deployed ShowContract. Each entry is its own transaction (the contract has
 * no batch setter), so a draft with several rows produces several wallet
 * prompts. Each call waits for its receipt before resolving, so callers can
 * loop sequentially without nonce collisions.
 */
export const useShowContractSchedules = () => {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const addSchedule = async (
    contractAddress: `0x${string}`,
    fn: ScheduleFn,
    arg1: bigint, // deposit/payout: timestamp · cancellation: cutoffTimestamp
    arg2: bigint, // pctBPS / refundPctBPS
    arg3: bigint, // usdcAmount / refundUSDC (6 decimals)
  ) => {
    const hash = await writeContractAsync({
      address: contractAddress,
      abi: SHOW_CONTRACT_ABI,
      functionName: fn,
      args: [arg1, arg2, arg3],
    });

    // Wait for confirmation so the next sequential write gets a fresh nonce.
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  return { addSchedule, isPending, error };
};

/**
 * Hook for the ShowContract "frontend-parity" config setters (genres, comp
 * count, tickets-sale date, resale splits). All are `onlyParty1 notFinalized`,
 * so they run post-deploy while the contract is still Draft. Each waits for its
 * receipt so callers can invoke them sequentially without nonce collisions.
 */
export const useShowContractConfig = () => {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const confirm = async (hash: `0x${string}`) => {
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  const setGenres = async (contractAddress: `0x${string}`, genres: string[]) =>
    confirm(await writeContractAsync({
      address: contractAddress, abi: SHOW_CONTRACT_ABI, functionName: 'setGenres', args: [genres],
    }));

  const setCompTickets = async (contractAddress: `0x${string}`, comps: bigint) =>
    confirm(await writeContractAsync({
      address: contractAddress, abi: SHOW_CONTRACT_ABI, functionName: 'setCompTickets', args: [comps],
    }));

  const setTicketsSaleDate = async (contractAddress: `0x${string}`, ts: bigint) =>
    confirm(await writeContractAsync({
      address: contractAddress, abi: SHOW_CONTRACT_ABI, functionName: 'setTicketsSaleDate', args: [ts],
    }));

  const setResaleSplits = async (
    contractAddress: `0x${string}`,
    party1BPS: bigint,
    party2BPS: bigint,
    resellerBPS: bigint,
  ) =>
    confirm(await writeContractAsync({
      address: contractAddress, abi: SHOW_CONTRACT_ABI, functionName: 'setResaleSplits',
      args: [party1BPS, party2BPS, resellerBPS],
    }));

  // party2-only on-chain. Records party2's XAO username (constructor leaves it "").
  const setParty2Username = async (contractAddress: `0x${string}`, username: string) =>
    confirm(await writeContractAsync({
      address: contractAddress, abi: SHOW_CONTRACT_ABI, functionName: 'setParty2Username',
      args: [username],
    }));

  return { setGenres, setCompTickets, setTicketsSaleDate, setResaleSplits, setParty2Username, isPending, error };
};

export type ShowContractConfigApi = ReturnType<typeof useShowContractConfig>;

/**
 * Hook to send a batch of ABI-encoded calls to a ShowContract's `multicall`,
 * so all Draft-setup setters run in ONE transaction (one wallet confirmation).
 */
export const useShowContractMulticall = () => {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const multicall = async (contractAddress: `0x${string}`, calls: readonly `0x${string}`[]) => {
    const hash = await writeContractAsync({
      address: contractAddress,
      abi: SHOW_CONTRACT_ABI,
      functionName: 'multicall',
      args: [calls],
    });
    await waitForTransactionReceipt(config, { hash });
    return hash;
  };

  return { multicall, isPending, error };
};
