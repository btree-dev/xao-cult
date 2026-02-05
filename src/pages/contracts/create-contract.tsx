import Head from "next/head";
import { useState, useRef, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/CreateContract.module.css";
import ContractsNav from "../../components/ContractsNav";
import Image from "next/image";
import { useRouter } from "next/router";
import CreateContractsection from "./create-contract-section";
import Scrollbar from "../../components/Scrollbar";
import { ChatComponent } from "../../components/Chat";
import { useMintContractNFT } from "../../hooks/useMintContractNFT";
import { useWeb3 } from "../../hooks/useWeb3";
import { buildMintArgsFromTerms, validateBaseChain } from "../../backend/contracts";
import { useXMTPConversation } from "../../hooks/useXMTPConversation";
import { ContractProposalMessage } from "../../types/contractMessage";

const CreateContract = () => {
  const router = useRouter();
  const { peer: peerParam } = router.query;

  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState("");
  const contractSectionRef = useRef<any>(null);

  // Contract proposal state
  const [activeProposal, setActiveProposal] = useState<ContractProposalMessage | null>(null);
  const [revisionNumber, setRevisionNumber] = useState(1);
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  const { address, isConnected, chain } = useWeb3();

  // Load proposal from sessionStorage if navigating from Chat page
  useEffect(() => {
    // Set party2 from URL param if provided
    if (peerParam && typeof peerParam === "string" && !party2) {
      setParty2(peerParam);
    }

    // Check for stored proposal from Chat page
    const storedProposal = sessionStorage.getItem("selectedContractProposal");
    if (storedProposal) {
      try {
        const proposal = JSON.parse(storedProposal) as ContractProposalMessage;
        console.log("[CreateContract] Loaded proposal from sessionStorage:", proposal);
        setActiveProposal(proposal);
        setRevisionNumber(proposal.revisionNumber + 1);
        if (proposal.data.party1 && !party1) setParty1(proposal.data.party1);
        if (proposal.data.party2 && !party2) setParty2(proposal.data.party2);
        // Clear the stored proposal after loading
        sessionStorage.removeItem("selectedContractProposal");
      } catch (err) {
        console.error("[CreateContract] Failed to parse stored proposal:", err);
        sessionStorage.removeItem("selectedContractProposal");
      }
    }
  }, [peerParam, party1, party2]);
  const { mintNFT, isLoading, isSuccess, error } = useMintContractNFT(chain?.id);

  // XMTP for sending contract proposals
  const { sendContractProposal, isClientReady } = useXMTPConversation({
    peerAddress: party2 || null,
  });

  // Handle receiving a contract proposal from chat
  const handleContractProposalSelect = useCallback((proposal: ContractProposalMessage) => {
    setActiveProposal(proposal);
    setRevisionNumber(proposal.revisionNumber + 1);
    // Pre-fill party addresses from proposal if available
    if (proposal.data.party1 && !party1) setParty1(proposal.data.party1);
    if (proposal.data.party2 && !party2) setParty2(proposal.data.party2);
    // Switch to contract view to show the form
    setSelected("contract");
  }, [party1, party2]);

  // Send contract proposal to Party2
  const handleSendProposal = async () => {
    if (!party2) {
      setMintError("Please enter Party 2 address to send proposal");
      return;
    }

    if (!isClientReady) {
      setMintError("Chat not ready. Please wait...");
      return;
    }

    setIsSendingProposal(true);
    setMintError("");

    try {
      // Get contract data from the form
      const termsObject = contractSectionRef.current?.getContractData
        ? contractSectionRef.current.getContractData()
        : { party1, party2 };

      // Send the proposal
      await sendContractProposal(termsObject, revisionNumber);

      // Update revision number for next edit
      setRevisionNumber((prev) => prev + 1);

      // Clear active proposal since we've sent a new one
      setActiveProposal(null);

      // Switch to chat view to see the sent message
      setSelected("chat");
    } catch (err) {
      console.error("Failed to send proposal:", err);
      setMintError("Failed to send contract proposal");
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleSave = async () => {
    if (!isConnected) {
      setMintError("Please connect your wallet");
      return;
    }

    const chainError = validateBaseChain(chain?.id);
    if (chainError) {
      setMintError(chainError);
      return;
    }

    try {
      setIsMinting(true);
      setMintError("");

      // Gather full contract terms from the section via ref, serialize to JSON
      const termsObject = contractSectionRef.current?.getContractData
        ? contractSectionRef.current.getContractData()
        : { party1, party2 };
      const terms = JSON.stringify(termsObject);

      const { args } = await buildMintArgsFromTerms(party1, party2, terms);
      // Mint NFT using prepared args
      mintNFT(...args);
    } catch (err) {
      setMintError(
        err instanceof Error ? err.message : "Failed to mint contract NFT"
      );
      setIsMinting(false);
    }
  };

  // Handle successful mint
  useEffect(() => {
    if (isSuccess) {
      setIsMinting(false);
      // Show success message and redirect
      alert("Contract NFT minted successfully!");
      router.push("/dashboard");
    }
  }, [isSuccess]);

  // Handle mint error
  useEffect(() => {
    if (error) {
      setMintError(error.message || "Transaction failed");
      setIsMinting(false);
    }
  }, [error]);

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
              <ChatComponent
                peerAddress={party2 || null}
                embedded={true}
                onContractProposalSelect={handleContractProposalSelect}
              />
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
                  initialData={activeProposal?.data}
                />
                {mintError && (
                  <div style={{ color: "red", marginTop: "10px" }}>
                    {mintError}
                  </div>
                )}
                {!isConnected && (
                  <div style={{ color: "orange", marginTop: "10px" }}>
                    Please connect your wallet to save contracts
                  </div>
                )}

                {/* Send Proposal Button */}
                <button
                  type="button"
                  onClick={handleSendProposal}
                  disabled={isSendingProposal || !party2 || !isClientReady}
                  className={styles.documentButton}
                  style={{
                    marginBottom: "10px",
                    opacity: (!party2 || !isClientReady) ? 0.5 : 1,
                  }}
                >
                  {isSendingProposal
                    ? "Sending..."
                    : `Send to Party 2 (Rev. ${revisionNumber})`}
                </button>

                {/* Save/Mint Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isMinting || isLoading || !isConnected}
                  className={styles.confirmButton}
                >
                  {isMinting || isLoading ? "Minting..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className={styles.documentButton}
                >
                  Cancel
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