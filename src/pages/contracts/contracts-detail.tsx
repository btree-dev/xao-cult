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
import { useAddTicketType, dollarToWei, weiToDollar, ETH_PRICE_USD } from "../../hooks/useAddTicketType";
import { useReadContracts } from "wagmi";
import { EVENT_CONTRACT_ABI } from "../../lib/web3/eventcontract";
import { IContract } from "../../backend/services/types/api";

const Contractsdetail: React.FC = () => {
  const [signing, setSigning] = useState(false);
  const [addingTicket, setAddingTicket] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCount, setTicketCount] = useState("");
  const router = useRouter();
  const { address, chain } = useWeb3();
  const { contracts } = useAllContractsWithSummaries(chain?.id);
  const { id, ticketsold, totalrevenue, source } = router.query;
  const party1 = router.query.party1 as string | undefined;
  const party2 = router.query.party2 as string | undefined;
  const { signContractAsync, isLoading } = useSignEventContract();
  const { addTicketTypeAsync, isLoading: isAddingTicket } = useAddTicketType();

  // Fetch all contract fields from on-chain for blockchain contracts
  const isBlockchain = id && typeof id === "string" && id.startsWith("0x");
  const contractAddr = isBlockchain ? (id as `0x${string}`) : undefined;

  const chainCalls = contractAddr ? [
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'party1' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'party2' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'dates' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'location' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'config' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'resale' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'payIn' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'name' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'imageUri' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'rider' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'legal' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'ticketLegal' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'getTicketTypes' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'totalIssued' as const },
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'revenue' as const },
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
  const chainInitialData: Partial<IContract> | undefined = useMemo(() => {
    if (!isBlockchain || !chainData || chainLoading) return undefined;

    const get = (i: number) => chainData[i]?.status === 'success' ? chainData[i].result : null;

    const dates = get(2) as any;
    const loc = get(3) as any;
    const cfg = get(4) as any;
    const resaleData = get(5) as any;
    const payInData = get(6) as any;
    const eventName = get(7) as string || '';
    const imageUri = get(8) as string || '';
    const riderStr = get(9) as string || '';
    const legalStr = get(10) as string || '';
    const ticketLegalStr = get(11) as string || '';
    const ticketTypes = get(12) as any[] || [];

    return {
      datesAndTimes: dates ? {
        startTime: secondsToTime(dates.start ?? dates[4]),
        endTime: secondsToTime(dates.end ?? dates[5]),
        loadIn: secondsToTime(dates.loadIn ?? dates[2]),
        doors: secondsToTime(dates.doors ?? dates[3]),
        setTime: secondsToTime(dates.setTime ?? dates[6]),
        setLength: Number(dates.setLength ?? dates[7]) ? String(Number(dates.setLength ?? dates[7])) : '',
        ticketsSale: '',
        eventStartDate: timestampToDatetime(dates.show ?? dates[1]),
        eventAnnouncementDate: timestampToDatetime(dates.announce ?? dates[0]),
        eventEndDate: timestampToDatetime(dates.end ?? dates[5]),
      } : undefined,
      location: loc ? {
        venueName: loc.venue ?? loc[0] ?? '',
        address: loc.addr ?? loc[1] ?? '',
        radiusDistance: Number(loc.radius ?? loc[2]) ? String(Number(loc.radius ?? loc[2])) : '',
        days: Number(loc.days1 ?? loc[3]) ? String(Number(loc.days1 ?? loc[3])) : '',
      } : undefined,
      tickets: cfg ? {
        ticketRows: ticketTypes.length > 0 ? ticketTypes.map((t: any) => ({
          ticketType: t.name ?? t[0] ?? '',
          onSaleDate: timestampToDatetime(t.saleDate ?? t[1]),
          numberOfTickets: Number(t.count ?? t[2]) ? String(Number(t.count ?? t[2])) : '',
          ticketPrice: weiToDollarStr(t.price ?? t[3]),
        })) : [{ ticketType: '', onSaleDate: '', numberOfTickets: '', ticketPrice: '' }],
        totalCapacity: Number(cfg.capacity ?? cfg[1]) ? String(Number(cfg.capacity ?? cfg[1])) : '',
        comps: basisToPercent(cfg.taxPct ?? cfg[2]),
        salesTax: basisToPercent(cfg.taxPct ?? cfg[2]),
        resale: resaleData ? {
          party1: basisToPercent(resaleData.p1Pct ?? resaleData[0]),
          party2: basisToPercent(resaleData.p2Pct ?? resaleData[1]),
          reseller: basisToPercent(resaleData.rPct ?? resaleData[2]),
        } : undefined,
      } : undefined,
      money: payInData ? {
        // guaPct > 0 means percentage was used; otherwise dollar amount was used
        guaranteeInput: basisToPercent(payInData.guaPct ?? payInData[1]),
        depositbandInput: weiToDollarStr(payInData.guarantee ?? payInData[0]),
        backendInput: basisToPercent(payInData.backPct ?? payInData[2]),
        barsplitInput: basisToPercent(payInData.barPct ?? payInData[3]),
        merchSplitInput: basisToPercent(payInData.merchPct ?? payInData[4]),
        securityDepositRows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
        cancelParty1Rows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
        bandCanceledBy: '',
        cancelParty2DateTime: '',
        securitydepositAdd: '',
        securityDeposit2Rows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
        cancelParty2Rows: [{ dateTime: '', percentage: '', dollarAmount: '' }],
      } : undefined,
      promotion: {
        value: eventName,
        genres: [],
      },
      eventImageUri: imageUri || undefined,
      rider: riderStr ? {
        rows: riderStr.split(', ').filter(Boolean).map((v: string) => ({ value: v })),
      } : undefined,
      legalAgreement: legalStr || undefined,
      ticketLegalLanguage: ticketLegalStr || undefined,
    };
  }, [isBlockchain, chainData, chainLoading]);

  // Compute on-chain tickets sold and total revenue
  const onChainTicketsSold = useMemo(() => {
    if (!isBlockchain || !chainData) return '0';
    const val = chainData[13]?.status === 'success' ? chainData[13].result : null;
    return val ? String(Number(val)) : '0';
  }, [isBlockchain, chainData]);

  const onChainTotalRevenue = useMemo(() => {
    if (!isBlockchain || !chainData) return '$0.00';
    const val = chainData[14]?.status === 'success' ? chainData[14].result : null;
    if (!val) return '$0.00';
    const dollars = Number(val) / 1e18 * ETH_PRICE_USD;
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

          <CreateContractsection party1={party1 || ''} party2={party2 || ''} initialData={chainInitialData} />
          {renderButtons()}
        </main>
      </div>
    </Layout>
  );
};

export default Contractsdetail;
