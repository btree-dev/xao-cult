import { createConfig, http } from 'wagmi';
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



export const config = createConfig({
  chains: [
    baseSepolia,
    base,
    mainnet,
    polygon,
    optimism,
    arbitrum,
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: true,
});
