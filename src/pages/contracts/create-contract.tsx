import Head from "next/head";
import { useState, useRef } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/CreateContract.module.css";
import ContractsNav from "../../components/ContractsNav";
import Image from "next/image";
import router from "next/router";
import { EventDocs } from "../../backend/eventsdata";
import CreateContractsection from "./create-contract-section";
import Scrollbar from "../../components/Scrollbar";

const CreateContract = () => {
  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");

  const handleSave = () => {
    router.push("/dashboard");
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>CreateContract - XAO Cult</title>
        </Head>
        <ContractsNav />
        <Scrollbar/>
        <main className={styles.contractHomecontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Create Contract</h1>
            <div className={styles.toggleWrapper}>
              <button
                className={`${styles.toggleBtn} ${
                  selected === "chat" ? styles.active : ""
                }`}
                onClick={() => setSelected("chat")}
              >
                Chat
              </button>
              <button
                className={`${styles.toggleBtn} ${
                  selected === "contract" ? styles.active : ""
                }`}
                onClick={() => setSelected("contract")}
              >
                Contract
              </button>
            </div>
          </div>
          <div className={styles.content}>
            {selected === "chat" ? (
              <p>Chat content...</p>
            ) : (
              <>
                <div className={styles.docContainer}>
                  <label className={`${styles.label} ${styles.open}`}>Parties</label>
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
                </div>

                <CreateContractsection/>
              <button type="button" onClick={handleSave}   className={styles.confirmButton}>
                  Save
              </button>

            </>
          )}
        </div>
        </main>
      </div>
    </Layout>
  );
};

export default CreateContract;