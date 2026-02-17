import React, { useState } from "react";
import Head from "next/head";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import {
  AttentionList,
  WaitingList,
} from "../../backend/contract-services/negotiation";
import { currentcontracts } from "../../backend/contract-services/currentcontract";
import CreateContractsection from "./create-contract-section";
import { useRouter } from "next/router";
import Scrollbar from "../../components/Scrollbar";
import BlankNavbar from "../../components/BackNav";
import { useWeb3 } from "../../hooks/useWeb3";
import { useAllContractsWithSummaries } from "../../hooks/useGetContracts";
import { useSignEventContract } from "../../hooks/useSignEventContract";
import { useAddTicketType, dollarToWei } from "../../hooks/useAddTicketType";

const Contractsdetail: React.FC = () => {
  const [signing, setSigning] = useState(false);
  const [addingTicket, setAddingTicket] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCount, setTicketCount] = useState("");
  const router = useRouter();
  const { address, chain } = useWeb3();
  const { contracts } = useAllContractsWithSummaries(chain?.id);
  const { id, ticketsold, totalrevenue, source, party1, party2 } = router.query;
  const { signContractAsync, isLoading } = useSignEventContract();
  const { addTicketTypeAsync, isLoading: isAddingTicket } = useAddTicketType();

  // Find contract from appropriate data source based on source parameter
  let eventDetail;

  // Check if this is a blockchain contract (ID starts with 0x)
  if (id && typeof id === "string" && id.startsWith("0x")) {
    // Find blockchain contract by address
    eventDetail = contracts.find((contract) => contract.contractAddress === id);
  } else if (source === "negotiation") {
    // Combine AttentionList and WaitingList and find matching contract
    const allNegotiationContracts = [...AttentionList, ...WaitingList];
    eventDetail = allNegotiationContracts.find(
      (contract) => String(contract.id) === String(id),
    );
  } else if (source === "current") {
    eventDetail = currentcontracts.find(
      (contract) => String(contract.id) === String(id),
    );
  }

  const handleArbitrateClick = () => {
    router.push("/contracts/arbitrate");
  };

  // Check if current user is authorized (matches party1 or party2)
  const isUserAuthorized = () => {
    if (!address || !party1 || !party2) return false;
    const party1Str = party1 as string;
    const party2Str = party2 as string;
    return address.toLowerCase() === party1Str.toLowerCase() || 
           address.toLowerCase() === party2Str.toLowerCase();
  };

  const handleAddTicketType = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!id || typeof id !== "string") {
      alert("Invalid contract ID");
      return;
    }

    if (!isUserAuthorized()) {
      alert("You are not authorized to add ticket types to this contract");
      return;
    }

    if (!ticketName.trim() || !ticketPrice.trim() || !ticketCount.trim()) {
      alert("Please fill in all ticket fields");
      return;
    }

    try {
      setAddingTicket(true);
      console.log("=== ADDING TICKET TYPE ===");
      console.log("Contract Address:", id);
      console.log("Ticket Name:", ticketName.trim());
      console.log("Ticket Price:", ticketPrice.trim());
      console.log("Ticket Count:", ticketCount.trim());

      // Use the custom hook with proper parameter formatting
      await addTicketTypeAsync(id as `0x${string}`, {
        ticketTypeName: ticketName.trim(),
        onSaleDate: BigInt(Math.floor(Date.now() / 1000)), // Current timestamp
        numberOfTickets: BigInt(parseInt(ticketCount) || 0),
        ticketPrice: dollarToWei(ticketPrice),
        isFree: false, // Not a free ticket
      });

      alert("Ticket type added successfully!");
      // Reset form
      setTicketName("");
      setTicketPrice("");
      setTicketCount("");
      setAddingTicket(false);
    } catch (error) {
      console.error("Error adding ticket type:", error);
      alert("Failed to add ticket type. Please try again.");
      setAddingTicket(false);
    }
  };

  const handleSignContract = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!id || typeof id !== "string") {
      alert("Invalid contract ID");
      return;
    }

    if (!party1 || !party1.trim()) {
      alert("Please enter Party1 name");
      return;
    }

    try {
      setSigning(true);
      console.log("=== SIGNING CONTRACT ===");
      console.log("Contract Address:", id);
      console.log("Username:", party1.trim());
      console.log("User Address:", address);

      await signContractAsync(id as `0x${string}`, (party2 as string).trim());

      alert("Contract signed successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error signing contract:", error);
      alert("Failed to sign contract. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  const renderButtons = () => {
    // For blockchain contracts, show signing functionality
    if (id && typeof id === "string" && id.startsWith("0x")) {
      return (
        <div className={styles.contractRow}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.push("/dashboard")}
          >
            Back
          </button>
          {!address ? (
            <button type="button" className={styles.arbitrateButton} disabled>
              Connect Wallet to Sign
            </button>
          ) : (
            <button
              type="button"
              className={styles.arbitrateButton}
              onClick={handleSignContract}
              disabled={signing || isLoading}
            >
              {signing || isLoading ? "Signing..." : "Sign Contract"}
            </button>
          )}
          {isUserAuthorized() && (
            <button
              type="button"
              className={styles.arbitrateButton}
              onClick={() => setAddingTicket(!addingTicket)}
              style={{ marginLeft: "10px" }}
            >
              {addingTicket ? "Cancel" : "Add Ticket Type"}
            </button>
          )}
        </div>
      );
    }

    // Original logic for mock data contracts
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
        <BlankNavbar pageTitle="Contract Details" />

        <Scrollbar />
        <main className={styles.contractDetailcontainer}>
          {eventDetail && (
            <div className={styles.ImageContainer}>
              <img
                src={
                  // Use blockchain contract image if available, otherwise mock data
                  "eventImageUri" in eventDetail
                    ? eventDetail.eventImageUri
                    : "image" in eventDetail
                      ? eventDetail.image
                      : "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"
                }
                alt={
                  "eventImageUri" in eventDetail
                    ? eventDetail.eventName
                    : "title" in eventDetail
                      ? eventDetail.title
                      : "Contract"
                }
                className={styles.currentcontractImage}
              />
              <div className={styles.currentcontractdetailTop}>
                <h2 className={styles.promotionTitle}>
                  {"eventImageUri" in eventDetail
                    ? eventDetail.eventName
                    : "title" in eventDetail
                      ? eventDetail.title
                      : "Contract"}
                </h2>
                <span className={styles.promotionLocation}>
                  <img
                    src="/Map_Pin.svg"
                    alt="Location"
                    className={styles.promotionIcon}
                  />
                  {"eventImageUri" in eventDetail
                    ? eventDetail.venueName
                    : "Location" in eventDetail
                      ? eventDetail.Location
                      : "Unknown Location"}
                </span>
                <span className={styles.promotionDate}>
                  <img
                    src="/Calendar_Days.svg"
                    alt="Date"
                    className={styles.promotionIcon}
                  />
                  {"eventImageUri" in eventDetail
                    ? eventDetail.showDate
                    : "Date" in eventDetail
                      ? eventDetail.Date
                      : "Unknown Date"}
                </span>

                <span className={styles.promotionRevenue}>
                  Tickets Sold: {ticketsold}
                </span>

                <span className={styles.promotionRevenue}>
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
              value={
                id && typeof id === "string" && id.startsWith("0x")
                  ? party1
                  : address
              }
              readOnly={
                id && typeof id === "string" && id.startsWith("0x") && Boolean(party1)
              }
              style={{
                backgroundColor:
                  id &&
                  typeof id === "string" &&
                  id.startsWith("0x") &&
                  Boolean(party1)
                    ? "#000"
                    : "white",
                cursor:
                  id &&
                  typeof id === "string" &&
                  id.startsWith("0x") &&
                  Boolean(party1)
                    ? "not-allowed"
                    : "text",
              }}
            />
          </div>
          <div className={styles.inputRow}>
            <input
              type="text"
              onChange={(e) => setParty2(e.target.value)}
              placeholder="Party2"
              className={styles.input}
              required
              value={
                id && typeof id === "string" && id.startsWith("0x")
                  ? party2
                  : address
              }
              readOnly={
                id && typeof id === "string" && id.startsWith("0x") && Boolean(party2)
              }
              style={{
                backgroundColor:
                  id &&
                  typeof id === "string" &&
                  id.startsWith("0x") &&
                  Boolean(party2)
                    ? "#0000"
                    : "white",
                cursor:
                  id &&
                  typeof id === "string" &&
                  id.startsWith("0x") &&
                  Boolean(party2)
                    ? "not-allowed"
                    : "text",
              }}
            />
          </div>

          {/* Add Ticket Type Form */}
          {addingTicket && isUserAuthorized() && (
            <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
              <h3 style={{ color: "white", marginBottom: "15px" }}>Add New Ticket Type</h3>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  placeholder="Ticket Name"
                  value={ticketName}
                  onChange={(e) => setTicketName(e.target.value)}
                  className={styles.input}
                  style={{ marginBottom: "10px" }}
                />
              </div>
              <div className={styles.inputRow}>
                <input
                  type="number"
                  placeholder="Ticket Price (ETH)"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  className={styles.input}
                  style={{ marginBottom: "10px" }}
                  step="0.001"
                />
              </div>
              <div className={styles.inputRow}>
                <input
                  type="number"
                  placeholder="Ticket Count"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(e.target.value)}
                  className={styles.input}
                  style={{ marginBottom: "15px" }}
                  min="1"
                />
              </div>
              <div className={styles.contractRow}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setAddingTicket(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.arbitrateButton}
                  onClick={handleAddTicketType}
                  disabled={isAddingTicket}
                  style={{ marginLeft: "10px" }}
                >
                  {isAddingTicket ? "Adding..." : "Add Ticket"}
                </button>
              </div>
            </div>
          )}

          <CreateContractsection party1={party1} party2={party2} />
          {renderButtons()}
        </main>
      </div>
    </Layout>
  );
};

export default Contractsdetail;
