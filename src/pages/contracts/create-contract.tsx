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
import { useReadContract } from "wagmi";
import { EVENT_CONTRACT_ABI } from "../../lib/web3/eventcontract";
import { useXMTPConversation } from "../../hooks/useXMTPConversation";
import { ContractProposalMessage } from "../../types/contractMessage";
import { handleSaveContract, handleSignContract, addTicketsToContract, handleImageUpload, deleteProposalImageGroup } from "../../backend/contract-services/createContract";
import { TicketRow } from "./TicketsSection";

const CreateContract = () => {
  const router = useRouter();
  const { peer: peerParam } = router.query;

  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState("Pizza dao"); // Username for Party 1
  const [party2, setParty2] = useState(""); // Wallet address for Party 2 (peer)
  const [isContractCreating, setIsContractCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [creationError, setCreationError] = useState("");
  const contractSectionRef = useRef<any>(null);

  // Contract proposal state (XMTP)
  const [activeProposal, setActiveProposal] = useState<ContractProposalMessage | null>(null);
  const [revisionNumber, setRevisionNumber] = useState(1);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [savedContractAddress, setSavedContractAddress] = useState<string | null>(null);

  const { address, isConnected, chain } = useWeb3();

  // Contract creation hooks
  const { createEventContract, isLoading, isSuccess, error, transactionHash, contractAddress: newContractAddress } = useCreateEventContract(chain?.id);
  const { signContractAsync, isLoading: isSignLoading, isSuccess: isSignSuccess, error: signError, transactionHash: signTxHash } = useSignEventContract();
  const { addTicketTypeAsync } = useAddTicketType();
  const [ticketRowsToAdd, setTicketRowsToAdd] = useState<TicketRow[]>([]);

  // Read signing status from on-chain contract (when contract address exists)
  const contractAddr = savedContractAddress as `0x${string}` | undefined;
  const { data: p1Signed } = useReadContract({
    address: contractAddr,
    abi: EVENT_CONTRACT_ABI,
    functionName: 'p1Signed',
    query: { enabled: !!contractAddr },
  });
  const { data: p2Signed } = useReadContract({
    address: contractAddr,
    abi: EVENT_CONTRACT_ABI,
    functionName: 'p2Signed',
    query: { enabled: !!contractAddr },
  });
  const { data: onChainParty1 } = useReadContract({
    address: contractAddr,
    abi: EVENT_CONTRACT_ABI,
    functionName: 'party1',
    query: { enabled: !!contractAddr },
  });
  const { data: onChainParty2 } = useReadContract({
    address: contractAddr,
    abi: EVENT_CONTRACT_ABI,
    functionName: 'party2',
    query: { enabled: !!contractAddr },
  });

  // Determine if the current user has already signed
  const hasAlreadySigned = useMemo(() => {
    if (!address || !savedContractAddress) return false;
    const p1Addr = (onChainParty1 as any)?.addr || (onChainParty1 as any)?.[0];
    const p2Addr = (onChainParty2 as any)?.addr || (onChainParty2 as any)?.[0];
    if (address.toLowerCase() === p1Addr?.toLowerCase() && p1Signed) return true;
    if (address.toLowerCase() === p2Addr?.toLowerCase() && p2Signed) return true;
    return false;
  }, [address, savedContractAddress, onChainParty1, onChainParty2, p1Signed, p2Signed]);

  // State setters object for backend functions
  const stateSetters = {
    setIsContractCreating,
    setCreationError,
    setIsUploading,
    setTicketRowsToAdd,
  };

  // Derive XMTP peer address — must always be the OTHER party, never yourself
  const peerAddress = useMemo(() => {
    const myAddr = address?.toLowerCase();
    // Try party2 first (most common: party2 is the other party's wallet)
    if (party2 && party2.startsWith('0x') && party2.toLowerCase() !== myAddr) return party2;
    // If party2 is yourself, the other party might be in party1 (if it's a wallet address)
    if (party1 && party1.startsWith('0x') && party1.toLowerCase() !== myAddr) return party1;
    // Fallback to URL param
    return peerParam ? String(peerParam) : null;
  }, [address, party1, party2, peerParam]);

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
        if (proposal.data.party1) setParty1(proposal.data.party1);
        if (proposal.data.party2) setParty2(proposal.data.party2);
        if (proposal.data.contractAddress) setSavedContractAddress(proposal.data.contractAddress);
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

  // Keep a ref to the latest sendContractProposal so useEffect closures always use the current version
  const sendProposalRef = useRef(sendContractProposal);
  useEffect(() => {
    sendProposalRef.current = sendContractProposal;
  }, [sendContractProposal]);

  // Handle receiving a contract proposal from chat
  const handleContractProposalSelect = useCallback((proposal: ContractProposalMessage) => {
    setActiveProposal(proposal);
    setRevisionNumber(proposal.revisionNumber + 1);
    // Pre-fill party addresses from proposal if available
    if (proposal.data.party1) setParty1(proposal.data.party1);
    if (proposal.data.party2) setParty2(proposal.data.party2);
    if (proposal.data.contractAddress) setSavedContractAddress(proposal.data.contractAddress);
    // Switch to contract view to show the form
    setSelected("contract");
  }, []);

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

      // Upload image to IPFS via Pinata (or reuse existing URI)
      await handleImageUpload(termsObject, setIsUploading, imageUri);
      // Store the uploaded URI for reuse in save/sign
      if (termsObject.eventImageUri) {
        setImageUri(termsObject.eventImageUri);
      }

      // Remove base64 imageData before sending over XMTP
      if (termsObject.promotion) {
        delete termsObject.promotion.imageData;
      }

      // Include contract address if contract was already created on-chain
      if (savedContractAddress) {
        termsObject.contractAddress = savedContractAddress;
      }

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
    createEventContract,
    imageUri
  );

  // Handle sign contract (signs an already-created contract)
  const handleSign = () => handleSignContract(
    isConnected,
    chain?.id,
    savedContractAddress,
    party1,
    stateSetters,
    signContractAsync,
    contractSectionRef
  );

  // Handle successful contract creation (Save/Draft only)
  useEffect(() => {
    const processContractCreation = async () => {
      if (isSuccess && newContractAddress) {
        try {
          // Store the created contract address
          setSavedContractAddress(newContractAddress);

          // Add tickets while contract is still in Draft status
          // (addTicketType requires inDraft modifier on the smart contract)
          await addTicketsToContract(newContractAddress, ticketRowsToAdd, addTicketTypeAsync);

          setIsContractCreating(false);

          // Send proposal with contract address to party2 via XMTP
          // Use sendProposalRef.current to avoid stale closure capturing an old sendContractProposal
          if (isClientReady && sendProposalRef.current) {
            try {
              const termsObject = contractSectionRef.current?.getContractData
                ? contractSectionRef.current.getContractData()
                : { party1, party2 };

              // Remove base64 imageData before sending over XMTP
              if (termsObject.promotion) {
                delete termsObject.promotion.imageData;
              }

              // Include the created contract address
              termsObject.contractAddress = newContractAddress;

              await sendProposalRef.current(termsObject, revisionNumber);
              setRevisionNumber((prev) => prev + 1);
              console.log("[CreateContract] Sent draft contract proposal with address to party2");
            } catch (err) {
              console.warn("Failed to send draft proposal to party2:", err);
            }
          }

          alert(`Contract saved as draft on blockchain!\nContract: ${newContractAddress}`);
        } catch (err) {
          setCreationError(err instanceof Error ? err.message : "Failed to process contract");
          setIsContractCreating(false);
        }
      }
    };

    processContractCreation();
  }, [isSuccess, newContractAddress]);

  // Handle successful signing — send proposal to party2 via XMTP so they can sign
  useEffect(() => {
    const processSignSuccess = async () => {
      if (isSignSuccess) {
        setIsSigning(false);
        setIsContractCreating(false);

        // Delete proposal image group from Pinata (cleanup + re-upload to XAO)
        deleteProposalImageGroup(contractSectionRef);

        // Send proposal with contract address to party2 via XMTP
        // Use sendProposalRef.current to avoid stale closure
        const contractAddrToShare = savedContractAddress || newContractAddress;
        if (isClientReady && contractAddrToShare && sendProposalRef.current) {
          try {
            const termsObject = contractSectionRef.current?.getContractData
              ? contractSectionRef.current.getContractData()
              : { party1, party2 };

            // Remove base64 imageData before sending over XMTP
            if (termsObject.promotion) {
              delete termsObject.promotion.imageData;
            }

            // Include the contract address so party2 can sign the same contract
            termsObject.contractAddress = contractAddrToShare;

            await sendProposalRef.current(termsObject, revisionNumber);
            setRevisionNumber((prev) => prev + 1);
            console.log("[CreateContract] Sent signed contract proposal to party2");
          } catch (err) {
            console.warn("Failed to send signed proposal to party2:", err);
          }
        }

        alert(`Contract signed successfully on blockchain!\nContract: ${contractAddrToShare}`);
        router.push("/dashboard");
      }
    };

    processSignSuccess();
  }, [isSignSuccess]);

  // Handle create error
  useEffect(() => {
    if (error) {
      setCreationError(error.message || "Transaction failed");
      setIsContractCreating(false);
    }
  }, [error]);

  // Handle sign error
  useEffect(() => {
    if (signError) {
      setCreationError(signError.message || "Signing failed");
      setIsSigning(false);
      setIsContractCreating(false);
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

                {/* Contract already exists notice */}
                {savedContractAddress && (
                  <div style={{ color: "#ff9900", marginTop: "10px", fontSize: "13px" }}>
                    Contract already created: {savedContractAddress.slice(0, 10)}...{savedContractAddress.slice(-8)}
                  </div>
                )}

                {/* Save/Draft Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isContractCreating || isLoading || isSigning || isSignLoading || isUploading || !isConnected || !!savedContractAddress}
                  className={styles.confirmButton}
                >
                  {isUploading ? "Uploading Image..." : isContractCreating || isLoading ? "Saving Draft..." : savedContractAddress ? "Already Saved" : "Save"}
                </button>

                {/* Sign Button — only enabled after contract is saved as draft and not already signed */}
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning || isSignLoading || isContractCreating || isLoading || isUploading || !isConnected || !savedContractAddress || hasAlreadySigned}
                  className={styles.documentButton}
                  style={{
                    opacity: (!savedContractAddress || hasAlreadySigned || !isConnected) ? 0.4 : 1,
                  }}
                >
                  {isSigning || isSignLoading ? "Signing..." : hasAlreadySigned ? "Already Signed" : "Sign"}
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
