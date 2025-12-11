import React from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { WaitingList, AttentionList } from "../../backend/contract-services/negotiation";
import { useRouter } from "next/router";

const Negotiation: React.FC = () => {
  const router = useRouter();

  const handleImageClick = (item: any) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: {
        id: item.id,
        ticketsold: item.TicketsSold,
        totalrevenue: item.TotalRevenue,
        source: "negotiation",
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
          {AttentionList.map((contract) => (
            <div
              key={contract.id}
              className={styles.ImageContainer}
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(contract)}
            >
              <div className={styles.attentionTitle}>Requires Attention</div>
              <img
                src={contract.image}
                alt={contract.title}
                className={styles.AttentionImage}
              />
              <div className={styles.AttentionDetailsOverlay}>
                <h2 className={styles.promotionTitle}>{contract.title}</h2>
                <span className={styles.promotionLocation}>
                  <img src="/contracts-Icons/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                  {contract.Location}
                </span>
                <span className={styles.promotionDate}>
                  <img src="/contracts-Icons/Calendar.svg" alt="Date" className={styles.promotionIcon} />
                  {contract.Date}
                </span>
              </div>
            </div>
          ))}
          {WaitingList.map((waiting) => (
            <div
              key={waiting.id}
              className={styles.ImageContainer}
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(waiting)}
            >
              <div className={styles.waitingTitle}>Waiting</div>
              <img
                src={waiting.image}
                alt={waiting.title}
                className={styles.waitingImage}
              />
              <div className={styles.AttentionDetailsOverlay}>
                <h2 className={styles.promotionTitle}>{waiting.title}</h2>
                <span className={styles.promotionLocation}>
                  <img src="/contracts-Icons/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                  {waiting.Location}
                </span>
                <span className={styles.promotionDate}>
                  <img src="/contracts-Icons/Calendar.svg" alt="Date" className={styles.promotionIcon} />
                  {waiting.Date}
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