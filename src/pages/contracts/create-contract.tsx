import Head from "next/head";
import { useState, useRef, useEffect } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/CreateContract.module.css";
import ContractsNav from "../../components/ContractsNav";
import Image from "next/image";
import router from "next/router";
import CreateContractsection from "./create-contract-section";
import Scrollbar from "../../components/Scrollbar";
import ContractChat from "./ContractChat";
import { useCreateEventContract } from "../../hooks/useCreateContract";
import { useSignEventContract } from "../../hooks/useSignEventContract";
import { useAddTicketType } from "../../hooks/useAddTicketType";
import { useWeb3 } from "../../hooks/useWeb3";
import { handleSaveContract, handleSignContract, addTicketsToContract } from "../../backend/contract-services/createContract";
import { TicketRow } from "./TicketsSection";

const CreateContract = () => {
  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const [isContractCreating, setIsContractCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [creationError, setCreationError] = useState("");
  const [pendingSign, setPendingSign] = useState(false);
  const contractSectionRef = useRef<any>(null);

  const { address, isConnected, chain } = useWeb3();
  const { createEventContract, isLoading, isSuccess, error, transactionHash, contractAddress: newContractAddress } = useCreateEventContract(chain?.id);
  const { signContractAsync, isLoading: isSignLoading, isSuccess: isSignSuccess, error: signError, transactionHash: signTxHash } = useSignEventContract();
  const { addTicketTypeAsync } = useAddTicketType();
  const [ticketRowsToAdd, setTicketRowsToAdd] = useState<TicketRow[]>([]);

  // State setters object for backend functions
  const stateSetters = {
    setIsContractCreating,
    setCreationError,
    setIsUploading,
    setTicketRowsToAdd,
    setPendingSign,
  };

  const handleSave = () => handleSaveContract(
    isConnected,
    chain?.id,
    contractSectionRef,
    party1,
    party2,
    stateSetters,
    createEventContract
  );

  const handleSign = () => handleSignContract(
    isConnected,
    chain?.id,
    contractSectionRef,
    party1,
    party2,
    stateSetters,
    createEventContract
  );

  // Handle successful creation
  useEffect(() => {
    const processContractCreation = async () => {
      if (isSuccess && newContractAddress) {
        try {
          await addTicketsToContract(newContractAddress, ticketRowsToAdd, addTicketTypeAsync);

          setIsContractCreating(false);

          // If pendingSign is true, automatically sign after creation and adding tickets
          if (pendingSign) {
            setIsSigning(true);
            await signContractAsync(newContractAddress, party1);
          } else {
            alert("Contract saved as draft on blockchain!");
            router.push("/dashboard");
          }
        } catch (err) {
          setCreationError(err instanceof Error ? err.message : "Failed to process contract");
          setIsContractCreating(false);
          setIsSigning(false);
          setPendingSign(false);
        }
      }
    };

    processContractCreation();
  }, [isSuccess, newContractAddress]);

  // Handle successful signing
  useEffect(() => {
    if (isSignSuccess) {
      setIsSigning(false);
      setPendingSign(false);
      alert("Contract signed successfully on blockchain!");
      router.push("/dashboard");
    }
  }, [isSignSuccess]);

  // Handle create error
  useEffect(() => {
    if (error) {
      setCreationError(error.message || "Transaction failed");
      setIsContractCreating(false);
      setPendingSign(false);
    }
  }, [error]);

  // Handle sign error
  useEffect(() => {
    if (signError) {
      setCreationError(signError.message || "Signing failed");
      setIsSigning(false);
      setPendingSign(false);
    }
  }, [signError]);

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
              <ContractChat />
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
                    <label className={styles.ticketsLabel}>Party 1 (Username)</label>
                    <div className={styles.inputRow}>
                      <input
                        type="text"
                        onChange={(e) => setParty1(e.target.value)}
                        placeholder="Your username"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.ticketInputWrapper}>
                    <label className={styles.ticketsLabel}>Party 2 (Wallet Address)</label>
                    <div className={styles.inputRow}>
                      <input
                        type="text"
                        onChange={(e) => setParty2(e.target.value)}
                        placeholder="0x..."
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
                {creationError && (
                  <div style={{ color: "red", marginTop: "10px" }}>
                    {creationError}
                  </div>
                )}
                {!isConnected && (
                  <div style={{ color: "orange", marginTop: "10px" }}>
                    Please connect your wallet to save contracts
                  </div>
                )}
                {(transactionHash || signTxHash) && (
                  <div style={{ color: "green", marginTop: "10px", fontSize: "12px" }}>
                    Transaction: {(signTxHash || transactionHash)?.slice(0, 10)}...{(signTxHash || transactionHash)?.slice(-8)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isContractCreating || isLoading || isSigning || isSignLoading || isUploading || !isConnected}
                  className={styles.confirmButton}
                >
                  {isUploading ? "Uploading Image..." : isContractCreating || isLoading ? "Saving Draft..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning || isSignLoading || isContractCreating || isLoading || isUploading || !isConnected}
                  className={styles.documentButton}
                >
                  {isUploading ? "Uploading Image..." : isSigning || isSignLoading ? "Signing..." : "Sign"}
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
