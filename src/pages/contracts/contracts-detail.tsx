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
import { USDC_ADDRESS_TESTNET, USDC_ADDRESS_MAINNET } from "../../lib/web3/chains";
import { IContract } from "../../backend/services/types/api";
import { useToast } from "../../components/Toast";

const STATUS_LABELS = ['DRAFT', 'PROPOSED', 'COUNTER_PROPOSED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED'];

const STATUS_COLORS: Record<number, string> = {
  0: '#888',      // DRAFT
  1: '#ff9900',   // PROPOSED
  2: '#e100ff',   // COUNTER_PROPOSED
  3: '#4ade80',   // APPROVED
  4: '#22d3ee',   // ACTIVE
  5: '#4ade80',   // COMPLETED
  6: '#ef4444',   // CANCELLED
  7: '#ef4444',   // DISPUTED
};

const USDC_APPROVE_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const Contractsdetail: React.FC = () => {
  // Existing UI state
  const [signing, setSigning] = useState(false);
  const [addingTicket, setAddingTicket] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketCount, setTicketCount] = useState("");
  const [showGrantScanner, setShowGrantScanner] = useState(false);
  const [scannerAddress, setScannerAddress] = useState("");
  const [isGrantingRole, setIsGrantingRole] = useState(false);

  // Escrow & lifecycle state
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [markingActive, setMarkingActive] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  // Dispute state
  const [showDispute, setShowDispute] = useState(false);
  const [isRaisingDispute, setIsRaisingDispute] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // Marketplace state
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [marketplaceAddr, setMarketplaceAddr] = useState('');
  const [isSettingMarketplace, setIsSettingMarketplace] = useState(false);

  const router = useRouter();
  const { address, chain } = useWeb3();
  const { success: toastSuccess, error: toastError, loading: toastLoading, dismiss: toastDismiss } = useToast();
  const { contracts } = useAllContractsWithSummaries(chain?.id);
  const { id, ticketsold, totalrevenue, source } = router.query;
  const party1 = router.query.party1 as string | undefined;
  const party2 = router.query.party2 as string | undefined;
  const { signContractAsync, isLoading } = useSignEventContract();
  const { addTicketTypeAsync, isLoading: isAddingTicket } = useAddTicketType();
  const { addTier, isLoading: isAddingTier } = useAddTierToXAOTicket();

  const isBlockchain = id && typeof id === "string" && id.startsWith("0x");
  const contractAddr = isBlockchain ? (id as `0x${string}`) : undefined;

  const usdcAddr = (chain?.id === 8453 ? USDC_ADDRESS_MAINNET : USDC_ADDRESS_TESTNET) as `0x${string}`;

  // Read ticketCollection address from ShowContract
  const { data: ticketCollectionData } = useReadContract({
    address: contractAddr,
    abi: SHOW_CONTRACT_ABI,
    functionName: 'ticketCollection',
    query: { enabled: !!contractAddr },
  });
  const ticketCollectionAddr = ticketCollectionData as `0x${string}` | undefined;
  const hasTicketCollection = !!ticketCollectionAddr && ticketCollectionAddr !== '0x0000000000000000000000000000000000000000';

  const p1Addr = (party1?.startsWith('0x') ? party1 : undefined) as `0x${string}` | undefined;
  const p2Addr = (party2?.startsWith('0x') ? party2 : undefined) as `0x${string}` | undefined;

  // All on-chain reads bundled together
  const chainCalls = contractAddr ? [
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'party1' },           // 0
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'party2' },           // 1
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'announcementDate' }, // 2
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventStartDate' },   // 3
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventEndDate' },     // 4
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'loadInTime' },       // 5
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'doorsTime' },        // 6
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'startTime' },        // 7
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'endTime' },          // 8
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'setTime' },          // 9
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'setLengthMinutes' }, // 10
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'venueName' },        // 11
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'venueAddress' },     // 12
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'radiusMiles' },      // 13
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'radiusDays' },       // 14
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'ticketsEnabled' },   // 15
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'totalCapacity' },    // 16
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'salesTaxBPS' },      // 17
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'guaranteeUSDC' },    // 18
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'guaranteePctBPS' },  // 19
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'backendBPS' },       // 20
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'barSplitBPS' },      // 21
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'merchSplitBPS' },    // 22
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'eventName' },        // 23
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'flyerDNSLink' },     // 24
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'riderIPFSCID' },     // 25
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'contractLegalLanguage' }, // 26
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'ticketLegalLanguage' },   // 27
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'status' },           // 28
    { address: contractAddr, abi: EVENT_CONTRACT_ABI as any, functionName: 'escrowBalance' },    // 29
    // Additional reads
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'isFinalized' },       // 30
    ...(p1Addr ? [{ address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'hasSigned', args: [p1Addr] }] : []), // 31
    ...(p2Addr ? [{ address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'hasSigned', args: [p2Addr] }] : []), // 32
    ...(address ? [{ address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'hasVotedResolve', args: [address as `0x${string}`] }] : []), // 33
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'getParty1Deposits' }, // 34
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'getParty2Deposits' }, // 35
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'getParty1Payouts' },  // 36
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'getParty2Payouts' },  // 37
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'getParty1CancellationRefunds' }, // 38
    { address: contractAddr, abi: SHOW_CONTRACT_ABI as any, functionName: 'getParty2CancellationRefunds' }, // 39
  ] : [];

  const { data: chainData, isLoading: chainLoading } = useReadContracts({
    contracts: chainCalls,
    query: { enabled: !!contractAddr },
  });

  // ─── COMPUTED VALUES ──────────────────────────────────────────────────────

  const get = (i: number) => chainData?.[i]?.status === 'success' ? chainData[i].result : null;

  // Account for optional entries (31, 32, 33 only exist when p1/p2/address present)
  const baseOffset = 30; // isFinalized is always at 30
  const p1HasSignedIdx = p1Addr ? 31 : null;
  const p2HasSignedIdx = p1Addr && p2Addr ? 32 : p2Addr ? 31 : null;
  const votedResolveIdx = (() => {
    let idx = 31;
    if (p1Addr) idx++;
    if (p2Addr) idx++;
    return address ? idx : null;
  })();
  const scheduleBaseIdx = (() => {
    let idx = 31;
    if (p1Addr) idx++;
    if (p2Addr) idx++;
    if (address) idx++;
    return idx; // 34 = getParty1Deposits start
  })();

  const onChainStatus = useMemo(() => {
    const val = get(28);
    return val !== null && val !== undefined ? Number(val) : null;
  }, [chainData]);

  const onChainEndTime = useMemo(() => {
    const val = get(8);
    return val ? Number(val) : null;
  }, [chainData]);

  const onChainIsFinalized = useMemo(() => !!get(30), [chainData]);

  const onChainEscrowBalance = useMemo(() => {
    const val = get(29);
    return val ? BigInt(String(val)) : BigInt(0);
  }, [chainData]);

  const escrowBalanceUSDC = Number(onChainEscrowBalance) / 1e6;

  const p1HasSigned = useMemo(() => p1HasSignedIdx ? !!get(p1HasSignedIdx) : false, [chainData, p1HasSignedIdx]);
  const p2HasSigned = useMemo(() => p2HasSignedIdx ? !!get(p2HasSignedIdx) : false, [chainData, p2HasSignedIdx]);
  const currentUserHasVotedResolve = useMemo(() => votedResolveIdx ? !!get(votedResolveIdx) : false, [chainData, votedResolveIdx]);

  const party1Deposits = useMemo(() => (get(scheduleBaseIdx) as any[] | null) ?? [], [chainData, scheduleBaseIdx]);
  const party2Deposits = useMemo(() => (get(scheduleBaseIdx + 1) as any[] | null) ?? [], [chainData, scheduleBaseIdx]);
  const party1Payouts = useMemo(() => (get(scheduleBaseIdx + 2) as any[] | null) ?? [], [chainData, scheduleBaseIdx]);
  const party2Payouts = useMemo(() => (get(scheduleBaseIdx + 3) as any[] | null) ?? [], [chainData, scheduleBaseIdx]);
  const p1CancelRefunds = useMemo(() => (get(scheduleBaseIdx + 4) as any[] | null) ?? [], [chainData, scheduleBaseIdx]);
  const p2CancelRefunds = useMemo(() => (get(scheduleBaseIdx + 5) as any[] | null) ?? [], [chainData, scheduleBaseIdx]);

  const nowSec = Math.floor(Date.now() / 1000);
  const showEnded = onChainEndTime ? nowSec >= onChainEndTime : false;

  const isParty1 = !!(address && party1 && address.toLowerCase() === party1.toLowerCase());
  const isParty2 = !!(address && party2 && address.toLowerCase() === party2.toLowerCase());
  const isEitherParty = isParty1 || isParty2;

  // ─── HELPER FORMATTERS ────────────────────────────────────────────────────

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

  const tsToReadable = (ts: any): string => {
    const n = Number(ts);
    if (!n) return '—';
    return new Date(n * 1000).toLocaleString();
  };

  const secondsToTime = (s: any): string => {
    const n = Number(s);
    if (!n || n === 0) return '';
    if (n > 86400) {
      const date = new Date(n * 1000);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const basisToPercent = (bp: any): string => {
    const n = Number(bp);
    if (!n) return '';
    return (n / 100).toFixed(2);
  };

  const usdcToDollarStr = (usdc: any): string => {
    const n = Number(usdc);
    if (!n) return '';
    return (n / 1e6).toFixed(2);
  };

  // ─── CHAIN INITIAL DATA ───────────────────────────────────────────────────

  const chainInitialData: Partial<IContract> | undefined = useMemo(() => {
    if (!isBlockchain || !chainData || chainLoading) return undefined;

    const announcementDate = get(2);
    const eventStartDate = get(3);
    const eventEndDate = get(4);
    const loadInTime = get(5);
    const doorsTime = get(6);
    const startTimeVal = get(7);
    const endTimeVal = get(8);
    const setTimeVal = get(9);
    const setLengthMin = get(10);
    const venueNameVal = get(11) as string || '';
    const venueAddressVal = get(12) as string || '';
    const radiusMilesVal = get(13);
    const radiusDaysVal = get(14);
    const ticketsEnabledVal = get(15);
    const totalCapacityVal = get(16);
    const salesTaxBPSVal = get(17);
    const guaranteeUSDCVal = get(18);
    const guaranteePctBPSVal = get(19);
    const backendBPSVal = get(20);
    const barSplitBPSVal = get(21);
    const merchSplitBPSVal = get(22);
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

  const onChainTicketsSold = '0';
  const onChainTotalRevenue = useMemo(() => {
    if (!isBlockchain || !chainData) return '$0.00';
    const val = get(29);
    if (!val) return '$0.00';
    return `$${(Number(val) / 1e6).toFixed(2)}`;
  }, [isBlockchain, chainData]);

  // ─── CONTRACT LOOKUP (mock data fallback) ─────────────────────────────────

  let eventDetail: any;
  if (id && typeof id === "string" && id.startsWith("0x")) {
    eventDetail = contracts.find((c) => c.contractAddress === id);
  } else if (source === "negotiation") {
    const all = [...AttentionList, ...WaitingList];
    eventDetail = all.find((c) => String(c.id) === String(id));
  } else if (source === "current") {
    eventDetail = currentcontracts.find((c) => String(c.id) === String(id));
  }

  // ─── HANDLER FUNCTIONS ────────────────────────────────────────────────────

  const handleArbitrateClick = () => router.push(`/contracts/arbitrate?showContract=${contractAddr || id}`);

  const isUserAuthorized = () => {
    if (!address || !party1 || !party2) return false;
    return address.toLowerCase() === party1.toLowerCase() ||
           address.toLowerCase() === party2.toLowerCase();
  };

  const handleMarkActive = async () => {
    if (!contractAddr) return;
    const tid = toastLoading('Marking contract Active…');
    try {
      setMarkingActive(true);
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'markActive',
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess('Contract is now Active!', txHash);
      router.reload();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Failed to mark active.');
    } finally {
      setMarkingActive(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!contractAddr) return;
    const tid = toastLoading('Marking contract Completed…');
    try {
      setMarkingCompleted(true);
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'markCompleted',
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess('Contract marked Completed!', txHash);
      router.reload();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Failed to mark completed — show end time may not have passed.');
    } finally {
      setMarkingCompleted(false);
    }
  };

  const handleWithdrawEscrow = async () => {
    if (!contractAddr || !withdrawAmount || !address) return;
    const tid = toastLoading('Withdrawing from escrow…');
    try {
      setIsWithdrawing(true);
      const usdcAmount = BigInt(Math.round(parseFloat(withdrawAmount) * 1e6));
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'withdrawEscrow',
        args: [address as `0x${string}`, usdcAmount],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess(`Withdrew $${withdrawAmount} USDC!`, txHash);
      setWithdrawAmount('');
      setShowWithdraw(false);
      router.reload();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Withdraw failed — contract must be COMPLETED.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDepositGuarantee = async () => {
    if (!contractAddr || !depositAmount || !address) return;
    const tid = toastLoading('Approving USDC…');
    try {
      setIsDepositing(true);
      const usdcAmount = BigInt(Math.round(parseFloat(depositAmount) * 1e6));

      const approveTx = await writeContract(config, {
        address: usdcAddr,
        abi: USDC_APPROVE_ABI,
        functionName: 'approve',
        args: [contractAddr, usdcAmount],
      });
      await waitForTransactionReceipt(config, { hash: approveTx });
      toastDismiss(tid);

      const tid2 = toastLoading('Depositing to escrow…');
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'depositGuarantee',
        args: [usdcAmount],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid2);
      toastSuccess(`Deposited $${depositAmount} USDC to escrow!`, txHash);
      setDepositAmount('');
      setShowDeposit(false);
      router.reload();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Deposit failed — check USDC balance and contract status.');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!contractAddr) return;
    const tid = toastLoading('Raising dispute…');
    try {
      setIsRaisingDispute(true);
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'raiseDispute',
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess('Dispute raised. Escrow is frozen.', txHash);
      setShowDispute(false);
      router.reload();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Failed to raise dispute.');
    } finally {
      setIsRaisingDispute(false);
    }
  };

  const handleResolveDispute = async (releaseToParty2: boolean) => {
    if (!contractAddr) return;
    const tid = toastLoading('Submitting resolution vote…');
    try {
      setIsResolvingDispute(true);
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'resolveDispute',
        args: [releaseToParty2],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess(`Voted to release to ${releaseToParty2 ? 'Party 2' : 'Party 1'}. Waiting for other party.`, txHash);
      router.reload();
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Failed to submit resolution vote.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  const handleCancelContract = async () => {
    if (!contractAddr) return;
    const tid = toastLoading('Cancelling contract…');
    try {
      setIsCancelling(true);
      const txHash = await writeContract(config, {
        address: contractAddr,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'cancelContract',
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess('Contract cancelled.', txHash);
      router.push('/dashboard');
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Failed to cancel contract.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSetMarketplaceApproval = async (approved: boolean) => {
    if (!ticketCollectionAddr || !marketplaceAddr.trim()) return;
    if (!marketplaceAddr.startsWith('0x') || marketplaceAddr.length !== 42) {
      toastError('Enter a valid wallet address (0x...)');
      return;
    }
    const tid = toastLoading(`${approved ? 'Approving' : 'Revoking'} marketplace…`);
    try {
      setIsSettingMarketplace(true);
      const txHash = await writeContract(config, {
        address: ticketCollectionAddr,
        abi: XAO_TICKET_ABI as any,
        functionName: 'setMarketplaceApproval',
        args: [marketplaceAddr as `0x${string}`, approved],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess(`Marketplace ${approved ? 'approved' : 'revoked'}!`, txHash);
      setMarketplaceAddr('');
      setShowMarketplace(false);
    } catch (err: any) {
      toastDismiss(tid);
      toastError(err?.shortMessage || 'Failed to set marketplace approval.');
    } finally {
      setIsSettingMarketplace(false);
    }
  };

  const handleAddTicketType = async () => {
    if (!address) { toastError("Connect your wallet first"); return; }
    if (!hasTicketCollection) { toastError("Ticket collection not deployed — both parties must sign first."); return; }
    if (!isUserAuthorized()) { toastError("You are not authorized to add ticket types."); return; }
    if (!ticketName.trim() || !ticketPrice.trim() || !ticketCount.trim()) { toastError("Fill in all ticket fields"); return; }

    const nameToEnum = (name: string): number => {
      const lower = name.toLowerCase().trim();
      if (lower === 'comp' || lower === 'complimentary') return 0;
      if (lower === 'presale' || lower === 'pre-sale') return 1;
      if (lower === 'general admission' || lower === 'ga') return 2;
      if (lower === 'vip') return 3;
      return 4;
    };

    const tid = toastLoading('Adding ticket tier…');
    try {
      setAddingTicket(true);
      const ticketTypeEnum = nameToEnum(ticketName.trim());
      await addTier(ticketCollectionAddr!, {
        ticketType: ticketTypeEnum,
        customName: ticketTypeEnum === 4 ? ticketName.trim() : '',
        priceUSDC: dollarToWei(ticketPrice),
        quantity: BigInt(parseInt(ticketCount) || 0),
        onSaleTimestamp: BigInt(Math.floor(Date.now() / 1000)),
        party1ResaleBPS: BigInt(3333),
        party2ResaleBPS: BigInt(3333),
        resellerBPS: BigInt(3334),
      });
      toastDismiss(tid);
      toastSuccess("Ticket tier added!");
      setTicketName(""); setTicketPrice(""); setTicketCount("");
      setAddingTicket(false);
    } catch (error: any) {
      toastDismiss(tid);
      toastError(error?.shortMessage || "Failed to add ticket tier.");
      setAddingTicket(false);
    }
  };

  const handleGrantScannerRole = async () => {
    if (!address) { toastError("Connect your wallet first"); return; }
    if (!hasTicketCollection) { toastError("Ticket collection not deployed — both parties must sign first."); return; }
    if (!scannerAddress.trim() || !scannerAddress.startsWith('0x') || scannerAddress.length !== 42) {
      toastError("Enter a valid wallet address (0x...)"); return;
    }
    const tid = toastLoading('Granting scanner role…');
    try {
      setIsGrantingRole(true);
      const scannerRoleHash = await import("@wagmi/core").then(({ readContract: rc }) =>
        rc(config, {
          address: ticketCollectionAddr!,
          abi: XAO_TICKET_ABI as any,
          functionName: 'SCANNER_ROLE',
        })
      ) as `0x${string}`;

      const txHash = await writeContract(config, {
        address: ticketCollectionAddr!,
        abi: XAO_TICKET_ABI as any,
        functionName: 'grantRole',
        args: [scannerRoleHash, scannerAddress as `0x${string}`],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      toastDismiss(tid);
      toastSuccess(`Scanner role granted!`, txHash);
      setScannerAddress(""); setShowGrantScanner(false);
    } catch (error: any) {
      toastDismiss(tid);
      toastError(error?.shortMessage || "Failed to grant scanner role.");
    } finally {
      setIsGrantingRole(false);
    }
  };

  const handleSignContract = async () => {
    if (!address) { toastError("Connect your wallet first"); return; }
    if (!id || typeof id !== "string") { toastError("Invalid contract ID"); return; }
    if (!party1 || !party1.trim()) { toastError("Party 1 address missing"); return; }
    const tid = toastLoading('Signing contract…');
    try {
      setSigning(true);
      await signContractAsync(id as `0x${string}`, (party2 as string).trim());
      toastDismiss(tid);
      toastSuccess("Contract signed!");
      router.push("/dashboard");
    } catch (error: any) {
      toastDismiss(tid);
      toastError(error?.shortMessage || "Failed to sign contract.");
    } finally {
      setSigning(false);
    }
  };

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────

  const renderStatusBadge = () => {
    if (!isBlockchain || onChainStatus === null) return null;
    const label = STATUS_LABELS[onChainStatus] ?? `Status ${onChainStatus}`;
    const color = STATUS_COLORS[onChainStatus] ?? '#888';
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '12px 0', flexWrap: 'wrap' }}>
        <span style={{
          background: `${color}22`,
          border: `1px solid ${color}`,
          color,
          borderRadius: '20px',
          padding: '4px 14px',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {label}
        </span>
        {onChainIsFinalized && (
          <span style={{ color: '#4ade80', fontSize: '12px' }}>✓ Finalized</span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
          Escrow: <strong style={{ color: 'white' }}>${escrowBalanceUSDC.toFixed(2)} USDC</strong>
        </span>
        {p1Addr && <span style={{ color: p1HasSigned ? '#4ade80' : '#888', fontSize: '12px' }}>Party1: {p1HasSigned ? '✓ Signed' : '⏳ Pending'}</span>}
        {p2Addr && <span style={{ color: p2HasSigned ? '#4ade80' : '#888', fontSize: '12px' }}>Party2: {p2HasSigned ? '✓ Signed' : '⏳ Pending'}</span>}
      </div>
    );
  };

  const renderPaymentSchedules = () => {
    const hasData = party1Deposits.length > 0 || party2Deposits.length > 0 ||
                    party1Payouts.length > 0 || party2Payouts.length > 0 ||
                    p1CancelRefunds.length > 0 || p2CancelRefunds.length > 0;
    if (!hasData) return null;

    const scheduleRow = (label: string, ts: any, pct: any, usdc: any, idx: number) => (
      <div key={idx} style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ minWidth: 160 }}>{tsToReadable(ts)}</span>
        <span>{Number(pct) ? `${(Number(pct)/100).toFixed(1)}%` : '—'}</span>
        <span style={{ color: '#4ade80' }}>${(Number(usdc)/1e6).toFixed(2)}</span>
      </div>
    );

    const section = (title: string, rows: any[], isCancellation = false) => {
      if (!rows.length) return null;
      return (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: 'rgba(255,153,0,0.9)', fontSize: '12px', fontWeight: 600, margin: '8px 0 4px' }}>{title}</p>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
            {isCancellation ? 'Cutoff Date · Refund % · Refund USDC' : 'Date · % · USDC Amount'}
          </div>
          {rows.map((r, i) => isCancellation
            ? scheduleRow(title, r.cutoffTimestamp, r.refundPctBPS, r.refundUSDC, i)
            : scheduleRow(title, r.timestamp, r.pctBPS, r.usdcAmount, i)
          )}
        </div>
      );
    };

    return (
      <div style={{ marginTop: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Payment Schedules</h3>
        {section('Party 1 Deposits', party1Deposits)}
        {section('Party 2 Deposits', party2Deposits)}
        {section('Party 1 Payouts', party1Payouts)}
        {section('Party 2 Payouts', party2Payouts)}
        {section('Party 1 Cancellation Refunds', p1CancelRefunds, true)}
        {section('Party 2 Cancellation Refunds', p2CancelRefunds, true)}
      </div>
    );
  };

  const renderActionPanels = () => {
    if (!isBlockchain) return null;

    const panelStyle: React.CSSProperties = {
      marginTop: '16px',
      padding: '16px',
      border: '1px solid rgba(255,153,0,0.3)',
      borderRadius: '8px',
      background: 'rgba(0,0,0,0.3)',
    };
    const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' };

    return (
      <div style={{ marginTop: '8px' }}>

        {/* ── DEPOSIT GUARANTEE ── */}
        {onChainIsFinalized && onChainStatus !== null && onChainStatus !== 5 && onChainStatus !== 6 && onChainStatus !== 7 && isEitherParty && (
          <>
            {!showDeposit ? (
              <button className={styles.arbitrateButton} onClick={() => setShowDeposit(true)} style={{ marginTop: '8px', marginRight: '8px' }}>
                Deposit to Escrow
              </button>
            ) : (
              <div style={panelStyle}>
                <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Deposit Guarantee to Escrow</h3>
                <p style={labelStyle}>USDC will be transferred from your wallet to the contract escrow.</p>
                <div className={styles.inputRow}>
                  <input
                    type="number"
                    placeholder="Amount in USD (e.g. 500)"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className={styles.input}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className={styles.contractRow}>
                  <button className={styles.cancelButton} onClick={() => setShowDeposit(false)}>Cancel</button>
                  <button
                    className={styles.arbitrateButton}
                    onClick={handleDepositGuarantee}
                    disabled={isDepositing}
                    style={{ marginLeft: '8px' }}
                  >
                    {isDepositing ? 'Approving & Depositing...' : 'Deposit USDC'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MARK ACTIVE ── */}
        {isParty1 && onChainStatus === 3 && (
          <button
            className={styles.arbitrateButton}
            onClick={handleMarkActive}
            disabled={markingActive}
            style={{ marginTop: '8px', marginRight: '8px' }}
          >
            {markingActive ? 'Processing...' : 'Mark Active'}
          </button>
        )}

        {/* ── MARK COMPLETED ── */}
        {isParty1 && (onChainStatus === 3 || onChainStatus === 4) && showEnded && (
          <button
            className={styles.arbitrateButton}
            onClick={handleMarkCompleted}
            disabled={markingCompleted}
            style={{ marginTop: '8px', marginRight: '8px' }}
          >
            {markingCompleted ? 'Processing...' : 'Mark Completed'}
          </button>
        )}

        {/* ── WITHDRAW ESCROW ── */}
        {isParty1 && onChainStatus === 5 && escrowBalanceUSDC > 0 && (
          <>
            {!showWithdraw ? (
              <button className={styles.arbitrateButton} onClick={() => setShowWithdraw(true)} style={{ marginTop: '8px', marginRight: '8px' }}>
                Withdraw Escrow (${escrowBalanceUSDC.toFixed(2)})
              </button>
            ) : (
              <div style={panelStyle}>
                <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Withdraw from Escrow</h3>
                <p style={labelStyle}>Available: ${escrowBalanceUSDC.toFixed(2)} USDC</p>
                <div className={styles.inputRow}>
                  <input
                    type="number"
                    placeholder={`Amount (max ${escrowBalanceUSDC.toFixed(2)})`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className={styles.input}
                    min="0"
                    max={escrowBalanceUSDC}
                    step="0.01"
                  />
                </div>
                <div className={styles.contractRow}>
                  <button className={styles.cancelButton} onClick={() => setShowWithdraw(false)}>Cancel</button>
                  <button
                    className={styles.arbitrateButton}
                    onClick={handleWithdrawEscrow}
                    disabled={isWithdrawing}
                    style={{ marginLeft: '8px' }}
                  >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw USDC'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── DISPUTE ── */}
        {isEitherParty && onChainIsFinalized && onChainStatus !== null &&
         onChainStatus !== 5 && onChainStatus !== 6 && onChainStatus !== 7 && (
          <>
            {!showDispute ? (
              <button
                className={styles.arbitrateButton}
                onClick={() => setShowDispute(true)}
                style={{ marginTop: '8px', marginRight: '8px', background: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', color: '#ef4444' }}
              >
                Raise Dispute
              </button>
            ) : (
              <div style={{ ...panelStyle, border: '1px solid rgba(239,68,68,0.3)' }}>
                <h3 style={{ color: '#ef4444', fontSize: '14px', marginBottom: '8px' }}>Raise Dispute</h3>
                <p style={{ ...labelStyle, marginBottom: '12px' }}>
                  This will freeze the escrow. Both parties must then agree on resolution before funds are released.
                </p>
                <div className={styles.contractRow}>
                  <button className={styles.cancelButton} onClick={() => setShowDispute(false)}>Cancel</button>
                  <button
                    onClick={handleRaiseDispute}
                    disabled={isRaisingDispute}
                    style={{ marginLeft: '8px', padding: '8px 16px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    {isRaisingDispute ? 'Raising...' : 'Confirm Raise Dispute'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RESOLVE DISPUTE ── */}
        {isEitherParty && onChainStatus === 7 && !currentUserHasVotedResolve && (
          <div style={{ ...panelStyle, border: '1px solid rgba(239,68,68,0.3)', marginTop: '16px' }}>
            <h3 style={{ color: '#ef4444', fontSize: '14px', marginBottom: '8px' }}>Resolve Dispute</h3>
            <p style={labelStyle}>Both parties must vote the same way to release the escrow.</p>
            <div className={styles.contractRow}>
              <button
                onClick={() => handleResolveDispute(false)}
                disabled={isResolvingDispute}
                style={{ padding: '8px 14px', background: 'rgba(74,222,128,0.15)', border: '1px solid #4ade80', color: '#4ade80', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Release to Party 1 (Promoter)
              </button>
              <button
                onClick={() => handleResolveDispute(true)}
                disabled={isResolvingDispute}
                style={{ marginLeft: '8px', padding: '8px 14px', background: 'rgba(34,211,238,0.15)', border: '1px solid #22d3ee', color: '#22d3ee', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
              >
                Release to Party 2 (Artist)
              </button>
            </div>
          </div>
        )}
        {isEitherParty && onChainStatus === 7 && currentUserHasVotedResolve && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '8px' }}>
            ✓ You have voted. Waiting for the other party to vote.
          </p>
        )}

        {/* ── OPEN ARBITRATION CASE ── */}
        {isEitherParty && onChainStatus === 7 && contractAddr && (
          <button
            className={styles.arbitrateButton}
            onClick={handleArbitrateClick}
            style={{ marginTop: '8px', marginRight: '8px', background: 'rgba(225,0,255,0.15)', borderColor: '#e100ff', color: '#e100ff' }}
          >
            Open Arbitration Case
          </button>
        )}

        {/* ── CANCEL CONTRACT ── */}
        {isEitherParty && onChainStatus !== null && onChainStatus < 5 && (
          <button
            onClick={handleCancelContract}
            disabled={isCancelling}
            style={{ marginTop: '8px', marginRight: '8px', padding: '8px 14px', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'rgba(239,68,68,0.8)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Contract'}
          </button>
        )}

        {/* ── MARKETPLACE APPROVAL ── */}
        {isParty1 && hasTicketCollection && (
          <>
            {!showMarketplace ? (
              <button className={styles.arbitrateButton} onClick={() => setShowMarketplace(true)} style={{ marginTop: '8px', marginRight: '8px' }}>
                Marketplace Approval
              </button>
            ) : (
              <div style={panelStyle}>
                <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '8px' }}>Approve Secondary Marketplace</h3>
                <p style={labelStyle}>Approved marketplaces can facilitate ticket resales before the show ends.</p>
                <div className={styles.inputRow}>
                  <input
                    type="text"
                    placeholder="Marketplace contract address (0x...)"
                    value={marketplaceAddr}
                    onChange={(e) => setMarketplaceAddr(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.contractRow}>
                  <button className={styles.cancelButton} onClick={() => setShowMarketplace(false)}>Cancel</button>
                  <button
                    className={styles.arbitrateButton}
                    onClick={() => handleSetMarketplaceApproval(true)}
                    disabled={isSettingMarketplace}
                    style={{ marginLeft: '8px' }}
                  >
                    {isSettingMarketplace ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleSetMarketplaceApproval(false)}
                    disabled={isSettingMarketplace}
                    style={{ marginLeft: '8px', padding: '8px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderButtons = () => {
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

    if (source === "current") {
      return (
        <div className={styles.contractRow}>
          <button type="button" className={styles.cancelButton}>Cancel</button>
          <button type="button" className={styles.arbitrateButton} onClick={handleArbitrateClick}>Arbitrate</button>
        </div>
      );
    } else if (source === "negotiation") {
      return (
        <div className={styles.contractRow}>
          <button type="button" className={styles.cancelButton}>Cancel</button>
        </div>
      );
    }
    return null;
  };

  // ─── LOADING STATE ────────────────────────────────────────────────────────

  if (isBlockchain && (chainLoading || !chainData)) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.background} />
          <Head><title>Contract Details - XAO Cult</title></Head>
          <BlankNavbar pageTitle="Contract Details" />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'white' }}>
            <p>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head><title>Contract Details - XAO Cult</title></Head>
        <BlankNavbar pageTitle="Contract Details" />
        <Scrollbar />

        <main className={styles.contractDetailcontainer}>
          {eventDetail && (
            <div className={styles.ImageContainer}>
              <img
                src={
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
                  {"eventImageUri" in eventDetail ? eventDetail.eventName : "title" in eventDetail ? eventDetail.title : "Contract"}
                </h2>
                <span className={styles.promotionLocation}>
                  <img src="/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                  {"eventImageUri" in eventDetail ? eventDetail.venueName : "Location" in eventDetail ? eventDetail.Location : "Unknown Location"}
                </span>
                <span className={styles.promotionDate}>
                  <img src="/Calendar_Days.svg" alt="Date" className={styles.promotionIcon} />
                  {"eventImageUri" in eventDetail ? eventDetail.showDate : "Date" in eventDetail ? eventDetail.Date : "Unknown Date"}
                </span>
                <span className={styles.promotionRevenue}>Tickets Sold: {isBlockchain ? onChainTicketsSold : ticketsold}</span>
                <span className={styles.promotionRevenue}>Total Revenue: {isBlockchain ? onChainTotalRevenue : totalrevenue}</span>
              </div>
            </div>
          )}

          {/* Status badge for on-chain contracts */}
          {isBlockchain && renderStatusBadge()}

          <label className={styles.Leftlabel}>Parties </label>
          <div className={styles.inputRow}>
            <input
              type="text"
              placeholder="Party1"
              className={styles.input}
              required
              value={isBlockchain && party1 ? party1 : address || ''}
              readOnly={!!(isBlockchain && party1)}
              style={{ backgroundColor: isBlockchain && party1 ? "#000" : "white", cursor: isBlockchain && party1 ? "not-allowed" : "text" }}
            />
          </div>
          <div className={styles.inputRow}>
            <input
              type="text"
              placeholder="Party2"
              className={styles.input}
              required
              value={isBlockchain && party2 ? party2 : address || ''}
              readOnly={!!(isBlockchain && party2)}
              style={{ backgroundColor: isBlockchain && party2 ? "#000" : "white", cursor: isBlockchain && party2 ? "not-allowed" : "text" }}
            />
          </div>

          {/* Add Ticket Type Form */}
          {addingTicket && isUserAuthorized() && (
            <div style={{ marginTop: "20px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
              <h3 style={{ color: "white", marginBottom: "15px" }}>Add New Ticket Type</h3>
              <div className={styles.inputRow}>
                <input type="text" placeholder="Ticket Name" value={ticketName} onChange={(e) => setTicketName(e.target.value)} className={styles.input} style={{ marginBottom: "10px" }} />
              </div>
              <div className={styles.inputRow}>
                <input type="number" placeholder="Ticket Price (USD)" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} className={styles.input} style={{ marginBottom: "10px" }} step="0.001" />
              </div>
              <div className={styles.inputRow}>
                <input type="number" placeholder="Ticket Count" value={ticketCount} onChange={(e) => setTicketCount(e.target.value)} className={styles.input} style={{ marginBottom: "15px" }} min="1" />
              </div>
              <div className={styles.contractRow}>
                <button type="button" className={styles.cancelButton} onClick={() => setAddingTicket(false)}>Cancel</button>
                <button type="button" className={styles.arbitrateButton} onClick={handleAddTicketType} disabled={isAddingTier} style={{ marginLeft: "10px" }}>
                  {isAddingTier ? "Adding..." : "Add Ticket"}
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
                <button type="button" className={styles.cancelButton} onClick={() => setShowGrantScanner(false)}>Cancel</button>
                <button type="button" className={styles.arbitrateButton} onClick={handleGrantScannerRole} disabled={isGrantingRole} style={{ marginLeft: "10px" }}>
                  {isGrantingRole ? "Granting..." : "Grant Role"}
                </button>
              </div>
            </div>
          )}

          <CreateContractsection party1={party1 || ''} party2={party2 || ''} initialData={chainInitialData} />

          {/* Payment schedules display */}
          {isBlockchain && renderPaymentSchedules()}

          {/* Lifecycle & escrow actions */}
          {renderActionPanels()}

          {renderButtons()}
        </main>
      </div>
    </Layout>
  );
};

export default Contractsdetail;
