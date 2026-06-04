import { useMemo, useState } from 'react';
import styles from '../../styles/TransactionHistory.module.css';
import Image from 'next/image';
import Layout from '../../components/Layout';
import StatsNav from '../../components/StatsNav';
import { baseSepolia } from 'wagmi/chains';

import swapIcon from '../../../public/swap-currency.svg';
import { useWeb3 } from '../../hooks/useWeb3';
import { useSwapHistory } from '../../hooks/useSwapHistory';
import { isSwapSupportedChain } from '../../lib/web3/tokens';

function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export default function TransactionHistory() {
  const [activeTab, setActiveTab] = useState<'All' | 'Swap' | 'Transfer'>('All');
  const { address, chain } = useWeb3();
  const historyChainId = isSwapSupportedChain(chain?.id) ? chain!.id : baseSepolia.id;
  const { entries, isLoading, error } = useSwapHistory(address, historyChainId);

  const visible = useMemo(() => {
    if (activeTab === 'Transfer') return [];
    return entries;
  }, [activeTab, entries]);

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <StatsNav />
        <h2 className={styles.heading}>Transaction History</h2>

        <div className={styles.tabs}>
          {(['All', 'Swap', 'Transfer'] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {isLoading && (
            <div style={{ textAlign: 'center', color: '#ccc', padding: 16 }}>Loading…</div>
          )}
          {!isLoading && error && (
            <div style={{ textAlign: 'center', color: '#ff6b6b', padding: 16 }}>{error}</div>
          )}
          {!isLoading && !error && visible.length === 0 && (
            <div style={{ textAlign: 'center', color: '#ccc', padding: 16 }}>
              {activeTab === 'Transfer' ? 'Transfer history coming soon' : 'No swaps yet'}
            </div>
          )}
          {visible.map((t) => (
            <div key={t.txHash} className={styles.card}>
              <div className={styles.cardLeft}>
                <Image src={swapIcon} alt="Swap" width={40} height={40} />
                <div>
                  <p className={styles.type}>Swap</p>
                  <p className={styles.amount}>
                    {t.amountInFormatted} {t.tokenIn.symbol} → {t.amountOutFormatted} {t.tokenOut.symbol}
                  </p>
                </div>
              </div>
              <div className={styles.cardRight}>
                <p className={styles.date}>{formatDate(t.timestamp)}</p>
                <p className={styles.success}>Success</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
