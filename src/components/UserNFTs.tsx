import React from "react";
import { useWeb3 } from "../hooks/useWeb3";
import { useGetUserNFTs, useGetContractData } from "../hooks/useContractNFT";
import styles from "../styles/UserNFTs.module.css";

interface NFTDisplayProps {
  className?: string;
}

export const UserNFTs: React.FC<NFTDisplayProps> = ({ className }) => {
  const { address, chain, isConnected } = useWeb3();
  const { tokenIds, isLoading } = useGetUserNFTs(address, chain?.id);

  if (!isConnected) {
    return (
      <div className={`${styles.container} ${className}`}>
        <p>Please connect your wallet to view your contracts</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <p>Loading your contracts...</p>
      </div>
    );
  }

  if (!tokenIds || tokenIds.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <p>No contract NFTs created yet</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <h2 className={styles.title}>Your Contract NFTs</h2>
      <div className={styles.grid}>
        {tokenIds.map((tokenId) => (
          <NFTCard key={tokenId.toString()} tokenId={tokenId} chainId={chain?.id} />
        ))}
      </div>
    </div>
  );
};

interface NFTCardProps {
  tokenId: bigint;
  chainId?: number;
}

const NFTCard: React.FC<NFTCardProps> = ({ tokenId, chainId }) => {
  const { contractData, isLoading } = useGetContractData(tokenId, chainId);

  if (isLoading) {
    return (
      <div className={styles.card}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!contractData) {
    return null;
  }

  const date = new Date(Number(contractData.createdAt) * 1000);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Contract #{tokenId.toString()}</h3>
        <span className={`${styles.badge} ${contractData.isSigned ? styles.signed : styles.unsigned}`}>
          {contractData.isSigned ? "Signed" : "Unsigned"}
        </span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.party}>
          <label>Party 1:</label>
          <p>{contractData.party1}</p>
        </div>

        <div className={styles.party}>
          <label>Party 2:</label>
          <p>{contractData.party2}</p>
        </div>

        <div className={styles.meta}>
          <label>Created:</label>
          <p>{date.toLocaleDateString()} {date.toLocaleTimeString()}</p>
        </div>

        <div className={styles.termsSection}>
          <label>Terms:</label>
          <div className={styles.termsContainer}>
            <p className={styles.terms}>{contractData.terms || 'No terms provided'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
