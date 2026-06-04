import { useCallback, useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, getAddress, parseAbiItem, type Address, type Hash, type PublicClient } from 'viem';
import { findToken, getTokensForChain, TokenInfo } from '../lib/web3/tokens';
import {
  FACTORY_ABI,
  SUPPORTED_FEE_TIERS,
  UNISWAP_ADDRESSES,
} from '../lib/web3/uniswap';

export interface SwapHistoryEntry {
  txHash: Hash;
  blockNumber: bigint;
  timestamp: number;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: bigint;
  amountOut: bigint;
  amountInFormatted: string;
  amountOutFormatted: string;
}

// v1: scan a recent window only. Full history would need an indexer.
const HISTORY_BLOCK_WINDOW = BigInt(10000);
// Base Sepolia public RPC caps eth_getLogs at 2000 blocks per request.
const MAX_LOGS_RANGE = BigInt(2000);

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
);

function fmt(raw: bigint, decimals: number): string {
  const value = Number(formatUnits(raw, decimals));
  if (value === 0) return '0';
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

async function discoverPools(
  publicClient: PublicClient,
  factory: Address,
  tokens: TokenInfo[],
): Promise<Map<string, { token0: TokenInfo; token1: TokenInfo }>> {
  const pools = new Map<string, { token0: TokenInfo; token1: TokenInfo }>();
  const calls: Array<Promise<{ pool: Address; t0: TokenInfo; t1: TokenInfo }>> = [];

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const a = tokens[i];
      const b = tokens[j];
      const [t0, t1] = a.address.toLowerCase() < b.address.toLowerCase() ? [a, b] : [b, a];
      for (const fee of SUPPORTED_FEE_TIERS) {
        calls.push(
          publicClient
            .readContract({
              address: factory,
              abi: FACTORY_ABI,
              functionName: 'getPool',
              args: [t0.address, t1.address, fee],
            })
            .then((pool) => ({ pool: pool as Address, t0, t1 })),
        );
      }
    }
  }

  const results = await Promise.allSettled(calls);
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const { pool, t0, t1 } = r.value;
    if (pool === '0x0000000000000000000000000000000000000000') continue;
    pools.set(getAddress(pool).toLowerCase(), { token0: t0, token1: t1 });
  }
  return pools;
}

export function useSwapHistory(
  address: `0x${string}` | undefined,
  chainId: number | undefined,
) {
  const publicClient = usePublicClient({ chainId });
  const [entries, setEntries] = useState<SwapHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicClient || !address || !chainId) return;
    const factory = UNISWAP_ADDRESSES[chainId]?.factory;
    if (!factory) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const tokens = getTokensForChain(chainId);
      const pools = await discoverPools(publicClient, factory, tokens);
      const poolAddresses = Array.from(pools.keys()) as Address[];
      if (poolAddresses.length === 0) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      const latest = await publicClient.getBlockNumber();
      const fromBlock = latest > HISTORY_BLOCK_WINDOW ? latest - HISTORY_BLOCK_WINDOW : BigInt(0);

      // Chunk the range so each request respects the RPC's max block range.
      const ranges: Array<{ from: bigint; to: bigint }> = [];
      for (let start = fromBlock; start <= latest; start += MAX_LOGS_RANGE + BigInt(1)) {
        const end = start + MAX_LOGS_RANGE > latest ? latest : start + MAX_LOGS_RANGE;
        ranges.push({ from: start, to: end });
      }

      const chunkResults = await Promise.all(
        ranges.map((r) =>
          publicClient.getLogs({
            address: poolAddresses,
            event: SWAP_EVENT,
            args: { recipient: address },
            fromBlock: r.from,
            toBlock: r.to,
          }),
        ),
      );
      const logs = chunkResults.flat();

      const blockNumbers = Array.from(new Set(logs.map((l) => l.blockNumber!)));
      const blockTimestamps = new Map<bigint, number>();
      await Promise.all(
        blockNumbers.map(async (bn) => {
          const block = await publicClient.getBlock({ blockNumber: bn });
          blockTimestamps.set(bn, Number(block.timestamp));
        }),
      );

      const parsed: SwapHistoryEntry[] = [];
      for (const log of logs) {
        const poolKey = log.address.toLowerCase();
        const pool = pools.get(poolKey);
        if (!pool) continue;
        const amount0 = log.args.amount0 as bigint;
        const amount1 = log.args.amount1 as bigint;
        // In V3, recipient receives the negative-side amount and pays the positive-side.
        let tokenIn: TokenInfo, tokenOut: TokenInfo, amountIn: bigint, amountOut: bigint;
        if (amount0 < BigInt(0)) {
          tokenOut = pool.token0;
          tokenIn = pool.token1;
          amountOut = -amount0;
          amountIn = amount1;
        } else {
          tokenOut = pool.token1;
          tokenIn = pool.token0;
          amountOut = -amount1;
          amountIn = amount0;
        }
        parsed.push({
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: blockTimestamps.get(log.blockNumber!) ?? 0,
          tokenIn,
          tokenOut,
          amountIn,
          amountOut,
          amountInFormatted: fmt(amountIn, tokenIn.decimals),
          amountOutFormatted: fmt(amountOut, tokenOut.decimals),
        });
      }
      parsed.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEntries(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, chainId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return { entries, isLoading, error, refetch: load };
}
