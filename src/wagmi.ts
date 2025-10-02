import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia, 
} from "@wagmi/chains";
import { type Chain } from 'viem';
export const baseSepolia: Chain = {
  id: 84531, 
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Base Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['YOUR_RPC_URL'] }, 
    public: { http: ['YOUR_RPC_URL'] },
  },
  blockExplorers: {
    default: { name: 'BaseSepoliaScan', url: 'https://sepolia.basescan.org/' },
  },
};
export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true'
      ? [sepolia, baseSepolia] 
      : []),
  ],
  ssr: true,
});
