import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image'
import styles from '../styles/Home.module.css';
import { DynamicConnectButton } from '@dynamic-labs/sdk-react-core';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';

const Home: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Redirect to search when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      router.push('/chat-Section/Search');
    }
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
        <div className={styles.hintText}>
          Suggested
        </div>
        <div className={styles.itemContainer}>
          <DynamicConnectButton>
            <div className={styles.bigButton}>
              <Image
                src="/MetaMask-icon-fox.svg"
                alt="Wallet Icon"
                width={20}
                height={20}
                className={styles.buttonIcon}
              />
              Sign in with Wallet
            </div>
          </DynamicConnectButton>
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
