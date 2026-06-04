import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { getTokensForChain, TokenInfo } from '../lib/web3/tokens';
import { ERC20_ABI } from '../lib/web3/uniswap';

export interface TokenBalance {
  token: TokenInfo;
  balance: bigint;
  formatted: string;
}

function formatBalance(raw: bigint, decimals: number): string {
  const value = Number(formatUnits(raw, decimals));
  if (value === 0) return '0';
  if (value < 0.0001) return value.toExponential(2);
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export function useTokenList(address: `0x${string}` | undefined, chainId: number | undefined) {
  const tokens = useMemo(() => getTokensForChain(chainId), [chainId]);

  const contracts = useMemo(
    () =>
      tokens.map((t) => ({
        address: t.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf' as const,
        args: address ? [address] : undefined,
        chainId,
      })),
    [tokens, address, chainId],
  );

  const { data, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: !!address && tokens.length > 0 },
  });

  const balances: TokenBalance[] = useMemo(() => {
    return tokens.map((token, i) => {
      const raw = (data?.[i]?.result as bigint | undefined) ?? BigInt(0);
      return {
        token,
        balance: raw,
        formatted: formatBalance(raw, token.decimals),
      };
    });
  }, [tokens, data]);

  return { tokens, balances, isLoading, refetch };
}
