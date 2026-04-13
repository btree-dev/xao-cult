import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image'
import styles from '../styles/Home.module.css';
import { DynamicEmbeddedWidget } from '@dynamic-labs/sdk-react-core';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

const Home: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Redirect to dashboard only when both wallet and Supabase session are ready
  useEffect(() => {
    if (!isConnected || !address) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [isConnected, address, router]);

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
        <div className={styles.walletWidgetContainer}>
          <DynamicEmbeddedWidget />
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
