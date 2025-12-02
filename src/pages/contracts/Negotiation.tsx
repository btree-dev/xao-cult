import React, { useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { WaitingList } from "../../backend/contract-services/negotiation";
import { useRouter } from "next/router";
import apiClient from "../../backend/services/ApiClient";

const Negotiation: React.FC = () => {
  const router = useRouter();
  const [attentionContracts, setAttentionContracts] = useState<any[]>([]);
  // Replace this with your actual user email logic
  const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : "";

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const response = await apiClient.get("http://localhost:3000/contracts");
        // Filter contracts where party2 matches the logged-in user's email
        const filtered = (response.data.data || []).filter(
          (contract: any) => contract.party2 === userEmail
        );
        setAttentionContracts(filtered);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      }
    };
    if (userEmail) fetchContracts();
  }, [userEmail]);

  const handleImageClick = (item: any) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: {
        id: item._id,
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
          {attentionContracts.map((contract) => (
            <div
              key={contract._id}
              className={styles.ImageContainer}
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(contract)}
            >
              <div className={styles.attentionTitle}>Requires Attention</div>
              <img
                src={contract.image || "/default-image.png"}
                alt={contract.title || "Contract"}
                className={styles.AttentionImage}
              />
              <div className={styles.AttentionDetailsOverlay}>
                <h2 className={styles.promotionTitle}>{contract.title || contract._id}</h2>
                <span className={styles.promotionLocation}>
                  <img src="/contracts-Icons/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                  {contract.location?.venueName || "Unknown Venue"}
                </span>
                <span className={styles.promotionDate}>
                  <img src="/contracts-Icons/Calendar.svg" alt="Date" className={styles.promotionIcon} />
                  {contract.datesAndTimes?.showDate || "No Date"}
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