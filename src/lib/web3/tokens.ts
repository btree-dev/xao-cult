import { base, baseSepolia } from 'wagmi/chains';

export interface TokenInfo {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

export const TOKENS_BY_CHAIN: Record<number, TokenInfo[]> = {
  [base.id]: [
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/usdc-logo.svg',
    },
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      icon: '/currency-symbols/eth.svg',
    },
    {
      address: '0xc3De830EA07524a0761646a6a4e4be0e114a3C83',
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 18,
      icon: '/xao-logo.svg',
    },
    {
      address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      decimals: 8,
      icon: '/currency-symbols/btc.svg',
    },
  ],
  [baseSepolia.id]: [
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      icon: '/currency-symbols/eth.svg',
    },
    // Circle's official Base Sepolia testnet USDC — required for Uniswap pools.
    // Get it from https://faucet.circle.com (this is different from the app's
    // existing USDC faucet token at 0x06B18F78…).
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      symbol: 'USDC',
      name: 'USD Coin (Circle testnet)',
      decimals: 6,
      icon: '/usdc-logo.svg',
    },
  ],
};

export function getTokensForChain(chainId?: number): TokenInfo[] {
  if (!chainId) return [];
  return TOKENS_BY_CHAIN[chainId] ?? [];
}

export function findToken(chainId: number | undefined, address: string): TokenInfo | undefined {
  const list = getTokensForChain(chainId);
  return list.find((t) => t.address.toLowerCase() === address.toLowerCase());
}

export function findTokenBySymbol(chainId: number | undefined, symbol: string): TokenInfo | undefined {
  const list = getTokensForChain(chainId);
  return list.find((t) => t.symbol === symbol);
}

export const SWAP_SUPPORTED_CHAIN_IDS = [base.id, baseSepolia.id] as const;
export type SwapChainId = (typeof SWAP_SUPPORTED_CHAIN_IDS)[number];

export function isSwapSupportedChain(chainId: number | undefined): chainId is SwapChainId {
  return chainId === base.id || chainId === baseSepolia.id;
}
