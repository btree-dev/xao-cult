import React, { useState, useEffect } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import ShareModal from "../../components/ShareModal";
import styles from "../../styles/CreateContract.module.css";
import { useRouter } from "next/router";
import { useUserContractsWithSummaries } from "../../hooks/useGetContracts";
import { useWeb3 } from "../../hooks/useWeb3";

const CurrentContract: React.FC = () => {
  const router = useRouter();
  const [mutedContracts, setMutedContracts] = useState<Set<string>>(new Set());
  const [likedContracts, setLikedContracts] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Fetch blockchain contracts
  const { address, chain } = useWeb3();
  console.log("=== WEB3 DEBUG ===");
  console.log("Connected address:", address);
  console.log("Chain ID:", chain?.id);

  const { contracts, isLoading } = useUserContractsWithSummaries(chain?.id, address as `0x${string}`);
  console.log("=== ALL CONTRACTS ===", contracts);
  console.log(
    "Contract statuses:",
    contracts.map((c) => ({
      address: c.contractAddress,
      status: c.status,
      party1Signed: c.party1Signed,
      party2Signed: c.party2Signed,
    })),
  );

  // Filter for current contracts (status: Signed = 2)
  const currentContracts = contracts.filter(
    (contract) => contract.status === 2,
  );
  console.log("=== CURRENT CONTRACTS (status=2) ===", currentContracts);

  const toggleMute = (contractId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedContracts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contractId)) {
        newSet.delete(contractId);
      } else {
        newSet.add(contractId);
      }
      return newSet;
    });
  };

  const toggleLike = (contractId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedContracts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contractId)) {
        newSet.delete(contractId);
      } else {
        newSet.add(contractId);
      }
      return newSet;
    });
  };

  const handleShare = (contract: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContract(contract);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSelectedContract(null);
  };

  const handleImageClick = (contract: any) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: {
        id: contract.contractAddress,
        ticketsold: "0",
        totalrevenue: "0",
        source: "current",
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
          <title>Current Contract - XAO Cult</title>
        </Head>
        <ContractsNav />
        <main className={styles.contractHomecontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Current Contract</h1>
          </div>
          {currentContracts.length === 0 ? (
            <p
              style={{ color: "white", textAlign: "center", marginTop: "20px" }}
            >
              No current contracts found. Create a contract and sign it to see
              it here.
            </p>
          ) : (
            currentContracts.map((contract) => (
              <div
                key={contract.contractAddress}
                className={styles.ImageContainer}
                style={{ cursor: "pointer" }}
                onClick={() => handleImageClick(contract)}
              >
                <img
                  src={
                    contract.eventImageUri ||
                    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"
                  }
                  alt={contract.eventName}
                  className={styles.currentcontractImage}
                />
                <div className={styles.currentcontractdetailTop}>
                  <h2 className={styles.promotionTitle}>
                    {contract.eventName}
                  </h2>
                  <span className={styles.promotionLocation}>
                    <img
                      src="/Map_Pin.svg"
                      alt="Location"
                      className={styles.promotionIcon}
                    />
                    {contract.venueName}
                  </span>
                  <span className={styles.promotionDate}>
                    <img
                      src="/Calendar_Days.svg"
                      alt="Date"
                      className={styles.promotionIcon}
                    />
                    {contract.showDate}
                  </span>
                </div>
                <div className={styles.contractIconsRow}>
                  <span
                    className={styles.contractIconItem}
                    onClick={(e) => handleShare(contract, e)}
                  >
                    <img
                      src="/contracts-Icons/Vector.svg"
                      alt="Share"
                      className={styles.contractIconSvg}
                    />
                    0
                  </span>
                  <span
                    className={styles.contractIconItem}
                    onClick={(e) => toggleLike(contract.contractAddress, e)}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 7.69431C10 2.99988 3 3.49988 3 9.49991C3 15.4999 12 20.5001 12 20.5001C12 20.5001 21 15.4999 21 9.49991C21 3.49988 14 2.99988 12 7.69431Z"
                        fill={
                          likedContracts.has(contract.contractAddress)
                            ? "#DC143C"
                            : "none"
                        }
                        stroke={
                          likedContracts.has(contract.contractAddress)
                            ? "#DC143C"
                            : "white"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    0
                  </span>
                  <span
                    className={styles.contractIconItem}
                    onClick={(e) => toggleMute(contract.contractAddress, e)}
                  >
                    {mutedContracts.has(contract.contractAddress) ? (
                      <img
                        src="/Volume_Off_02.png"
                        alt="Muted"
                        className={styles.contractIconSvg}
                      />
                    ) : (
                      <img
                        src="/contracts-Icons/Volume.svg"
                        alt="Volume"
                        className={styles.contractIconSvg}
                      />
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </main>

        <ShareModal
          isOpen={shareModalOpen}
          onClose={closeShareModal}
          eventTitle={selectedContract?.eventName || ""}
          eventUrl={`/event/${selectedContract?.contractAddress || ""}`}
        />
      </div>
    </Layout>
  );
};

export default CurrentContract;
