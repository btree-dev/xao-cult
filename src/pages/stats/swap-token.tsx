import type { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import styles from '../../styles/Swap.module.css';
import Layout from '../../components/Layout';
import { useRouter } from 'next/router';
import StatsNav from '../../components/StatsNav';

const Swap: NextPage = () => {
  const [payAmount, setPayAmount] = useState('4900');
  const [getAmount] = useState('0.04018');
  const router = useRouter();

  const [selectedPayToken, setSelectedPayToken] = useState({
    symbol: 'ADA',
    name: 'Cardano',
    icon: '/currency-symbols/ada.svg',
  });

  const [selectedGetToken, setSelectedGetToken] = useState({
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: '/currency-symbols/btc.svg',
  });

  useEffect(() => {
    const pay = localStorage.getItem('selectedPayToken');
    const get = localStorage.getItem('selectedGetToken');

    if (pay) setSelectedPayToken(JSON.parse(pay));
    if (get) setSelectedGetToken(JSON.parse(get));
  }, []);

  const handleOpenTokenSearch = (type: 'pay' | 'get') => {
    router.push(`/stats/search-token?type=${type}`);
  };

  return (
    <Layout>

      <div className={styles.container}>
        <div className={styles.background} />
        <StatsNav/>
        
        <Head>
          <title>Swap Tokens</title>
        </Head>
         <div className={styles.centeredContent}>
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
              <div className={styles.tokenSelectButton} onClick={() => handleOpenTokenSearch('pay')}>
                <img src={selectedPayToken.icon} alt={selectedPayToken.symbol} className={styles.tokenIcon} />
                <span>{selectedPayToken.symbol}</span>
                <span className={styles.dropdownArrow}>▼</span>
              </div>
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
              <div className={styles.tokenSelectButton} onClick={() => handleOpenTokenSearch('get')}>
                <img src={selectedGetToken.icon} alt={selectedGetToken.symbol} className={styles.tokenIcon} />
                <span>{selectedGetToken.symbol}</span>
                <span className={styles.dropdownArrow}>▼</span>
              </div>
            </div>
          </div>

          <div className={styles.priceInfo}>
            <span className={styles.priceLabel}>Current Price:</span>
            <span className={styles.priceValue}>
              1{selectedPayToken.symbol} = 0.00000321 {selectedGetToken.symbol}
            </span>
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
      </div>
    </Layout>
  
  );
};

export default Swap;
