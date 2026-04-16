import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image'
import styles from '../styles/Home.module.css';
import { DynamicEmbeddedWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Home: NextPage = () => {
  const router = useRouter();
  const { user: dynamicUser } = useDynamicContext();

  // Redirect when Dynamic user is authenticated
  useEffect(() => {
    if (dynamicUser) {
      router.push('/dashboard');
    }
  }, [dynamicUser, router]);

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
