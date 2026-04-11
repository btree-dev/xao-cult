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
import { baseSepolia } from 'viem/chains';



export const config = getDefaultConfig({
  appName: 'XAO Cult',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    baseSepolia,
    base,
    mainnet,
    polygon,
    optimism,
    arbitrum,
  ],
  ssr: true,
});
