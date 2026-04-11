import React from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { useAllContractsWithSummaries } from "../../hooks/useGetContracts";
import { useWeb3 } from "../../hooks/useWeb3";
import { useRouter } from "next/router";

const Negotiation: React.FC = () => {
  const router = useRouter();
  const { address, chain } = useWeb3();
  const { contracts, isLoading } = useAllContractsWithSummaries(chain?.id);

  console.log("=== NEGOTIATION DEBUG ===");
  console.log("Connected address:", address);
  console.log("Chain ID:", chain?.id);
  console.log("All contracts:", contracts);

  // Only show contracts where the connected user is party1 or party2
  const myAddr = address?.toLowerCase();
  const myContracts = contracts.filter(
    (contract) => myAddr && (
      contract.party1Address.toLowerCase() === myAddr ||
      contract.party2Address.toLowerCase() === myAddr
    )
  );

  // ShowContract statuses: 0=Draft, 1=Proposed, 2=Counter-Proposed, 3=Approved
  // "Requires Attention" = Proposed or Counter-Proposed (needs action from a party)
  const attentionContracts = myContracts.filter(
    (contract) => contract.status === 1 || contract.status === 2
  );
  // "Waiting" = Draft (not yet proposed)
  const waitingContracts = myContracts.filter(
    (contract) => contract.status === 0
  );
  
  // console.log("Attention contracts (status=1):", attentionContracts);
  // console.log("Waiting contracts (status=0):", waitingContracts);

  const handleImageClick = (item: any) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: {
        id: item.contractAddress,
        ticketsold: "0",
        totalrevenue: "0",
        source: "negotiation",
        party1: item.party1Address,
        party2: item.party2Address,
      },
    });
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Contract Under Negotiation - XAO Cult</title>
        </Head>
        <ContractsNav />
        <main className={styles.contractHomecontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Contract Under Negotiation</h1>
          </div>
          {attentionContracts.map((contract) => (
            <div
              key={contract.contractAddress}
              className={styles.ImageContainer}
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(contract)}
            >
              <div className={styles.attentionTitle}>Requires Attention</div>
              <img
                src={
                  contract.eventImageUri ||
                  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"
                }
                alt={contract.eventName}
                className={styles.AttentionImage}
              />
              <div className={styles.AttentionDetailsOverlay}>
                <h2 className={styles.promotionTitle}>{contract.eventName}</h2>
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
            </div>
          ))}
          {waitingContracts.map((waiting) => (
            <div
              key={waiting.contractAddress}
              className={styles.ImageContainer}
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(waiting)}
            >
              <div className={styles.waitingTitle}>Waiting</div>
              <img
                src={
                  waiting.eventImageUri ||
                  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"
                }
                alt={waiting.eventName}
                className={styles.waitingImage}
              />
              <div className={styles.AttentionDetailsOverlay}>
                <h2 className={styles.promotionTitle}>{waiting.eventName}</h2>
                <span className={styles.promotionLocation}>
                  <img
                    src="/Map_Pin.svg"
                    alt="Location"
                    className={styles.promotionIcon}
                  />
                  {waiting.venueName}
                </span>
                <span className={styles.promotionDate}>
                  <img
                    src="/Calendar_Days.svg"
                    alt="Date"
                    className={styles.promotionIcon}
                  />
                  {waiting.showDate}
                </span>
              </div>
            </div>
          ))}
        </main>
      </div>
    </Layout>
  );
};

export default Negotiation;