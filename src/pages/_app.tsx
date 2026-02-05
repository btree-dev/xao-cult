import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import Head from 'next/head';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

import { config } from '../wagmi';
import { supabase } from '../lib/supabase';
import store from '../store/store'
import { Provider } from 'react-redux'
import Navbar from '../components/Navbar';
import Scrollbar from '../components/Scrollbar';
import { XMTPProvider } from '../contexts/XMTPContext';

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    getUserProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          getUserProfile();
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Add or remove navbar class from body
  useEffect(() => {
    if (userProfile) {
      // document.body.classList.add('with-navbar');
    } else {
      document.body.classList.remove('with-navbar');
    }
  }, [userProfile]);

  // Viewport detection: Force 430px on desktop, device-width on mobile
  useEffect(() => {
    const updateViewport = () => {
      const metaViewport = document.querySelector('meta[name="viewport"]');

      if (window.innerWidth > 530) {
        // Desktop: Force 430px viewport
        metaViewport?.setAttribute('content', 'width=430, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        document.body.classList.add('is-desktop');
        document.body.classList.remove('is-mobile');
      } else {
        // Mobile: Use device width
        metaViewport?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        document.body.classList.add('is-mobile');
        document.body.classList.remove('is-desktop');
      }
    };

    updateViewport(); 
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider theme={darkTheme()}>
          <XMTPProvider>
            <Head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
            </Head>
            <Scrollbar />
            {/* {userProfile && <Navbar userProfile={userProfile} />} */}
            <Component {...pageProps} />
          </XMTPProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
