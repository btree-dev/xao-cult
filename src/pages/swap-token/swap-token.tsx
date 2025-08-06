import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import styles from '../../styles/Swap.module.css';
import Layout from '../../components/Layout';

const Swap: NextPage = () => {
  const [payAmount, setPayAmount] = useState('4900');
  const [getAmount] = useState('0.04018');

  return (
    <Layout>
    <div className={styles.container}>
      <Head>
        <title>Swap Tokens</title>
      </Head>

      <Navbar />

      <div className={styles.swapCard}>
        <h1 className={styles.title}>Swap Tokens</h1>

        <div className={styles.inputGroup}>
          <label className={styles.label}>You pay</label>
          <div className={styles.inputRow}>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={styles.input}
            />
            <select className={styles.tokenSelect}>
              <option value="ADA">ADA</option>
            </select>
          </div>
        </div>

        <div className={styles.swapDivider}>
            <img src="/swap-currency.svg" alt="Swap" className={styles.swapSvg} />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>You get</label>
          <div className={styles.inputRow}>
            <input
              type="text"
              value={getAmount}
              disabled
              className={styles.input}
            />
            <select className={styles.tokenSelect}>
              <option value="BTC">BTC</option>
            </select>
          </div>
        </div>

        <div className={styles.priceInfo}>
          <span className={styles.priceLabel}>Current Price:</span>
          <span className={styles.priceValue}>1ADA = 0.00000321 BTC</span>
        </div>

        <button className={styles.swapButton}>Swap Now</button>

        <h2 className={styles.assetsTitle}>My Assets</h2>

        <div className={styles.assetRow}>
          <span>ADA</span>
          <span>10.400</span>
        </div>
        <div className={styles.separator} />
        <div className={styles.assetRow}>
          <span>BTC</span>
          <span>1.25</span>
        </div>
        <div className={styles.separator} />
        <div className={styles.assetRow}>
          <span>ETH</span>
          <span>0.80</span>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default Swap;
