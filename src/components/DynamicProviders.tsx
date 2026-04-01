import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { XMTPProvider } from '../contexts/XMTPContext';
import { ProfileCacheProvider } from '../contexts/ProfileCacheContext';

interface DynamicProvidersProps {
  children: React.ReactNode;
}

const DynamicProviders: React.FC<DynamicProvidersProps> = ({ children }) => {
  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '',
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
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
