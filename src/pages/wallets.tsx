import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image'
import styles from '../styles/Home.module.css';
import Link from 'next/link';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

const Wallets: NextPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>XAO Cult</title>
        <meta
          content="Wallet connection powered by Dynamic"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

    <main className={styles.main}>
      <DynamicWidget />
      <div className={styles.gradientLine} />
      <div className={styles.itemContainer}>
        <Link href="/">
        <Image
          alt="XAO Monster"
          src="/xao-monster.png"
          width={250}
          height={250}
          style={{ width: '25%', height: 'auto', maxWidth: '100%' }}
        />
        </Link>
      </div>
    </main>
    </div>
  );
};

export default Wallets;
