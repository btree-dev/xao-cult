import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

import { config } from '../wagmi';
import Scrollbar from '../components/Scrollbar';

const client = new QueryClient();

// Dynamic providers need browser APIs and environmentId at runtime — load client-only
const DynamicProviders = dynamic(
  () => import('../components/DynamicProviders'),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  // Viewport detection: Force 430px on desktop, device-width on mobile
  useEffect(() => {
    const updateViewport = () => {
      const metaViewport = document.querySelector('meta[name="viewport"]');

      if (window.innerWidth > 530) {
        metaViewport?.setAttribute('content', 'width=430, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        document.body.classList.add('is-desktop');
        document.body.classList.remove('is-mobile');
      } else {
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
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        </Head>
        <DynamicProviders>
          <Scrollbar />
          <Component {...pageProps} />
        </DynamicProviders>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
