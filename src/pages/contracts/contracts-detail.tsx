import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { EventDocs } from "../../backend/eventsdata";
import CreateContractsection from "./create-contract-section";
import { useRouter } from "next/router";
import Scrollbar from "../../components/Scrollbar";
import BlankNavbar from "../../components/BackNav";
const Contractsdetail: React.FC = () => {
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const router = useRouter();
  const { id, ticketsold, totalrevenue, source } = router.query;
  const eventDetail = EventDocs.find((event) => String(event.id) === String(id));

  const handleArbitrateClick = () => {
    router.push("/contracts/arbitrate");
  };
  const renderButtons = () => {
    if (source === "current") {
      return (
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
      );
    } else if (source === "negotiation") {

      return (
        <div className={styles.contractRow}>
          <button type="button" className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      );
    } else if (source === "past") {

      return null;
    }
    return null;
  };


  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Contract Details - XAO Cult</title>
        </Head>
        <BlankNavbar pageTitle="Contract Details"/>

        <Scrollbar />
        <main className={styles.contractDetailcontainer}>

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
          <CreateContractsection party1={party1} party2={party2} />
          {renderButtons()}
        </main>
      </div>
    </Layout>
  );
};

export default Contractsdetail;