import React, { useState, useMemo } from "react";
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
import { useAddTicketType, useAddTierToXAOTicket, dollarToWei, weiToDollar, ETH_PRICE_USD } from "../../hooks/useAddTicketType";
import { useReadContracts, useReadContract } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../wagmi";
import { EVENT_CONTRACT_ABI, SHOW_CONTRACT_ABI, XAO_TICKET_ABI } from "../../lib/web3/eventcontract";
import { IContract } from "../../backend/services/types/api";

const Contractsdetail: React.FC = () => {
  const [signing, setSigning] = useState(false);
  const [addingTicket, setAddingTicket] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCount, setTicketCount] = useState("");
  const [showGrantScanner, setShowGrantScanner] = useState(false);
  const [scannerAddress, setScannerAddress] = useState("");
  const [isGrantingRole, setIsGrantingRole] = useState(false);
  const router = useRouter();
  const { address, chain } = useWeb3();
  const { contracts } = useAllContractsWithSummaries(chain?.id);
  const { id, ticketsold, totalrevenue, source } = router.query;
  const party1 = router.query.party1 as string | undefined;
  const party2 = router.query.party2 as string | undefined;
  const { signContractAsync, isLoading } = useSignEventContract();
  const { addTicketTypeAsync, isLoading: isAddingTicket } = useAddTicketType();
  const { addTier, isLoading: isAddingTier } = useAddTierToXAOTicket();

  // Fetch all contract fields from on-chain for blockchain contracts
  const isBlockchain = id && typeof id === "string" && id.startsWith("0x");
  const contractAddr = isBlockchain ? (id as `0x${string}`) : undefined;

  // Read ticketCollection address from ShowContract
  const { data: ticketCollectionData } = useReadContract({
    address: contractAddr,
    abi: SHOW_CONTRACT_ABI,
    functionName: 'ticketCollection',
    query: { enabled: !!contractAddr },
  });
  const ticketCollectionAddr = ticketCollectionData as `0x${string}` | undefined;
  const hasTicketCollection = !!ticketCollectionAddr && ticketCollectionAddr !== '0x0000000000000000000000000000000000000000';

  // ShowContract exposes individual public fields instead of struct getters
  const chainCalls = contractAddr ? [
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'party1' },          // 0
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'party2' },          // 1
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'announcementDate' },// 2
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventStartDate' },  // 3
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventEndDate' },    // 4
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'loadInTime' },      // 5
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'doorsTime' },       // 6
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'startTime' },       // 7
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'endTime' },         // 8
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'setTime' },         // 9
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'setLengthMinutes' },// 10
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'venueName' },       // 11
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'venueAddress' },    // 12
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'radiusMiles' },     // 13
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'radiusDays' },      // 14
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'ticketsEnabled' },  // 15
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'totalCapacity' },   // 16
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'salesTaxBPS' },     // 17
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'guaranteeUSDC' },   // 18
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'guaranteePctBPS' }, // 19
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'backendBPS' },      // 20
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'barSplitBPS' },     // 21
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'merchSplitBPS' },   // 22
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventName' },       // 23
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'flyerDNSLink' },    // 24
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'riderIPFSCID' },    // 25
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'contractLegalLanguage' }, // 26
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'ticketLegalLanguage' },   // 27
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'status' },          // 28
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'escrowBalance' },   // 29
  ] : [];

  const { data: chainData, isLoading: chainLoading } = useReadContracts({
    contracts: chainCalls,
    query: { enabled: !!contractAddr },
  });

  // Helper to convert timestamp (seconds) to datetime-local string
  const timestampToDatetime = (ts: any): string => {
    const n = Number(ts);
    if (!n || n === 0) return '';
    const d = new Date(n * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Helper to extract HH:MM from a full Unix timestamp or seconds-of-day
  const secondsToTime = (s: any): string => {
    const n = Number(s);
    if (!n || n === 0) return '';
    // If value is large (> 86400), it's a full Unix timestamp — extract time portion
    if (n > 86400) {
      const date = new Date(n * 1000);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    // Otherwise it's seconds-of-day (legacy contracts)
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Helper to convert basis points to percentage string
  const basisToPercent = (bp: any): string => {
    const n = Number(bp);
    if (!n) return '';
    return (n / 100).toFixed(2);
  };

  // Helper to convert wei to dollar string
  const weiToDollarStr = (wei: any): string => {
    const n = Number(wei);
    if (!n) return '';
    return (n / 1e18 * ETH_PRICE_USD).toFixed(2);
  };

  // Convert chain data to initialData for CreateContractsection
  // USDC has 6 decimals
  const usdcToDollarStr = (usdc: any): string => {
    const n = Number(usdc);
    if (!n) return '';
    return (n / 1e6).toFixed(2);
  };

  const chainInitialData: Partial<IContract> | undefined = useMemo(() => {
    if (!isBlockchain || !chainData || chainLoading) return undefined;

    const get = (i: number) => chainData[i]?.status === 'success' ? chainData[i].result : null;

    // Individual date fields from ShowContract
    const announcementDate = get(2);
    const eventStartDate = get(3);
    const eventEndDate = get(4);
    const loadInTime = get(5);
    const doorsTime = get(6);
    const startTimeVal = get(7);
    const endTimeVal = get(8);
    const setTimeVal = get(9);
    const setLengthMin = get(10);

    // Location fields
    const venueNameVal = get(11) as string || '';
    const venueAddressVal = get(12) as string || '';
    const radiusMilesVal = get(13);
    const radiusDaysVal = get(14);

    // Ticket fields
    const ticketsEnabledVal = get(15);
    const totalCapacityVal = get(16);
    const salesTaxBPSVal = get(17);

    // Financial fields
    const guaranteeUSDCVal = get(18);
    const guaranteePctBPSVal = get(19);
    const backendBPSVal = get(20);
    const barSplitBPSVal = get(21);
    const merchSplitBPSVal = get(22);

    // Promo / legal
    const eventNameVal = get(23) as string || '';
    const flyerDNSLinkVal = get(24) as string || '';
    const riderStr = get(25) as string || '';
    const legalStr = get(26) as string || '';
    const ticketLegalStr = get(27) as string || '';

    return {
      datesAndTimes: {
        startTime: secondsToTime(startTimeVal),
        endTime: secondsToTime(endTimeVal),
        loadIn: secondsToTime(loadInTime),
        doors: secondsToTime(doorsTime),
        setTime: secondsToTime(setTimeVal),
        setLength: Number(setLengthMin) ? String(Number(setLengthMin)) : '',
        ticketsSale: '',
        eventStartDate: timestampToDatetime(eventStartDate),
        eventAnnouncementDate: timestampToDatetime(announcementDate),
        eventEndDate: timestampToDatetime(eventEndDate),
      },
      location: {
        venueName: venueNameVal,
        address: venueAddressVal,
        radiusDistance: Number(radiusMilesVal) ? String(Number(radiusMilesVal)) : '',
        days: Number(radiusDaysVal) ? String(Number(radiusDaysVal)) : '',
      },
      tickets: {
        ticketRows: [{ ticketType: '', onSaleDate: '', numberOfTickets: '', ticketPrice: '' }],
        totalCapacity: Number(totalCapacityVal) ? String(Number(totalCapacityVal)) : '',
        comps: basisToPercent(salesTaxBPSVal),
        salesTax: basisToPercent(salesTaxBPSVal),
        resale: undefined,
      },
      money: {
        guaranteeInput: basisToPercent(guaranteePctBPSVal),
        depositbandInput: usdcToDollarStr(guaranteeUSDCVal),
        backendInput: basisToPercent(backendBPSVal),
        barsplitInput: basisToPercent(barSplitBPSVal),
        merchSplitInput: basisToPercent(merchSplitBPSVal),
        securityDepositRows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
        cancelParty1Rows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
        bandCanceledBy: '',
        cancelParty2DateTime: '',
        securitydepositAdd: '',
        securityDeposit2Rows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
        cancelParty2Rows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
      },
      promotion: {
        value: eventNameVal,
        genres: [],
      },
      eventImageUri: flyerDNSLinkVal || undefined,
      rider: riderStr ? {
        rows: riderStr.split(', ').filter(Boolean).map((v: string) => ({ value: v })),
      } : undefined,
      legalAgreement: legalStr || undefined,
      ticketLegalLanguage: ticketLegalStr || undefined,
    };
  }, [isBlockchain, chainData, chainLoading]);

  // Compute on-chain escrow balance (USDC, 6 decimals)
  const onChainTicketsSold = '0'; // Ticket sales tracked via XAOTicket after finalization

  const onChainTotalRevenue = useMemo(() => {
    if (!isBlockchain || !chainData) return '$0.00';
    const val = chainData[29]?.status === 'success' ? chainData[29].result : null;
    if (!val) return '$0.00';
    const dollars = Number(val) / 1e6;
    return `$${dollars.toFixed(2)}`;
  }, [isBlockchain, chainData]);

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

    if (!hasTicketCollection) {
      alert("Ticket collection not deployed yet. Both parties must sign the contract first.");
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

    // Map name to XAOTicket TicketType enum
    const nameToEnum = (name: string): number => {
      const lower = name.toLowerCase().trim();
      if (lower === 'comp' || lower === 'complimentary') return 0;
      if (lower === 'presale' || lower === 'pre-sale') return 1;
      if (lower === 'general admission' || lower === 'ga') return 2;
      if (lower === 'vip') return 3;
      return 4; // CUSTOM
    };

    try {
      setAddingTicket(true);
      const ticketTypeEnum = nameToEnum(ticketName.trim());

      console.log("=== ADDING TIER TO XAOTICKET ===");
      console.log("XAOTicket:", ticketCollectionAddr);
      console.log("Ticket Name:", ticketName.trim());
      console.log("Ticket Price (USD):", ticketPrice.trim());
      console.log("Ticket Count:", ticketCount.trim());

      await addTier(ticketCollectionAddr!, {
        ticketType: ticketTypeEnum,
        customName: ticketTypeEnum === 4 ? ticketName.trim() : '',
        priceUSDC: dollarToWei(ticketPrice),  // dollarToWei now converts to USDC (6 decimals)
        quantity: BigInt(parseInt(ticketCount) || 0),
        onSaleTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        party1ResaleBPS: BigInt(3333),
        party2ResaleBPS: BigInt(3333),
        resellerBPS: BigInt(3334),
      });

      alert("Ticket tier added successfully!");
      setTicketName("");
      setTicketPrice("");
      setTicketCount("");
      setAddingTicket(false);
    } catch (error) {
      console.error("Error adding ticket tier:", error);
      alert("Failed to add ticket tier. Please try again.");
      setAddingTicket(false);
    }
  };

  // SCANNER_ROLE = keccak256("SCANNER_ROLE")
  const SCANNER_ROLE = '0xbbde0e6e2f9a4ff83e528fa1c67c37b49tried78370cbfba54b9c24b97b48ee5b';

  const handleGrantScannerRole = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    if (!hasTicketCollection) {
      alert("Ticket collection not deployed yet. Both parties must sign first.");
      return;
    }
    if (!scannerAddress.trim() || !scannerAddress.startsWith('0x') || scannerAddress.length !== 42) {
      alert("Please enter a valid wallet address (0x...)");
      return;
    }

    try {
      setIsGrantingRole(true);

      // Read SCANNER_ROLE from XAOTicket contract
      const scannerRoleHash = await import("@wagmi/core").then(({ readContract: rc }) =>
        rc(config, {
          address: ticketCollectionAddr!,
          abi: XAO_TICKET_ABI as any,
          functionName: 'SCANNER_ROLE',
        })
      ) as `0x${string}`;

      console.log("=== GRANTING SCANNER ROLE ===");
      console.log("XAOTicket:", ticketCollectionAddr);
      console.log("Scanner:", scannerAddress);
      console.log("Role hash:", scannerRoleHash);

      const txHash = await writeContract(config, {
        address: ticketCollectionAddr!,
        abi: XAO_TICKET_ABI as any,
        functionName: 'grantRole',
        args: [scannerRoleHash, scannerAddress as `0x${string}`],
      });

      await waitForTransactionReceipt(config, { hash: txHash });

      alert(`Scanner role granted to ${scannerAddress}!`);
      setScannerAddress("");
      setShowGrantScanner(false);
    } catch (error) {
      console.error("Error granting scanner role:", error);
      alert("Failed to grant scanner role. Make sure you are the admin (party1).");
    } finally {
      setIsGrantingRole(false);
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
            <>
              <button
                type="button"
                className={styles.arbitrateButton}
                onClick={() => setAddingTicket(!addingTicket)}
                style={{ marginLeft: "10px" }}
              >
                {addingTicket ? "Cancel" : "Add Ticket Type"}
              </button>
              {hasTicketCollection && (
                <button
                  type="button"
                  className={styles.arbitrateButton}
                  onClick={() => setShowGrantScanner(!showGrantScanner)}
                  style={{ marginLeft: "10px" }}
                >
                  {showGrantScanner ? "Cancel" : "Grant Scanner"}
                </button>
              )}
            </>
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

  // Show loading while fetching blockchain data
  if (isBlockchain && (chainLoading || !chainData)) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.background} />
          <Head>
            <title>Contract Details - XAO Cult</title>
          </Head>
          <BlankNavbar pageTitle="Contract Details" />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'white' }}>
            <p>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

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
                  Tickets Sold: {isBlockchain ? onChainTicketsSold : ticketsold}
                </span>

                <span className={styles.promotionRevenue}>
                  Total Revenue: {isBlockchain ? onChainTotalRevenue : totalrevenue}
                </span>
              </div>
            </div>
          )}

          <label className={styles.Leftlabel}>Parties </label>
          <div className={styles.inputRow}>
            <input
              type="text"
              placeholder="Party1"
              className={styles.input}
              required
              value={
                id && typeof id === "string" && id.startsWith("0x")
                  ? party1 || ''
                  : address || ''
              }
              readOnly={!!(id && typeof id === "string" && id.startsWith("0x") && party1)}
              style={{
                backgroundColor:
                  id && typeof id === "string" && id.startsWith("0x") && party1
                    ? "#000"
                    : "white",
                cursor:
                  id && typeof id === "string" && id.startsWith("0x") && party1
                    ? "not-allowed"
                    : "text",
              }}
            />
          </div>
          <div className={styles.inputRow}>
            <input
              type="text"
              placeholder="Party2"
              className={styles.input}
              required
              value={
                id && typeof id === "string" && id.startsWith("0x")
                  ? party2 || ''
                  : address || ''
              }
              readOnly={!!(id && typeof id === "string" && id.startsWith("0x") && party2)}
              style={{
                backgroundColor:
                  id && typeof id === "string" && id.startsWith("0x") && party2
                    ? "#000"
                    : "white",
                cursor:
                  id && typeof id === "string" && id.startsWith("0x") && party2
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
                  placeholder="Ticket Price (USD)"
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

          {/* Grant Scanner Role Form */}
          {showGrantScanner && isUserAuthorized() && hasTicketCollection && (
            <div style={{ marginTop: "20px", padding: "20px", border: "1px solid rgba(255,153,0,0.4)", borderRadius: "8px", background: "rgba(0,0,0,0.3)" }}>
              <h3 style={{ color: "white", marginBottom: "15px" }}>Grant Scanner Role</h3>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginBottom: "12px" }}>
                Allow a wallet to scan/redeem tickets at the door.
              </p>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  placeholder="Scanner wallet address (0x...)"
                  value={scannerAddress}
                  onChange={(e) => setScannerAddress(e.target.value)}
                  className={styles.input}
                  style={{ marginBottom: "10px" }}
                />
              </div>
              <div className={styles.contractRow}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowGrantScanner(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.arbitrateButton}
                  onClick={handleGrantScannerRole}
                  disabled={isGrantingRole}
                  style={{ marginLeft: "10px" }}
                >
                  {isGrantingRole ? "Granting..." : "Grant Role"}
                </button>
              </div>
            </div>
          )}

          <CreateContractsection party1={party1 || ''} party2={party2 || ''} initialData={chainInitialData} />
          {renderButtons()}
        </main>
      </div>
    </Layout>
  );
};

export default Contractsdetail;
