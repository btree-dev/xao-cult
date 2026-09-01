import { useMemo, useState } from 'react';
import styles from '../../styles/TransactionHistory.module.css';
import Image from 'next/image';
import Layout from '../../components/Layout';
import StatsNav from '../../components/StatsNav';
import { baseSepolia } from 'wagmi/chains';

import swapIcon from '../../../public/swap-currency.svg';
import { useWeb3 } from '../../hooks/useWeb3';
import { useSwapHistory, type SwapHistoryEntry } from '../../hooks/useSwapHistory';
import { useTicketPurchases, type TicketPurchaseEntry } from '../../hooks/useTicketPurchases';
import { isSwapSupportedChain } from '../../lib/web3/tokens';

function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Block-explorer transaction link for the given chain.
function explorerTxUrl(txHash: string, chainId?: number): string {
  const base = chainId === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org';
  return `${base}/tx/${txHash}`;
}

function TxLink({ txHash, chainId }: { txHash: string; chainId?: number }) {
  return (
    <a
      href={explorerTxUrl(txHash, chainId)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{ color: '#A557FF', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}
      title="View on block explorer"
    >
      {txHash.slice(0, 6)}…{txHash.slice(-4)} ↗
    </a>
  );
}

type Row =
  | { kind: 'swap'; ts: number; data: SwapHistoryEntry }
  | { kind: 'ticket'; ts: number; data: TicketPurchaseEntry };

export default function TransactionHistory() {
  const [activeTab, setActiveTab] = useState<'All' | 'Swap' | 'Tickets'>('All');
  const { address, chain } = useWeb3();
  const historyChainId = isSwapSupportedChain(chain?.id) ? chain!.id : baseSepolia.id;

  const { entries: swaps, isLoading: swapsLoading, error: swapsError } = useSwapHistory(address, historyChainId);
  const { entries: purchases, isLoading: purchasesLoading, error: purchasesError } =
    useTicketPurchases(address, chain?.id ?? baseSepolia.id);

  const isLoading = swapsLoading || purchasesLoading;
  const error = swapsError || purchasesError || null;

  const visible = useMemo<Row[]>(() => {
    const swapRows: Row[] = swaps.map((s) => ({ kind: 'swap', ts: s.timestamp, data: s }));
    const ticketRows: Row[] = purchases.map((p) => ({ kind: 'ticket', ts: p.timestamp, data: p }));
    let rows: Row[];
    if (activeTab === 'Swap') rows = swapRows;
    else if (activeTab === 'Tickets') rows = ticketRows;
    else rows = [...swapRows, ...ticketRows];
    return rows.sort((a, b) => b.ts - a.ts);
  }, [activeTab, swaps, purchases]);

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <StatsNav />
        <h2 className={styles.heading}>Transaction History</h2>

        <div className={styles.tabs}>
          {(['All', 'Swap', 'Tickets'] as const).map((tab) => (
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
              {activeTab === 'Tickets' ? 'No ticket purchases yet' : activeTab === 'Swap' ? 'No swaps yet' : 'No transactions yet'}
            </div>
          )}

          {visible.map((row) =>
            row.kind === 'swap' ? (
              <div key={row.data.txHash} className={styles.card}>
                <div className={styles.cardLeft}>
                  <Image src={swapIcon} alt="Swap" width={40} height={40} />
                  <div>
                    <p className={styles.type}>Swap</p>
                    <p className={styles.amount}>
                      {row.data.amountInFormatted} {row.data.tokenIn.symbol} → {row.data.amountOutFormatted} {row.data.tokenOut.symbol}
                    </p>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <p className={styles.date}>{formatDate(row.data.timestamp)}</p>
                  <p className={styles.success}>Success</p>
                  <TxLink txHash={row.data.txHash} chainId={historyChainId} />
                </div>
              </div>
            ) : (
              <div key={`${row.data.txHash}-${row.data.tokenId}`} className={styles.card}>
                <div className={styles.cardLeft}>
                  <span
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)',
                      fontSize: 20, flex: 'none',
                    }}
                    aria-hidden
                  >
                    🎟
                  </span>
                  <div>
                    <p className={styles.type}>Ticket Purchase</p>
                    <p className={styles.amount}>
                      {row.data.eventName} · {row.data.tierName} · ${row.data.priceFormatted}
                    </p>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <p className={styles.date}>{formatDate(row.data.timestamp)}</p>
                  <p className={styles.success}>Success</p>
                  <TxLink txHash={row.data.txHash} chainId={chain?.id ?? baseSepolia.id} />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </Layout>
  );
}
