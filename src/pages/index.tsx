import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image'
import styles from '../styles/Home.module.css';
import { DynamicEmbeddedAuthFlow } from '@dynamic-labs/sdk-react-core';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useWalletReadiness } from '../hooks/useWalletReadiness';
import WalletNotReady from '../components/WalletNotReady';

const Home: NextPage = () => {
  const router = useRouter();
  const { readiness, walletLabel } = useWalletReadiness();

  // Move on once Dynamic has authenticated the user AND wagmi has the wallet
  // connected — /unlock-chat (behind AuthGate) needs both. replace, not push,
  // so Back doesn't land on the login page and immediately bounce forward.
  useEffect(() => {
    if (readiness === 'ready') {
      router.replace('/unlock-chat');
    }
  }, [readiness, router]);

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>XAO Cult</title>
        <meta
          content="DAO-Governed User-First dApp for NFT Smart Contracts"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        {/* Login flow only: DynamicEmbeddedAuthFlow renders nothing once signed in,
            so the user never sees Dynamic's wallet/balance view. While their wallet
            connects we show a spinner; if it never does, an explanation with
            Reload / Log out (the auth flow is gone, so this is the only way out). */}
        {readiness === 'connecting' || readiness === 'ready' ? (
          <div className={styles.navSpinner} />
        ) : (
          <WalletNotReady readiness={readiness} walletLabel={walletLabel} />
        )}
        <div className={styles.walletWidgetContainer}>
          <DynamicEmbeddedAuthFlow />
        </div>
        <div className={styles.rowContainer}>
          <div className={styles.gradientLine} />
          <Image
              alt="XAO Monster"
              src="/xao-monster.png"
              width={250}
              height={250}
              style={{ width: '25%', height: 'auto', maxWidth: '100%' }}
            />
          <div className={styles.gradientLine} />
        </div>
      </main>
    </div>
  );
};

export default Home;
