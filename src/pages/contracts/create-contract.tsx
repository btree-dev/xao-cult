import Head from "next/head";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/CreateContract.module.css";
import ContractsNav from "../../components/ContractsNav";
import Image from "next/image";
import { useRouter } from "next/router";
import CreateContractsection from "./create-contract-section";
import Scrollbar from "../../components/Scrollbar";
import { ChatComponent } from "../../components/Chat";
import { useCreateEventContract } from "../../hooks/useCreateContract";
import { useSignEventContract } from "../../hooks/useSignEventContract";
import { useAddTicketType } from "../../hooks/useAddTicketType";
import { useWeb3 } from "../../hooks/useWeb3";
import { useXMTPConversation } from "../../hooks/useXMTPConversation";
import { ContractProposalMessage } from "../../types/contractMessage";
import { handleSaveContract, handleSignContract, addTicketsToContract } from "../../backend/contract-services/createContract";
import { TicketRow } from "./TicketsSection";

const CreateContract = () => {
  const router = useRouter();
  const { peer: peerParam } = router.query;

  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState(""); // Username for Party 1
  const [party2, setParty2] = useState(""); // Wallet address for Party 2 (peer)
  const [isContractCreating, setIsContractCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [creationError, setCreationError] = useState("");
  const [pendingSign, setPendingSign] = useState(false);
  const contractSectionRef = useRef<any>(null);

  // Contract proposal state (XMTP)
  const [activeProposal, setActiveProposal] = useState<ContractProposalMessage | null>(null);
  const [revisionNumber, setRevisionNumber] = useState(1);
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  const { address, isConnected, chain } = useWeb3();

  // Contract creation hooks
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

  // Derive XMTP peer: party2 is always the peer (since party1 is the current user's username)
  // The connected wallet address is party1's wallet, so party2 is the peer to chat with
  const peerAddress = useMemo(() => {
    // If party2 wallet address is set, use it as the peer
    if (party2 && party2.startsWith('0x')) return party2;
    // Fallback to URL param
    return peerParam ? String(peerParam) : null;
  }, [party2, peerParam]);

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

  // XMTP for sending contract proposals
  const { sendContractProposal, isClientReady } = useXMTPConversation({
    peerAddress,
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

  // Send contract proposal to Party2 via XMTP
  const handleSendProposal = async () => {
    if (!peerAddress) {
      setCreationError("Please enter both party addresses (one must match your wallet)");
      return;
    }

    if (!isClientReady) {
      setCreationError("Chat not ready. Please wait...");
      return;
    }

    setIsSendingProposal(true);
    setCreationError("");

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
      setCreationError("Failed to send contract proposal");
    } finally {
      setIsSendingProposal(false);
    }
  };

  // Handle save contract (draft) using helper function
  const handleSave = () => handleSaveContract(
    isConnected,
    chain?.id,
    contractSectionRef,
    party1,
    party2,
    stateSetters,
    createEventContract
  );

  // Handle sign contract using helper function
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
              <ChatComponent
                peerAddress={peerAddress}
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
                        value={party1}
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
                        value={party2}
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

                {/* Send Proposal Button (XMTP) */}
                <button
                  type="button"
                  onClick={handleSendProposal}
                  disabled={isSendingProposal || !peerAddress || !isClientReady}
                  className={styles.documentButton}
                  style={{
                    marginBottom: "10px",
                    opacity: (!peerAddress || !isClientReady) ? 0.5 : 1,
                  }}
                >
                  {isSendingProposal
                    ? "Sending..."
                    : `Send to ${peerAddress === party1 ? "Party 1" : peerAddress === party2 ? "Party 2" : "Peer"} (Rev. ${revisionNumber})`}
                </button>

                {/* Save/Draft Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isContractCreating || isLoading || isSigning || isSignLoading || isUploading || !isConnected}
                  className={styles.confirmButton}
                >
                  {isUploading ? "Uploading Image..." : isContractCreating || isLoading ? "Saving Draft..." : "Save"}
                </button>

                {/* Sign Button */}
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
