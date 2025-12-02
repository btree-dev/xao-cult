import Head from "next/head";
import { useState, useRef } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/CreateContract.module.css";
import ContractsNav from "../../components/ContractsNav";
import Image from "next/image";
import router from "next/router";
import { contractAPI } from "../../backend/services/Contract";
import CreateContractsection from "./create-contract-section";
import Scrollbar from "../../components/Scrollbar";

const CreateContract = () => {
  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const contractSectionRef = useRef<any>(null);

  const handleSave = async () => {
    if (contractSectionRef.current) {
      // Get all other contract data from child
      const contractData = contractSectionRef.current.getContractData();
      // Combine with party1 and party2 from parent
      const fullContractData = {
        ...contractData,
        party1,
        party2,
      };
      try {
        await contractAPI.createContract(fullContractData);
        alert("Contract created successfully!");
        router.push("/dashboard");
      } catch (error) {
        alert("Error creating contract: " + (error as Error).message);
      }
    }
  };

  const handleSign = () => {
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
                  <div className={styles.infoLabelRow}>
                    <label
                      className={`${styles.centeredLabel} ${styles.open}`}
                    >
                      Parties
                    </label>
                    <Image
                      src="/contracts-Icons/Info.svg"
                      alt="Info"
                      width={20}
                      height={20}
                      className={styles.infoIcon}
                    />
                  </div>
                  <div className={styles.ticketInputWrapper}>
                    <label className={styles.ticketsLabel}>Party 1</label>
                    <div className={styles.inputRow}>
                      <input
                        type="text"
                        onChange={(e) => setParty1(e.target.value)}
                        placeholder="Party1"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.ticketInputWrapper}>
                    <label className={styles.ticketsLabel}>Party 2</label>
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
                </div>

                <CreateContractsection
                  ref={contractSectionRef}
                  party1={party1}
                  party2={party2}
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className={styles.confirmButton}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleSign}
                  className={styles.documentButton}
                >
                  sign
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