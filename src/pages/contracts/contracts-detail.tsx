import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { EventDocs } from "../../backend/eventsdata";
import CreateContractsection from "./create-contract-section";
import { useRouter } from "next/router";
import Scrollbar from "../../components/Scrollbar";

const Contractsdetail: React.FC = () => {
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const router = useRouter();
  const { id, ticketsold, totalrevenue } = router.query;

  // Find event by id
  const eventDetail = EventDocs.find((event) => String(event.id) === String(id));

  const handleArbitrateClick = () => {
    router.push("/contracts/arbitrate");
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Contract Details - XAO Cult</title>
        </Head>
        <ContractsNav />
        <Scrollbar />
        <main className={styles.contractDetailcontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Contracts Details</h1>
          </div>

          {eventDetail && (
            <div className={styles.ImageContainer}>
              <img
                src={eventDetail.image}
                alt={eventDetail.title}
                className={styles.currentcontractImage}
              />
              <div className={styles.AttentionDetailsOverlay}>
                <h2 className={styles.promotionTitle}>{eventDetail.title}</h2>
                <span className={styles.promotionLocation}>
                  Ticket Sold: {ticketsold}
                </span>
                <span className={styles.promotionDate}>
                  Total Revenue: {totalrevenue}
                </span>
              </div>
            </div>
          )}

          <label className={styles.Leftlabel}>Parties </label>
          <div className={styles.inputRow}>
            <input
              type="text"
              onChange={(e) => setParty1(e.target.value)}
              placeholder="Party1"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputRow}>
            <input
              type="text"
              onChange={(e) => setParty2(e.target.value)}
              placeholder="Party2"
              className={styles.input}
              required
            />
          </div>
          <CreateContractsection />
          <div className={styles.contractRow}>
            <button type="button" className={styles.cancelButton}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.arbitrateButton}
              onClick={handleArbitrateClick}
            >
              Arbitrate
            </button>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Contractsdetail;