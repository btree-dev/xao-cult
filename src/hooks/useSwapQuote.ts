import { useEffect, useMemo, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { TokenInfo } from '../lib/web3/tokens';
import {
  QUOTER_V2_ABI,
  SUPPORTED_FEE_TIERS,
  UNISWAP_ADDRESSES,
  type FeeTier,
} from '../lib/web3/uniswap';

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  feeTier: FeeTier;
  pricePerInput: number;
  formattedOut: string;
}

interface UseSwapQuoteArgs {
  chainId: number | undefined;
  tokenIn: TokenInfo | undefined;
  tokenOut: TokenInfo | undefined;
  amountInRaw: string;
}

interface UseSwapQuoteResult {
  quote: SwapQuote | null;
  isLoading: boolean;
  error: string | null;
}

export function useSwapQuote({
  chainId,
  tokenIn,
  tokenOut,
  amountInRaw,
}: UseSwapQuoteArgs): UseSwapQuoteResult {
  const publicClient = usePublicClient({ chainId });
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountIn = useMemo(() => {
    if (!tokenIn || !amountInRaw) return BigInt(0);
    const trimmed = amountInRaw.replace(/[^0-9.]/g, '');
    if (!trimmed || trimmed === '.') return BigInt(0);
    try {
      return parseUnits(trimmed, tokenIn.decimals);
    } catch {
      return BigInt(0);
    }
  }, [tokenIn, amountInRaw]);

  useEffect(() => {
    if (!publicClient || !chainId || !tokenIn || !tokenOut || amountIn === BigInt(0)) {
      setQuote(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase()) {
      setQuote(null);
      setError('Same token selected');
      setIsLoading(false);
      return;
    }
    const quoter = UNISWAP_ADDRESSES[chainId]?.quoterV2;
    if (!quoter) {
      setQuote(null);
      setError('Uniswap not deployed on this chain');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const handle = setTimeout(async () => {
      try {
        const results = await Promise.allSettled(
          SUPPORTED_FEE_TIERS.map(async (fee) => {
            const { result } = await publicClient.simulateContract({
              address: quoter,
              abi: QUOTER_V2_ABI,
              functionName: 'quoteExactInputSingle',
              args: [
                {
                  tokenIn: tokenIn.address,
                  tokenOut: tokenOut.address,
                  amountIn,
                  fee,
                  sqrtPriceLimitX96: BigInt(0),
                },
              ],
            });
            return { fee, amountOut: result[0] as bigint };
          }),
        );

        const successful = results
          .filter((r): r is PromiseFulfilledResult<{ fee: FeeTier; amountOut: bigint }> => r.status === 'fulfilled')
          .map((r) => r.value)
          .filter((v) => v.amountOut > BigInt(0));

        if (cancelled) return;

        if (successful.length === 0) {
          setQuote(null);
          setError('No liquidity for this pair');
          setIsLoading(false);
          return;
        }

        const best = successful.reduce((a, b) => (b.amountOut > a.amountOut ? b : a));
        const inFloat = Number(formatUnits(amountIn, tokenIn.decimals));
        const outFloat = Number(formatUnits(best.amountOut, tokenOut.decimals));
        const formattedOut = outFloat.toLocaleString('en-US', {
          maximumFractionDigits: tokenOut.decimals === 6 ? 4 : 6,
        });
        setQuote({
          amountIn,
          amountOut: best.amountOut,
          feeTier: best.fee,
          pricePerInput: inFloat > 0 ? outFloat / inFloat : 0,
          formattedOut,
        });
        setIsLoading(false);
      } catch (e) {
        if (cancelled) return;
        setQuote(null);
        setError(e instanceof Error ? e.message : 'Quote failed');
        setIsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [publicClient, chainId, tokenIn, tokenOut, amountIn]);

  return { quote, isLoading, error };
}
