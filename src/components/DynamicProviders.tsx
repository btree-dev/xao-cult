import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { XMTPProvider } from '../contexts/XMTPContext';
import { ProfileCacheProvider } from '../contexts/ProfileCacheContext';
import { supabase } from '../lib/supabase';

interface DynamicProvidersProps {
  children: React.ReactNode;
}

const createSupabaseSession = async (user: any) => {
  try {
    const email = user.email;
    const walletAddress = user.verifiedCredentials?.[0]?.address;
    const dynamicUserId = user.userId;

    const response = await fetch('/api/auth/dynamic-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, walletAddress, dynamicUserId }),
    });

    if (!response.ok) {
      console.error('[DynamicAuth] Failed to create Supabase session');
      return;
    }

    const { token_hash } = await response.json();

    // Verify the magic link token to establish a Supabase session
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email',
    });

    if (error) {
      console.error('[DynamicAuth] Supabase OTP verification failed:', error.message);
    } else {
      console.log('[DynamicAuth] Supabase session established');
    }
  } catch (err) {
    console.error('[DynamicAuth] Error creating Supabase session:', err);
  }
};

const DynamicProviders: React.FC<DynamicProvidersProps> = ({ children }) => {
  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '',
        walletConnectors: [EthereumWalletConnectors],
        events: {
          onAuthSuccess: ({ user }) => {
            createSupabaseSession(user);
          },
        },
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
