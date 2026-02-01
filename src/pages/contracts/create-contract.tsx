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
import { useAddTicketType, dateTimeToTimestamp, dollarToWei, parseFormattedNumber } from "../../hooks/useAddTicketType";
import { useWeb3 } from "../../hooks/useWeb3";
import { validateBaseChain } from "../../backend/contracts";
import { buildContractParams, validateContractParams } from "../../backend/contract-services/contractHelpers";
import { TicketRow } from "./TicketsSection";

// Helper function to upload image to IPFS via Pinata
const uploadImageToIPFS = async (imageData: string, filename?: string): Promise<string> => {
  console.log('=== UPLOADING IMAGE TO IPFS ===');
  console.log('Filename:', filename);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData,
      filename: filename || 'contract-image.jpg',
    }),
  });

  const result = await response.json();
  console.log('IPFS Upload Result:', result);

  if (!result.success) {
    throw new Error(result.error || 'Failed to upload image to IPFS');
  }

  console.log('IPFS URL:', result.url);
  console.log('IPFS Hash:', result.ipfsHash);
  return result.url;
};

const CreateContract = () => {
  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mintError, setMintError] = useState("");
  const [pendingSign, setPendingSign] = useState(false);
  const contractSectionRef = useRef<any>(null);

  const { address, isConnected, chain } = useWeb3();
  const { createEventContract, isLoading, isSuccess, error, transactionHash, contractAddress: newContractAddress } = useCreateEventContract(chain?.id);
  const { signContractAsync, isLoading: isSignLoading, isSuccess: isSignSuccess, error: signError, transactionHash: signTxHash } = useSignEventContract();
  const { addTicketTypeAsync } = useAddTicketType();
  const [ticketRowsToAdd, setTicketRowsToAdd] = useState<TicketRow[]>([]);

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

      // Gather full contract terms from the section via ref
      const formData = contractSectionRef.current?.getContractData
        ? contractSectionRef.current.getContractData()
        : { party1, party2 };

      // Add party addresses to form data
      formData.party1 = party1;
      formData.party2 = party2;

      // Upload image to FTP if available
      if (formData.promotion?.imageData) {
        setIsUploading(true);
        try {
          const imageUrl = await uploadImageToIPFS(
            formData.promotion.imageData,
            formData.promotion.imageFile?.name
          );
          formData.eventImageUri = imageUrl;
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing without image:', uploadErr);
          formData.eventImageUri = '';
        }
        setIsUploading(false);
      }

      // Store ticket rows for later blockchain calls
      const tickets = formData.tickets?.ticketRows || [];
      setTicketRowsToAdd(tickets);

      // Build the contract params for the blockchain
      const params = buildContractParams(formData, party1);

      // Console log all data being saved to chain
      console.log('=== CONTRACT DATA BEING SAVED TO CHAIN ===');
      console.log('--- PARTIES ---');
      console.log('Party 1 Username:', party1);
      console.log('Party 2 Address:', party2);
      console.log('--- DATES & TIMES ---');
      console.log('Event Announcement Date:', formData.datesAndTimes?.eventAnnouncementDate);
      console.log('Event Start Date:', formData.datesAndTimes?.eventStartDate);
      console.log('Event End Date:', formData.datesAndTimes?.eventEndDate);
      console.log('Load In:', formData.datesAndTimes?.loadIn);
      console.log('Doors:', formData.datesAndTimes?.doors);
      console.log('Start Time:', formData.datesAndTimes?.startTime);
      console.log('End Time:', formData.datesAndTimes?.endTime);
      console.log('Set Time:', formData.datesAndTimes?.setTime);
      console.log('Set Length:', formData.datesAndTimes?.setLength);
      console.log('--- LOCATION ---');
      console.log('Venue Name:', formData.location?.venueName);
      console.log('Address:', formData.location?.address);
      console.log('Radius Distance:', formData.location?.radiusDistance);
      console.log('Days:', formData.location?.days);
      console.log('--- TICKETS ---');
      console.log('Total Capacity:', formData.tickets?.totalCapacity);
      console.log('Sales Tax:', formData.tickets?.salesTax);
      console.log('Ticket Rows:', tickets);
      console.log('--- RESALE RULES ---');
      console.log('Party 1 Resale %:', formData.tickets?.resale?.party1);
      console.log('Party 2 Resale %:', formData.tickets?.resale?.party2);
      console.log('Reseller Resale %:', formData.tickets?.resale?.reseller);
      console.log('--- MONEY ---');
      console.log('Guarantee:', formData.money?.guaranteeInput);
      console.log('Backend %:', formData.money?.backendInput);
      console.log('Bar Split %:', formData.money?.barsplitInput);
      console.log('Merch Split %:', formData.money?.merchSplitInput);
      console.log('--- PROMOTION ---');
      console.log('Event Name:', formData.promotion?.value);
      console.log('Genres:', formData.promotion?.genres);
      console.log('Event Image URI:', formData.eventImageUri);
      console.log('--- RIDER ---');
      console.log('Rider:', formData.rider?.rows);
      console.log('--- LEGAL ---');
      console.log('Legal Agreement:', formData.legalAgreement);
      console.log('--- BLOCKCHAIN PARAMS ---');
      console.log('Contract Params:', params);
      console.log('==========================================');

      // Validate params
      const validationError = validateContractParams(params);
      if (validationError) {
        setMintError(validationError);
        setIsMinting(false);
        return;
      }

      // Create the event contract on blockchain
      createEventContract(params);
    } catch (err) {
      setMintError(
        err instanceof Error ? err.message : "Failed to create contract"
      );
      setIsMinting(false);
      setIsUploading(false);
    }
  };

  // Handle successful creation (Save - draft only)
  useEffect(() => {
    const processContractCreation = async () => {
      if (isSuccess && newContractAddress) {
        try {
          // Add ticket types to the contract
          if (ticketRowsToAdd.length > 0) {
            for (const ticketRow of ticketRowsToAdd) {
              if (ticketRow.ticketType && ticketRow.numberOfTickets) {
                await addTicketTypeAsync(newContractAddress, {
                  ticketTypeName: ticketRow.ticketType,
                  onSaleDate: dateTimeToTimestamp(ticketRow.onSaleDate),
                  numberOfTickets: parseFormattedNumber(ticketRow.numberOfTickets),
                  ticketPrice: dollarToWei(ticketRow.ticketPrice),
                });
              }
            }
          }

          setIsMinting(false);

          // If pendingSign is true, automatically sign after creation and adding tickets
          if (pendingSign) {
            setIsSigning(true);
            await signContractAsync(newContractAddress, party1);
          } else {
            alert("Contract saved as draft on blockchain!");
            router.push("/dashboard");
          }
        } catch (err) {
          setMintError(err instanceof Error ? err.message : "Failed to process contract");
          setIsMinting(false);
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
      setMintError(error.message || "Transaction failed");
      setIsMinting(false);
      setPendingSign(false);
    }
  }, [error]);

  // Handle sign error
  useEffect(() => {
    if (signError) {
      setMintError(signError.message || "Signing failed");
      setIsSigning(false);
      setPendingSign(false);
    }
  }, [signError]);

  const handleSign = async () => {
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

      // Gather full contract terms from the section via ref
      const formData = contractSectionRef.current?.getContractData
        ? contractSectionRef.current.getContractData()
        : { party1, party2 };

      // Add party addresses to form data
      formData.party1 = party1;
      formData.party2 = party2;

      // Upload image to FTP if available
      if (formData.promotion?.imageData) {
        setIsUploading(true);
        try {
          const imageUrl = await uploadImageToIPFS(
            formData.promotion.imageData,
            formData.promotion.imageFile?.name
          );
          formData.eventImageUri = imageUrl;
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing without image:', uploadErr);
          formData.eventImageUri = '';
        }
        setIsUploading(false);
      }

      // Store ticket rows for later blockchain calls
      const tickets = formData.tickets?.ticketRows || [];
      setTicketRowsToAdd(tickets);

      // Build the contract params for the blockchain
      const params = buildContractParams(formData, party1);

      // Console log all data being saved to chain (Sign)
      console.log('=== CONTRACT DATA BEING SIGNED TO CHAIN ===');
      console.log('--- PARTIES ---');
      console.log('Party 1 Username:', party1);
      console.log('Party 2 Address:', party2);
      console.log('--- DATES & TIMES ---');
      console.log('Event Announcement Date:', formData.datesAndTimes?.eventAnnouncementDate);
      console.log('Event Start Date:', formData.datesAndTimes?.eventStartDate);
      console.log('Event End Date:', formData.datesAndTimes?.eventEndDate);
      console.log('Load In:', formData.datesAndTimes?.loadIn);
      console.log('Doors:', formData.datesAndTimes?.doors);
      console.log('Start Time:', formData.datesAndTimes?.startTime);
      console.log('End Time:', formData.datesAndTimes?.endTime);
      console.log('Set Time:', formData.datesAndTimes?.setTime);
      console.log('Set Length:', formData.datesAndTimes?.setLength);
      console.log('--- LOCATION ---');
      console.log('Venue Name:', formData.location?.venueName);
      console.log('Address:', formData.location?.address);
      console.log('Radius Distance:', formData.location?.radiusDistance);
      console.log('Days:', formData.location?.days);
      console.log('--- TICKETS ---');
      console.log('Total Capacity:', formData.tickets?.totalCapacity);
      console.log('Sales Tax:', formData.tickets?.salesTax);
      console.log('Ticket Rows:', tickets);
      console.log('--- RESALE RULES ---');
      console.log('Party 1 Resale %:', formData.tickets?.resale?.party1);
      console.log('Party 2 Resale %:', formData.tickets?.resale?.party2);
      console.log('Reseller Resale %:', formData.tickets?.resale?.reseller);
      console.log('--- MONEY ---');
      console.log('Guarantee:', formData.money?.guaranteeInput);
      console.log('Backend %:', formData.money?.backendInput);
      console.log('Bar Split %:', formData.money?.barsplitInput);
      console.log('Merch Split %:', formData.money?.merchSplitInput);
      console.log('--- PROMOTION ---');
      console.log('Event Name:', formData.promotion?.value);
      console.log('Genres:', formData.promotion?.genres);
      console.log('Event Image URI:', formData.eventImageUri);
      console.log('--- RIDER ---');
      console.log('Rider:', formData.rider?.rows);
      console.log('--- LEGAL ---');
      console.log('Legal Agreement:', formData.legalAgreement);
      console.log('--- BLOCKCHAIN PARAMS ---');
      console.log('Contract Params:', params);
      console.log('============================================');

      // Validate params
      const validationError = validateContractParams(params);
      if (validationError) {
        setMintError(validationError);
        setIsMinting(false);
        return;
      }

      // Set pendingSign flag so we sign after creation
      setPendingSign(true);

      // Create the event contract on blockchain (will auto-sign after creation)
      createEventContract(params);
    } catch (err) {
      setMintError(
        err instanceof Error ? err.message : "Failed to create and sign contract"
      );
      setIsMinting(false);
      setIsUploading(false);
      setPendingSign(false);
    }
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
                {(transactionHash || signTxHash) && (
                  <div style={{ color: "green", marginTop: "10px", fontSize: "12px" }}>
                    Transaction: {(signTxHash || transactionHash)?.slice(0, 10)}...{(signTxHash || transactionHash)?.slice(-8)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isMinting || isLoading || isSigning || isSignLoading || isUploading || !isConnected}
                  className={styles.confirmButton}
                >
                  {isUploading ? "Uploading Image..." : isMinting || isLoading ? "Saving Draft..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning || isSignLoading || isMinting || isLoading || isUploading || !isConnected}
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
