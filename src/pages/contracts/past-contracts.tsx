import React from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { Pastcontracts } from "../../backend/contract-services/pastcontract";
import Scrollbar from "../../components/Scrollbar";
import { useRouter } from "next/router";

const PastContract: React.FC = () => {
  const router = useRouter();

  const handleImageClick = (contract: any) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: {
        id: contract.id,
        ticketsold: contract.TicketsSold,
        totalrevenue: contract.TotalRevenue,
        source: "past",
      },
    });
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Past Contract - XAO Cult</title>
        </Head>
        <ContractsNav />
        <Scrollbar/>
        <main className={styles.contractHomecontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Past Contract</h1>
          </div>
          {Pastcontracts.map((contract) => (
            <div
              key={contract.id}
              className={styles.ImageContainer}
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(contract)}
            >
              <img
                src={contract.image}
                alt={contract.title}
                className={styles.pastImage}
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
              <div className={styles.contractIconsRow}>
                <span className={styles.contractIconItem}>
                  <img src="/contracts-Icons/Vector.svg" alt="Vector" className={styles.contractIconSvg} />
                  {contract.views}
                </span>
                <span className={styles.contractIconItem}>
                  <img src="/contracts-Icons/Heart_01.svg" alt="Heart" className={styles.contractIconSvg} />
                  {contract.likes}
                </span>
                <span className={styles.contractIconItem}>
                  <img src="/contracts-Icons/Volume.svg" alt="Volume" className={styles.contractIconSvg} />
                </span>
              </div>
            </div>
          ))}
        </main>
      </div>
    </Layout>
  );
};

export default PastContract;