import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { XMTPProvider } from '../contexts/XMTPContext';
import { ProfileCacheProvider } from '../contexts/ProfileCacheContext';

interface DynamicProvidersProps {
  children: React.ReactNode;
}

const BASE_ICON = 'https://app.dynamic.xyz/assets/networks/base.svg';
const ETH_ICON = 'https://app.dynamic.xyz/assets/networks/eth.svg';
const POLYGON_ICON = 'https://app.dynamic.xyz/assets/networks/polygon.svg';
const OP_ICON = 'https://app.dynamic.xyz/assets/networks/optimism.svg';
const ARB_ICON = 'https://app.dynamic.xyz/assets/networks/arbitrum.svg';

const EVM_NETWORKS = [
  {
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    chainId: 84532,
    chainName: 'Base Sepolia',
    iconUrls: [BASE_ICON],
    name: 'Base Sepolia',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    networkId: 84532,
    rpcUrls: ['https://sepolia.base.org'],
    vanityName: 'Base Sepolia',
  },
  {
    blockExplorerUrls: ['https://basescan.org'],
    chainId: 8453,
    chainName: 'Base',
    iconUrls: [BASE_ICON],
    name: 'Base',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    networkId: 8453,
    rpcUrls: ['https://mainnet.base.org'],
    vanityName: 'Base',
  },
  {
    blockExplorerUrls: ['https://etherscan.io'],
    chainId: 1,
    chainName: 'Ethereum',
    iconUrls: [ETH_ICON],
    name: 'Ethereum',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    networkId: 1,
    rpcUrls: ['https://cloudflare-eth.com'],
    vanityName: 'Ethereum',
  },
  {
    blockExplorerUrls: ['https://polygonscan.com'],
    chainId: 137,
    chainName: 'Polygon',
    iconUrls: [POLYGON_ICON],
    name: 'Polygon',
    nativeCurrency: { decimals: 18, name: 'MATIC', symbol: 'MATIC' },
    networkId: 137,
    rpcUrls: ['https://polygon-rpc.com'],
    vanityName: 'Polygon',
  },
  {
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    chainId: 10,
    chainName: 'OP Mainnet',
    iconUrls: [OP_ICON],
    name: 'OP Mainnet',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    networkId: 10,
    rpcUrls: ['https://mainnet.optimism.io'],
    vanityName: 'Optimism',
  },
  {
    blockExplorerUrls: ['https://arbiscan.io'],
    chainId: 42161,
    chainName: 'Arbitrum One',
    iconUrls: [ARB_ICON],
    name: 'Arbitrum One',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    networkId: 42161,
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    vanityName: 'Arbitrum',
  },
];

const DYNAMIC_SETTINGS = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '',
  walletConnectors: [EthereumWalletConnectors],
  overrides: { evmNetworks: EVM_NETWORKS },
};

const DynamicProviders: React.FC<DynamicProvidersProps> = ({ children }) => {
  return (
    <DynamicContextProvider theme="dark" settings={DYNAMIC_SETTINGS}>
      <DynamicWagmiConnector>
        <XMTPProvider>
          <ProfileCacheProvider>
            {children}
          </ProfileCacheProvider>
        </XMTPProvider>
      </DynamicWagmiConnector>
    </DynamicContextProvider>
  );
};

export default DynamicProviders;
