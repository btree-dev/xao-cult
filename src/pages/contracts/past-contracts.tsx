import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import ShareModal from "../../components/ShareModal";
import styles from "../../styles/CreateContract.module.css";
import { useRouter } from "next/router";
import { useWeb3 } from "../../hooks/useWeb3";
import { useUserContractsWithSummaries, CONTRACT_STATUS_LABELS } from "../../hooks/useGetContracts";

const STATUS_COLORS: Record<number, string> = {
  5: '#4ade80',  // COMPLETED
  6: '#ef4444',  // CANCELLED
};

const PastContract: React.FC = () => {
  const router = useRouter();
  const { address, chain } = useWeb3();
  const { contracts, isLoading } = useUserContractsWithSummaries(chain?.id, address);

  const [mutedContracts, setMutedContracts] = useState<Set<string>>(new Set());
  const [likedContracts, setLikedContracts] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Past = COMPLETED (5) or CANCELLED (6)
  const pastContracts = contracts.filter(c => c.status === 5 || c.status === 6);

  const toggleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedContracts(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedContracts(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleShare = (contract: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContract(contract);
    setShareModalOpen(true);
  };

  const handleCardClick = (contract: any) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: {
        id: contract.contractAddress,
        source: "past",
        party1: contract.party1Address,
        party2: contract.party2Address,
      },
    });
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Past Contracts - XAO Cult</title>
        </Head>
        <ContractsNav />
        <main className={styles.contractHomecontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Past Contracts</h1>
          </div>

          {!address && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
              Connect your wallet to view past contracts.
            </p>
          )}

          {address && isLoading && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
              Loading…
            </p>
          )}

          {address && !isLoading && pastContracts.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
              No completed or cancelled contracts yet.
            </p>
          )}

          {pastContracts.map(contract => {
            const statusColor = STATUS_COLORS[contract.status] ?? '#888';
            return (
              <div
                key={contract.contractAddress}
                className={styles.ImageContainer}
                style={{ cursor: 'pointer' }}
                onClick={() => handleCardClick(contract)}
              >
                <img
                  src={
                    contract.eventImageUri ||
                    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"
                  }
                  alt={contract.eventName}
                  className={styles.pastImage}
                />
                <div className={styles.AttentionDetailsOverlay}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{
                      background: statusColor,
                      borderRadius: '4px',
                      padding: '1px 7px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#000',
                    }}>
                      {CONTRACT_STATUS_LABELS[contract.status] ?? 'UNKNOWN'}
                    </span>
                  </div>
                  <h2 className={styles.promotionTitle}>{contract.eventName}</h2>
                  <span className={styles.promotionLocation}>
                    <img src="/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                    {contract.venueName}
                  </span>
                  <span className={styles.promotionDate}>
                    <img src="/Calendar_Days.svg" alt="Date" className={styles.promotionIcon} />
                    {contract.showDate}
                  </span>
                </div>
                <div className={styles.contractIconsRow}>
                  <span className={styles.contractIconItem} onClick={e => handleShare(contract, e)}>
                    <img src="/contracts-Icons/Vector.svg" alt="Share" className={styles.contractIconSvg} />
                  </span>
                  <span className={styles.contractIconItem} onClick={e => toggleLike(contract.contractAddress, e)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 7.69431C10 2.99988 3 3.49988 3 9.49991C3 15.4999 12 20.5001 12 20.5001C12 20.5001 21 15.4999 21 9.49991C21 3.49988 14 2.99988 12 7.69431Z"
                        fill={likedContracts.has(contract.contractAddress) ? "#DC143C" : "none"}
                        stroke={likedContracts.has(contract.contractAddress) ? "#DC143C" : "white"}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className={styles.contractIconItem} onClick={e => toggleMute(contract.contractAddress, e)}>
                    {mutedContracts.has(contract.contractAddress) ? (
                      <img src="/Volume_Off_02.png" alt="Muted" className={styles.contractIconSvg} />
                    ) : (
                      <img src="/contracts-Icons/Volume.svg" alt="Volume" className={styles.contractIconSvg} />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </main>

        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setSelectedContract(null); }}
          eventTitle={selectedContract?.eventName || ''}
          eventUrl={`/contracts/contracts-detail?id=${selectedContract?.contractAddress || ''}&source=past`}
        />
      </div>
    </Layout>
  );
};

export default PastContract;
