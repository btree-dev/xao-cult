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
import { useAddTicketType, useAddTierToXAOTicket, dollarToWei, dateTimeToTimestamp } from "../../hooks/useAddTicketType";
import { useWeb3 } from "../../hooks/useWeb3";
import { useReadContract } from "wagmi";
import { SHOW_CONTRACT_ABI } from "../../lib/web3/eventcontract";
import { readContract } from "@wagmi/core";
import { config } from "../../wagmi";
import { useXMTPConversation } from "../../hooks/useXMTPConversation";
import { ContractProposalMessage } from "../../types/contractMessage";
import { handleSaveContract, handleSignContract, addTicketsToContract, handleImageUpload, deleteProposalImageGroup } from "../../backend/contract-services/createContract";
import { TicketRow } from "./TicketsSection";

// ── Toggle this to enable/disable dummy party values ──
const ENABLE_DUMMY_DATA = true;

const CreateContract = () => {
  const router = useRouter();
  const { peer: peerParam } = router.query;

  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState(ENABLE_DUMMY_DATA ? "TestArtist" : ""); // Username for Party 1
  const [party2, setParty2] = useState(ENABLE_DUMMY_DATA ? "0xc426A5300dCd57D8E448DAEda6FA1b583f36604E" : ""); // Wallet address for Party 2 (peer)
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
  // Track the address of whoever last sent us a proposal (for reply-to logic)
  const [lastProposalSender, setLastProposalSender] = useState<string | null>(null);

  const { address, isConnected, chain } = useWeb3();

  // Contract creation hooks
  const { createEventContract, isLoading, isSuccess, error, transactionHash, contractAddress: newContractAddress } = useCreateEventContract(chain?.id);
  const { signContractAsync, isLoading: isSignLoading, isSuccess: isSignSuccess, error: signError, transactionHash: signTxHash } = useSignEventContract();
  const { addTicketTypeAsync } = useAddTicketType();
  const { addTier } = useAddTierToXAOTicket();
  const [ticketRowsToAdd, setTicketRowsToAdd] = useState<TicketRow[]>([]);

  // Read signing status from on-chain contract (ShowContract uses hasSigned(address) mapping)
  const contractAddr = savedContractAddress as `0x${string}` | undefined;
  const { data: currentUserSigned } = useReadContract({
    address: contractAddr,
    abi: SHOW_CONTRACT_ABI,
    functionName: 'hasSigned',
    args: address ? [address] : undefined,
    query: { enabled: !!contractAddr && !!address },
  });

  // Determine if the current user has already signed
  const hasAlreadySigned = useMemo(() => {
    if (!address || !savedContractAddress) return false;
    return !!currentUserSigned;
  }, [address, savedContractAddress, currentUserSigned]);

  // State setters object for backend functions
  const stateSetters = {
    setIsContractCreating,
    setCreationError,
    setIsUploading,
    setTicketRowsToAdd,
  };

  // Derive XMTP peer address — must always be the OTHER party, never yourself
  // After the first proposal exchange, reply to whoever last sent us a proposal
  const peerAddress = useMemo(() => {
    const myAddr = address?.toLowerCase();
    // If we received a proposal, reply to that sender (not ourselves)
    if (lastProposalSender && lastProposalSender.startsWith('0x') && lastProposalSender.toLowerCase() !== myAddr) {
      return lastProposalSender;
    }
    // For the first message, use party2 (the other party's wallet)
    if (party2 && party2.startsWith('0x') && party2.toLowerCase() !== myAddr) return party2;
    // If party2 is yourself, the other party might be in party1 (if it's a wallet address)
    if (party1 && party1.startsWith('0x') && party1.toLowerCase() !== myAddr) return party1;
    // Fallback to URL param
    return peerParam ? String(peerParam) : null;
  }, [address, party1, party2, peerParam, lastProposalSender]);

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
        if (proposal.proposedBy) setLastProposalSender(proposal.proposedBy);
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
    // Track who sent this proposal so we can reply to them
    if (proposal.proposedBy) setLastProposalSender(proposal.proposedBy);
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
    peerAddress || '',
    stateSetters,
    createEventContract,
    imageUri,
    address as `0x${string}`
  );

  // Handle sign contract (signs an already-created contract)
  const handleSign = async () => {
    setIsSigning(true);
    try {
      await handleSignContract(
        isConnected,
        chain?.id,
        savedContractAddress,
        party1,
        stateSetters,
        signContractAsync,
        contractSectionRef
      );
    } finally {
      setIsSigning(false);
    }
  };

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

  // Handle successful signing — add ticket tiers if contract is now finalized, then notify party2
  useEffect(() => {
    const processSignSuccess = async () => {
      if (isSignSuccess) {
        setIsSigning(false);
        setIsContractCreating(false);

        const contractAddrToShare = savedContractAddress || newContractAddress;

        // After signing, check if XAOTicket was deployed (both parties signed → finalized)
        // If so, add ticket tiers from the form data
        if (contractAddrToShare) {
          try {
            const ticketCollectionAddr = await readContract(config, {
              address: contractAddrToShare as `0x${string}`,
              abi: SHOW_CONTRACT_ABI as any,
              functionName: 'ticketCollection',
            }) as `0x${string}`;

            if (ticketCollectionAddr && ticketCollectionAddr !== '0x0000000000000000000000000000000000000000') {
              console.log("[CreateContract] XAOTicket deployed at:", ticketCollectionAddr);

              // Get ticket rows from form
              const formData = contractSectionRef.current?.getContractData?.();
              const rows: TicketRow[] = formData?.tickets?.ticketRows || ticketRowsToAdd || [];

              // Map ticket type names to enum values
              const nameToEnum = (name: string): number => {
                const lower = name.toLowerCase().trim();
                if (lower === 'comp' || lower === 'complimentary') return 0;
                if (lower === 'presale' || lower === 'pre-sale') return 1;
                if (lower === 'general admission' || lower === 'ga') return 2;
                if (lower === 'vip') return 3;
                return 4; // CUSTOM
              };

              for (const row of rows) {
                if (!row.ticketType || !row.numberOfTickets) continue;
                const ticketTypeEnum = nameToEnum(row.ticketType);
                const customName = ticketTypeEnum === 4 ? row.ticketType : '';
                const priceUSDC = dollarToWei(row.ticketPrice);
                const quantity = BigInt(parseInt(row.numberOfTickets.replace(/,/g, '')) || 0);
                const onSale = row.onSaleDate ? dateTimeToTimestamp(row.onSaleDate) : BigInt(0);

                try {
                  console.log(`[CreateContract] Adding tier: ${row.ticketType}, qty=${quantity}, price=${priceUSDC}`);
                  await addTier(ticketCollectionAddr, {
                    ticketType: ticketTypeEnum,
                    customName,
                    priceUSDC,
                    quantity,
                    onSaleTimestamp: onSale,
                    party1ResaleBPS: BigInt(3333),
                    party2ResaleBPS: BigInt(3333),
                    resellerBPS: BigInt(3334),
                  });
                  console.log(`[CreateContract] Tier added: ${row.ticketType}`);
                } catch (tierErr) {
                  console.warn(`Failed to add tier ${row.ticketType}:`, tierErr);
                }
              }
            }
          } catch (err) {
            console.warn("Failed to add ticket tiers after signing:", err);
          }
        }

        alert(`Contract signed successfully on blockchain!\nContract: ${contractAddrToShare}`);
        router.push("/dashboard");

        // Send XMTP proposal and cleanup in background (non-blocking)
        try {
          deleteProposalImageGroup(contractSectionRef);
        } catch (err) {
          console.warn("Failed to delete proposal image group:", err);
        }

        if (isClientReady && contractAddrToShare && sendProposalRef.current) {
          try {
            const termsObject = contractSectionRef.current?.getContractData
              ? contractSectionRef.current.getContractData()
              : { party1, party2 };

            if (termsObject.promotion) {
              delete termsObject.promotion.imageData;
            }

            termsObject.contractAddress = contractAddrToShare;

            sendProposalRef.current(termsObject, revisionNumber)
              .then(() => {
                setRevisionNumber((prev) => prev + 1);
                console.log("[CreateContract] Sent signed contract proposal to party2");
              })
              .catch((err: any) => {
                console.warn("Failed to send signed proposal to party2:", err);
              });
          } catch (err) {
            console.warn("Failed to prepare signed proposal for party2:", err);
          }
        }
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
                        onChange={(e) => {
                          setParty2(e.target.value);
                          // User manually entered a new party2 address — reset reply-to tracking
                          // so the first proposal goes to this new address
                          setLastProposalSender(null);
                        }}
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
                  disabled={isContractCreating || isLoading || isSigning || isUploading || !isConnected || !!savedContractAddress}
                  className={styles.confirmButton}
                >
                  {isUploading ? "Uploading Image..." : isContractCreating || isLoading ? "Saving Draft..." : savedContractAddress ? "Already Saved" : "Save"}
                </button>

                {/* Sign Button — only enabled after contract is saved as draft and not already signed */}
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning || isContractCreating || isLoading || isUploading || !isConnected || !savedContractAddress || hasAlreadySigned}
                  className={styles.documentButton}
                  style={{
                    opacity: (!savedContractAddress || hasAlreadySigned || !isConnected) ? 0.4 : 1,
                  }}
                >
                  {isSigning ? "Signing..." : hasAlreadySigned ? "Already Signed" : "Sign"}
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
