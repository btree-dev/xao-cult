import Head from "next/head";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/CreateContract.module.css";
import ContractsNav from "../../components/ContractsNav";
import Image from "next/image";
import { useRouter } from "next/router";
import CreateContractsection from "./create-contract-section";
import Scrollbar from "../../components/Scrollbar";
import { XaoMsgComponent } from "../../components/Chat";
import { useCreateEventContract } from "../../hooks/useCreateContract";
import { useSignEventContract } from "../../hooks/useSignEventContract";
import { useAddTicketType, useAddTierToXAOTicket, dollarToWei, dateTimeToTimestamp } from "../../hooks/useAddTicketType";
import { percentageToBasisPoints } from "../../backend/contract-services/contractHelpers";
import { useWeb3 } from "../../hooks/useWeb3";
import { useProfileCache } from "../../contexts/ProfileCacheContext";
import { useReadContract } from "wagmi";
import { SHOW_CONTRACT_ABI, XAO_TICKET_ABI } from "../../lib/web3/eventcontract";
import { readContract } from "@wagmi/core";
import { config } from "../../wagmi";
import { useXaoEvent } from "../../hooks/useXaoEvent";
import { useXaoMsgSession } from "../../hooks/useXaoMsgSession";
import { ContractProposalMessage } from "../../types/contractMessage";
import { handleSaveContract, handleSignContract, addTicketsToContract, buildSetupCalldata, addTiersFromRows, handleImageUpload, deleteProposalImageGroup } from "../../backend/contract-services/createContract";
import { useShowContractMulticall, useShowContractConfig } from "../../hooks/useShowContractSchedules";
import { TicketRow } from "./TicketsSection";
import { saveLocalDraft, loadDraft } from "../../lib/xaomsg/offchainContracts";

// ── Toggle this to enable/disable dummy party values ──
const ENABLE_DUMMY_DATA = true;

const CreateContract = () => {
  const router = useRouter();
  const { peer: peerParam, tab: tabParam } = router.query;

  const [selected, setSelected] = useState<"chat" | "contract">("contract");
  const [party1, setParty1] = useState(""); // Wallet address for Party 1 (contract creator)
  const [party2, setParty2] = useState(ENABLE_DUMMY_DATA ? "" : ""); // Wallet address for Party 2 (peer)
  const [isContractCreating, setIsContractCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [creationError, setCreationError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const contractSectionRef = useRef<any>(null);
  // When the Sign button triggers the on-chain deploy (the deploy IS the
  // on-chain step now — Save is device-local), this flag tells the post-deploy
  // effect to continue straight into signing once setup finishes.
  const signAfterDeployRef = useRef(false);

  // Contract proposal state
  const [activeProposal, setActiveProposal] = useState<ContractProposalMessage | null>(null);
  const [revisionNumber, setRevisionNumber] = useState(1);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [savedContractAddress, setSavedContractAddress] = useState<string | null>(null);
  // Track the address of whoever last sent us a proposal (for reply-to logic)
  const [lastProposalSender, setLastProposalSender] = useState<string | null>(null);

  // Copyable "contract address" modal — replaces native alert() (whose text
  // can't be selected/copied, especially on mobile) after save/sign.
  const [addressModal, setAddressModal] = useState<{ title: string; address: string } | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const copyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1500);
    } catch {
      // Clipboard blocked — the readonly input is still selectable as a fallback.
    }
  };

  // Stable per-negotiation identifier the off-chain draft store keys on.
  // Regenerated when the user manually points party2 at a new counterparty
  // (see the party2 input's onChange below); reloaded from a stored/incoming
  // proposal's own draftId so counter-proposals stay attached to the same draft.
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());

  const { address, isConnected, chain } = useWeb3();
  const { currentUserProfile } = useProfileCache();

  // Contract creation hooks
  const { createEventContract, isLoading, isSuccess, error, transactionHash, contractAddress: newContractAddress } = useCreateEventContract(chain?.id);
  const { signContractAsync, isLoading: isSignLoading, isSuccess: isSignSuccess, error: signError, transactionHash: signTxHash } = useSignEventContract();
  const { addTicketTypeAsync } = useAddTicketType();
  const { addTiers } = useAddTierToXAOTicket();
  const { multicall } = useShowContractMulticall();
  const configApi = useShowContractConfig(); // party2 username on sign
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

  // Whether the contract is finalized (both parties signed). Once finalized,
  // ticket tiers are frozen on-chain, so the "Add Tickets On-chain" control below
  // is hidden.
  const { data: contractFinalized, refetch: refetchFinalized } = useReadContract({
    address: contractAddr,
    abi: SHOW_CONTRACT_ABI,
    functionName: 'isFinalized',
    query: { enabled: !!contractAddr },
  });

  // Push any NEW ticket rows (rows beyond what's already on-chain) to the
  // XAOTicket collection while the contract is still in negotiation (saved but
  // not finalized). This is how tickets are added AFTER the initial Save — the
  // Save button only runs once, so without this there is no on-chain path to add
  // a ticket before both parties sign.
  const [isAddingTicketsOnChain, setIsAddingTicketsOnChain] = useState(false);
  const handleAddTicketsOnChain = async () => {
    if (!savedContractAddress) return;
    setIsAddingTicketsOnChain(true);
    try {
      const ticketCollectionAddr = await readContract(config, {
        address: savedContractAddress as `0x${string}`,
        abi: SHOW_CONTRACT_ABI as any,
        functionName: 'ticketCollection',
        args: [],
      }) as `0x${string}`;
      if (!ticketCollectionAddr || ticketCollectionAddr === '0x0000000000000000000000000000000000000000') {
        alert("Ticket collection not found for this contract.");
        return;
      }

      const onChainTierCount = Number(await readContract(config, {
        address: ticketCollectionAddr,
        abi: XAO_TICKET_ABI as any,
        functionName: 'tierCount',
        args: [],
      }));

      const formData = contractSectionRef.current?.getContractData?.();
      const rows: TicketRow[] = formData?.tickets?.ticketRows || [];
      // Tiers are added in order, so on-chain tiers [0..count) map to the first
      // `count` form rows; anything past that is new and needs adding.
      const newRows = rows.slice(onChainTierCount);
      if (newRows.length === 0) {
        alert("No new tickets to add. Add a ticket row in the form first, then tap this.");
        return;
      }

      await addTiersFromRows(
        ticketCollectionAddr,
        newRows,
        (formData as any)?.tickets?.resale,
        (formData as any)?.eventImageUri || imageUri || '',
        addTiers,
      );
      alert(`Added ${newRows.length} new ticket type(s) on-chain.`);
    } catch (err) {
      console.warn("[CreateContract] Add tickets on-chain failed:", err);
      alert("Could not add tickets on-chain: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAddingTicketsOnChain(false);
    }
  };

  // State setters object for backend functions
  const stateSetters = {
    setIsContractCreating,
    setCreationError,
    setIsUploading,
    setTicketRowsToAdd,
  };

  // Derive the DM peer address — must always be the OTHER party, never yourself
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

  // Which role (Party1 or Party2) I actually hold in this negotiation.
  // Compared case-insensitively since addresses can arrive checksummed from
  // one side and lowercased from the other (wallet libs aren't consistent
  // about this), which used to make strict `===` comparisons fall through.
  // Defaults to null (treated as Party1) for a brand-new contract before the
  // party1 effect has populated from `address`.
  const myRole = useMemo<'party1' | 'party2' | null>(() => {
    const myAddr = address?.toLowerCase();
    if (!myAddr) return null;
    if (party1 && party1.toLowerCase() === myAddr) return 'party1';
    if (party2 && party2.toLowerCase() === myAddr) return 'party2';
    return null;
  }, [address, party1, party2]);

  // Write party1/party2 onto an outgoing contract payload using whichever
  // role I actually hold in this negotiation — never assume "I am Party1"
  // just because I'm the one clicking Send. Party1 is whoever created the
  // contract; that never changes, even when Party2 sends a counter-proposal.
  const applyPartyRoles = useCallback((formData: any) => {
    if (myRole === 'party2') {
      formData.party1 = peerAddress;
      formData.party2 = address;
    } else {
      formData.party1 = address;
      formData.party2 = peerAddress;
    }
  }, [myRole, address, peerAddress]);

  // Load a stored proposal (if navigating from Chat/Negotiation) — or, if
  // there isn't one, fall back to the connected-wallet/URL-param defaults.
  // These two concerns are deliberately ONE effect, not two separate ones —
  // splitting them raced (see git history). But merging them into one effect
  // wasn't sufficient by itself: this app has `reactStrictMode: true`
  // (next.config.js), which deliberately double-invokes every effect in dev
  // (mount → cleanup → mount again) to surface exactly this class of bug.
  // Invocation 1 reads sessionStorage, applies the proposal's party1/party2,
  // and clears it. Invocation 2 runs immediately after, in the same commit,
  // against the SAME stale render closure — sessionStorage is now empty (a
  // real synchronous side effect invocation 1 already made, not something
  // React can "undo" between the two invocations), so invocation 2 falls
  // into the defaults branch. If that branch reads `party1`/`party2`
  // straight from the closure (which still shows their pre-effect values,
  // since no new render has happened between the two invocations), it
  // clobbers invocation 1's correct values with the viewer's own address —
  // observed live as both Party1 and Party2 showing the same address.
  // Functional state updates fix this: React threads each queued update's
  // `prev` through the next one in the same batch, so by the time
  // invocation 2's updater runs, `prev` already reflects invocation 1's
  // result — not the stale closure.
  useEffect(() => {
    const storedProposal = sessionStorage.getItem("selectedContractProposal");
    if (storedProposal) {
      try {
        const proposal = JSON.parse(storedProposal) as ContractProposalMessage;
        console.log("[CreateContract] Loaded proposal from sessionStorage:", proposal);
        setActiveProposal(proposal);
        setRevisionNumber(proposal.revisionNumber + 1);
        // IContract has no draftId field (it's a Waku-only addition on top of
        // the shared contract-terms shape), so read it via a narrow cast —
        // same pattern useXaoDm.ts uses for the same field on the same type.
        const storedDraftId = (proposal.data as { draftId?: unknown }).draftId;
        if (storedDraftId) setDraftId(String(storedDraftId));
        if (proposal.data.party1) setParty1(proposal.data.party1);
        if (proposal.data.party2) setParty2(proposal.data.party2);
        if (proposal.data.contractAddress) setSavedContractAddress(proposal.data.contractAddress);
        if (proposal.proposedBy) setLastProposalSender(proposal.proposedBy);
        // Clear the stored proposal after loading
        sessionStorage.removeItem("selectedContractProposal");
        return;
      } catch (err) {
        console.error("[CreateContract] Failed to parse stored proposal:", err);
        sessionStorage.removeItem("selectedContractProposal");
      }
    }

    // No stored proposal this pass — apply the connected-wallet/URL-param
    // defaults, but only if nothing already set a value (functional form —
    // see the comment above this effect for why the condition can't safely
    // read `party1`/`party2` from the closure).
    if (peerParam && typeof peerParam === "string") {
      setParty2((prev) => prev || String(peerParam));
    }
    if (address) {
      setParty1((prev) => prev || address);
    }
  }, [address, peerParam, party1, party2]);

  // Waku session + event thread (this draft's own thread — never the DM
  // thread) for sending contract proposals and the mint SYSTEM message.
  const { session, unlock, isUnlocking, error: sessionError, isWalletReady } = useXaoMsgSession();
  const eventThread = useXaoEvent({
    draftId,
    peer: peerAddress && peerAddress.startsWith('0x') ? (peerAddress as `0x${string}`) : null,
    session,
  });
  const isClientReady = eventThread.status === 'ready';

  // Keep refs to the latest postProposal/postSystem/notifyThread so
  // useEffect closures (below) always use the current event thread instead
  // of a stale one captured when the effect was first set up.
  const postProposalRef = useRef(eventThread.postProposal);
  postProposalRef.current = eventThread.postProposal;
  const postSystemRef = useRef(eventThread.postSystem);
  postSystemRef.current = eventThread.postSystem;
  const notifyThreadRef = useRef(eventThread.notifyThread);
  notifyThreadRef.current = eventThread.notifyThread;

  // Handle receiving a contract proposal from chat
  const handleContractProposalSelect = useCallback((proposal: ContractProposalMessage) => {
    setActiveProposal(proposal);
    setRevisionNumber(proposal.revisionNumber + 1);
    const incomingDraftId = (proposal.data as { draftId?: unknown }).draftId;
    if (incomingDraftId) setDraftId(String(incomingDraftId));
    // Pre-fill party addresses from proposal if available
    if (proposal.data.party1) setParty1(proposal.data.party1);
    if (proposal.data.party2) setParty2(proposal.data.party2);
    if (proposal.data.contractAddress) setSavedContractAddress(proposal.data.contractAddress);
    // Track who sent this proposal so we can reply to them
    if (proposal.proposedBy) setLastProposalSender(proposal.proposedBy);
    // Switch to contract view to show the form
    setSelected("contract");
  }, []);

  // Send contract proposal to Party2 over Waku
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

      // Upload image to IPFS via Pinata (or reuse existing URI). Best-effort:
      // an image upload hiccup must not block sending the proposal.
      try {
        await handleImageUpload(termsObject, setIsUploading, imageUri);
        if (termsObject.eventImageUri) {
          setImageUri(termsObject.eventImageUri);
        }
      } catch (imgErr) {
        console.warn('[CreateContract] Proposal image upload failed (sending without a new upload):', imgErr);
      }

      // Remove base64 imageData before sending over Waku
      if (termsObject.promotion) {
        delete termsObject.promotion.imageData;
      }

      // Include contract address if contract was already created on-chain
      if (savedContractAddress) {
        termsObject.contractAddress = savedContractAddress;
      }
      termsObject.draftId = draftId;
      // Force party1/party2 to ground truth (my own wallet / the resolved
      // counterparty) rather than trusting getContractData()'s echoed-back
      // party1/party2 props — those can be corrupted by a previously
      // *received* proposal's own party1/party2 (see handleContractProposalSelect
      // and the sessionStorage-load effect below, which copy the sender's
      // party1/party2 verbatim into local state with no re-validation), and
      // an outgoing send must never re-broadcast that corruption. Preserve
      // whichever role I actually hold (see applyPartyRoles) instead of
      // always forcing myself into Party1.
      applyPartyRoles(termsObject);

      // Send the proposal
      await eventThread.postProposal({
        kind: activeProposal ? 'counter-proposal' : 'proposal',
        revisionNumber,
        data: termsObject,
      });

      // Let both parties discover this thread on next login even without
      // opening anything (spec §7) — idempotent, safe to call on every send.
      await eventThread.notifyThread().catch((err) => {
        console.warn('[CreateContract] Failed to publish event discovery notice:', err);
      });

      // Update revision number for next edit
      setRevisionNumber((prev) => prev + 1);

      // Clear active proposal since we've sent a new one
      setActiveProposal(null);

      // Switch to chat view to see the sent message
      setSelected("chat");
    } catch (err) {
      console.error("Failed to send proposal:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setCreationError(`Failed to send proposal: ${msg}`);
    } finally {
      setIsSendingProposal(false);
    }
  };

  // Save = device-local draft ONLY (no blockchain, no gas). Lets the user step
  // away and come back to keep editing — before sending to the other party and
  // during negotiation. Putting the contract ON-CHAIN happens when they SIGN.
  const handleSave = async () => {
    try {
      const termsObject = contractSectionRef.current?.getContractData
        ? contractSectionRef.current.getContractData()
        : { party1, party2 };

      // Upload the selected promotion image to IPFS so the draft carries an
      // eventImageUri — the form restore and the Negotiation preview both render
      // from that, not from the (stripped) base64 imageData. Best-effort: if the
      // upload fails, still save the rest of the draft.
      try {
        await handleImageUpload(termsObject, setIsUploading, imageUri);
        if (termsObject.eventImageUri) setImageUri(termsObject.eventImageUri);
      } catch (imgErr) {
        console.warn('[CreateContract] Draft image upload failed (saving without image):', imgErr);
      }

      if (termsObject.promotion) delete termsObject.promotion.imageData;
      termsObject.draftId = draftId;
      applyPartyRoles(termsObject);

      const ZERO = '0x0000000000000000000000000000000000000000';
      const isAddr = (a: unknown): a is `0x${string}` =>
        typeof a === 'string' && a.startsWith('0x') && a.length === 42 && a.toLowerCase() !== ZERO;

      // Preserve the ORIGINAL parties from an existing draft. party1 (the creator)
      // must never change, and editing (e.g. party2 reopening party1's draft) must
      // not reassign it — otherwise a mis-resolved role (peer address not ready)
      // could overwrite party1 with the editor's own address, and the draft would
      // stop matching party1 and vanish from their Negotiation list.
      const existing = loadDraft(draftId);
      const p1 = (isAddr(existing?.party1) ? existing!.party1
        : isAddr(termsObject.party1) ? termsObject.party1
        : (address || ZERO)) as `0x${string}`;
      const p2 = (isAddr(existing?.party2) ? existing!.party2
        : isAddr(termsObject.party2) ? termsObject.party2
        : (peerAddress || ZERO)) as `0x${string}`;
      termsObject.party1 = p1;
      termsObject.party2 = p2;

      saveLocalDraft({
        draftId,
        party1: p1,
        party2: p2,
        terms: termsObject,
        revisionNumber,
        approvals: existing?.approvals || [],
        lastActivityUnixMs: Date.now(),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 4000);
    } catch (err) {
      console.warn('[CreateContract] Save draft failed:', err);
      alert('Could not save the draft to this device.');
    }
  };

  // Sign = the on-chain step. If the contract isn't on-chain yet, signing first
  // DEPLOYS it (creator / Party 1), then adds the signature; the post-deploy
  // effect continues into signing via signAfterDeployRef. If it's already
  // on-chain (Party 2, or a re-sign), this just adds the signature.
  const handleSign = async () => {
    // Not on-chain yet → this Sign deploys the contract.
    if (!savedContractAddress) {
      if (myRole === 'party2') {
        alert(
          "Party 1 must sign first — signing is what puts the contract on-chain. " +
          "Once Party 1 has signed, you can review and add your signature."
        );
        return;
      }
      const proceed = window.confirm(
        "Signing places this contract ON-CHAIN and adds your signature. After both parties sign, the terms and ticket types become final.\n\nContinue?"
      );
      if (!proceed) return;
      signAfterDeployRef.current = true;
      setIsSigning(true);
      setIsContractCreating(true);
      // Deploy now — processContractCreation will continue into signing.
      handleSaveContract(
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
      return;
    }

    // Already on-chain → just add my signature.
    const proceed = window.confirm(
      "Signing is final. Once both parties have signed, the contract is LOCKED — nothing can be changed after that: not the terms, dates, or ticket types.\n\nIf you still want to change anything, cancel and do it now. Continue to sign?"
    );
    if (!proceed) return;
    setIsSigning(true);
    try {
      // If I'm party2, record my XAO username on-chain — the constructor leaves
      // party2.xaoUsername empty and only party2 can set it. Best-effort: a
      // failure here (e.g. older contract without the setter) must not block signing.
      if (myRole === 'party2' && savedContractAddress && currentUserProfile?.username) {
        try {
          await configApi.setParty2Username(savedContractAddress as `0x${string}`, currentUserProfile.username);
        } catch (err) {
          console.warn('[CreateContract] setParty2Username failed (non-blocking):', err);
        }
      }
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

          // Push ALL Draft setup (payment schedules, payouts, cancellation
          // refunds, genres, tickets-sale date, resale splits) in a SINGLE
          // multicall — one wallet confirmation instead of one per field.
          // These setters are onlyParty1 + notFinalized; multicall preserves
          // msg.sender, and the deployer is on-chain party1 while still Draft.
          try {
            const scheduleData = contractSectionRef.current?.getContractData
              ? contractSectionRef.current.getContractData()
              : null;
            if (scheduleData) {
              const calls = buildSetupCalldata(scheduleData);
              if (calls.length > 0) {
                await multicall(newContractAddress, calls);
              }
            }
          } catch (schedErr) {
            console.warn("[CreateContract] Failed to add contract setup (multicall):", schedErr);
          }

          // Add the XAOTicket tiers now, while the contract is still in Draft.
          // The collection is deployed up-front (in the ShowContract constructor),
          // so it already exists at Save time — and once BOTH parties sign,
          // XAOTicket.addTier reverts (tiers frozen). Defining tiers here is what
          // makes "the ticket types set at on-chain save are the ones sold."
          try {
            const ticketCollectionAddr = await readContract(config, {
              address: newContractAddress as `0x${string}`,
              abi: SHOW_CONTRACT_ABI as any,
              functionName: 'ticketCollection',
              args: [],
            }) as `0x${string}`;

            if (ticketCollectionAddr && ticketCollectionAddr !== '0x0000000000000000000000000000000000000000') {
              const formData = contractSectionRef.current?.getContractData?.();
              const rows: TicketRow[] = formData?.tickets?.ticketRows || ticketRowsToAdd || [];
              await addTiersFromRows(
                ticketCollectionAddr,
                rows,
                (formData as any)?.tickets?.resale,
                (formData as any)?.eventImageUri || imageUri || '',
                addTiers,
              );
            }
          } catch (tierErr) {
            console.warn("[CreateContract] Failed to add ticket tiers at save:", tierErr);
          }

          setIsContractCreating(false);

          // Send proposal with the new contract address, then the SYSTEM
          // "minted" message — deploying this ShowContract is the design's
          // "mint on-chain" step (see docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md §7);
          // the SYSTEM message is what lets the peer's off-chain draft store
          // retire this draftId exactly, without relying on the fallback heuristic.
          if (isClientReady && postProposalRef.current && postSystemRef.current) {
            try {
              const termsObject = contractSectionRef.current?.getContractData
                ? contractSectionRef.current.getContractData()
                : { party1, party2 };

              if (termsObject.promotion) {
                delete termsObject.promotion.imageData;
              }
              termsObject.contractAddress = newContractAddress;
              termsObject.draftId = draftId;
              // See the identical comment in handleSendProposal — never
              // re-broadcast a possibly-corrupted party1/party2, and preserve
              // whichever role I actually hold.
              applyPartyRoles(termsObject);

              await postProposalRef.current({
                kind: activeProposal ? 'counter-proposal' : 'proposal',
                revisionNumber,
                data: termsObject,
              });
              setRevisionNumber((prev) => prev + 1);

              await postSystemRef.current({
                kind: 'system', event: 'minted', draftId, contractAddress: newContractAddress,
              });

              // Publish the mint pairing to both inboxes — this is what lets
              // useResolveEventThread map this contract's address back to
              // this same thread later, on any device (spec §5, §7).
              await notifyThreadRef.current(newContractAddress).catch((err) => {
                console.warn('[CreateContract] Failed to publish mint notice:', err);
              });

              console.log("[CreateContract] Sent draft contract proposal + minted notice to party2");
            } catch (err) {
              console.warn("Failed to send draft proposal to party2:", err);
            }
          }

          // The deploy is the on-chain step, triggered by the Sign button. Now
          // continue into the actual signature so one click = deploy + sign.
          if (signAfterDeployRef.current) {
            signAfterDeployRef.current = false;
            try {
              await handleSignContract(
                isConnected,
                chain?.id,
                newContractAddress,
                party1,
                stateSetters,
                signContractAsync,
                contractSectionRef
              );
            } catch (signErr) {
              console.warn('[CreateContract] Sign after deploy failed:', signErr);
              setIsSigning(false);
              setAddressModal({ title: 'Contract is on-chain — tap Sign to finish', address: String(newContractAddress) });
            }
          } else {
            setAddressModal({ title: 'Contract placed on blockchain', address: String(newContractAddress) });
          }
        } catch (err) {
          setCreationError(err instanceof Error ? err.message : "Failed to process contract");
          setIsContractCreating(false);
          setIsSigning(false);
          signAfterDeployRef.current = false;
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

        // Ticket tiers are NOT added here anymore — they are defined at Save time
        // (see processContractCreation above), while the contract is still in
        // Draft. Signing finalizes the contract, which permanently freezes the
        // tiers on-chain (XAOTicket.addTier reverts once ShowContract.isFinalized).

        setAddressModal({ title: 'Contract signed successfully on blockchain', address: String(contractAddrToShare) });
        router.push("/dashboard");

        // Send proposal and cleanup in background (non-blocking)
        try {
          deleteProposalImageGroup(contractSectionRef);
        } catch (err) {
          console.warn("Failed to delete proposal image group:", err);
        }

        if (isClientReady && contractAddrToShare && postProposalRef.current) {
          try {
            const termsObject = contractSectionRef.current?.getContractData
              ? contractSectionRef.current.getContractData()
              : { party1, party2 };

            if (termsObject.promotion) {
              delete termsObject.promotion.imageData;
            }

            termsObject.contractAddress = contractAddrToShare;
            termsObject.draftId = draftId;
            // See the identical comment in handleSendProposal — never
            // re-broadcast a possibly-corrupted party1/party2, and preserve
            // whichever role I actually hold.
            applyPartyRoles(termsObject);

            postProposalRef.current({
              kind: activeProposal ? 'counter-proposal' : 'proposal',
              revisionNumber,
              data: termsObject,
            })
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

  // Honor an incoming tab=chat query param (used when Search links here to
  // open the draft's chat directly, per spec §7).
  useEffect(() => {
    if (tabParam === "chat") {
      setSelected("chat");
    }
  }, [tabParam]);

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
              <XaoMsgComponent
                draftId={draftId}
                peer={peerAddress && peerAddress.startsWith('0x') ? (peerAddress as `0x${string}`) : null}
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
                    <label className={styles.ticketsLabel}>
                      Party 1{currentUserProfile?.username ? ` - ${currentUserProfile.username}` : ""}
                    </label>
                    <div className={styles.inputRow}>
                      <input
                        type="text"
                        value={party1}
                        placeholder="Party1"
                        className={styles.input}
                        readOnly
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
                          // User manually entered a new party2 address — reset reply-to
                          // tracking and start a fresh off-chain draft for this negotiation.
                          setLastProposalSender(null);
                          setDraftId(crypto.randomUUID());
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

                {/* Save Draft Button — saves to THIS DEVICE only (no blockchain,
                    no gas). Re-savable; the on-chain step is Sign. */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isContractCreating || isSigning || isUploading}
                  className={styles.confirmButton}
                >
                  {isUploading ? "Uploading Image..." : "Save Draft"}
                </button>

                {draftSaved && (
                  <div style={{ color: "#35C08A", marginTop: "8px", fontSize: "13px" }}>
                    ✓ Draft saved to this device — you can come back to it later.
                  </div>
                )}

                {/* On-chain notice — set once Sign has deployed the contract. */}
                {savedContractAddress && (
                  <div style={{ color: "#ff9900", marginTop: "10px", fontSize: "13px" }}>
                    On-chain: {savedContractAddress.slice(0, 10)}...{savedContractAddress.slice(-8)}
                  </div>
                )}

                {/* Ticket types are set ONLY in the Tickets section above, before
                    signing — they are added on-chain when the contract is signed,
                    and none can be added afterward. (The old post-deploy "Add
                    Tickets On-chain" control was removed for that reason.) */}

                {/* Unlock Chat — the "Send to Party" proposal travels over the
                    encrypted XaoMsg (Waku) thread, which needs a one-time wallet
                    signature to derive the chat session. Without it `session` is
                    null and the send button below can never enable, so surface
                    the unlock right here instead of forcing a trip to the Chat
                    page. Shown only while there is no session yet. */}
                {!session && (
                  <button
                    type="button"
                    onClick={() => { void unlock(); }}
                    disabled={isUnlocking || !isWalletReady}
                    className={styles.documentButton}
                    style={{
                      marginTop: "10px",
                      opacity: (!isWalletReady || isUnlocking) ? 0.5 : 1,
                    }}
                  >
                    {isUnlocking ? "Unlocking chat…" : "Unlock Chat to Send"}
                  </button>
                )}

                {/* Why the send button is disabled — branch on the REAL event-thread
                    status so the user knows whether to wait (negotiating), fix an
                    input (no peer address / no session), or that the counterparty
                    hasn't set up chat yet (no-peer-key). Encrypted proposals need the
                    recipient's published chat key, so party2 must unlock chat once
                    before party1 can send to them. */}
                {(!peerAddress || !isClientReady) && (
                  <div style={{ color: "#ff9900", marginTop: "8px", fontSize: "12px", lineHeight: 1.5 }}>
                    {!peerAddress && (
                      <div>• Enter the other party&apos;s wallet address (0x…) in the Party {myRole === 'party2' ? '1' : '2'} field.</div>
                    )}
                    {peerAddress && !session && (
                      <div>• Tap &quot;Unlock Chat to Send&quot; above and approve the signature.</div>
                    )}
                    {peerAddress && session && eventThread.status === 'negotiating' && (
                      <div>• Connecting secure chat… this can take up to ~15s.</div>
                    )}
                    {peerAddress && session && eventThread.status === 'no-peer-key' && (
                      <div style={{ color: "#ff5f6d" }}>
                        • The other party hasn&apos;t set up chat yet. Ask them to open XAO, connect this
                        wallet, and unlock chat once — then tap Send again.
                      </div>
                    )}
                    {peerAddress && session && eventThread.status === 'error' && (
                      <div style={{ color: "#ff5f6d" }}>• Secure chat failed to connect. Refresh and try again.</div>
                    )}
                  </div>
                )}

                {sessionError && (
                  <div style={{ color: "#ff5f6d", marginTop: "6px", fontSize: "12px" }}>{sessionError}</div>
                )}

                {/* Send Proposal Button */}
                <button
                  type="button"
                  onClick={handleSendProposal}
                  disabled={isSendingProposal || !peerAddress || !isClientReady}
                  className={styles.documentButton}
                  style={{
                    marginTop: "10px",
                    marginBottom: "10px",
                    opacity: (!peerAddress || !isClientReady) ? 0.5 : 1,
                  }}
                >
                  {isSendingProposal
                    ? "Sending..."
                    : `Send to ${myRole === 'party2' ? "Party 1" : "Party 2"} (Rev. ${revisionNumber})`}
                </button>

                {/* Sign Button — the on-chain step. Enabled without an on-chain
                    contract too: for Party 1 the first Sign deploys + signs. */}
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={isSigning || isContractCreating || isLoading || isUploading || !isConnected || hasAlreadySigned}
                  className={styles.documentButton}
                  style={{
                    opacity: (hasAlreadySigned || !isConnected) ? 0.4 : 1,
                  }}
                >
                  {isSigning
                    ? "Signing..."
                    : hasAlreadySigned
                      ? "Already Signed"
                      : savedContractAddress ? "Sign" : "Sign & Place On-chain"}
                </button>

              </>
            )}
          </div>
        </main>
      </div>

      {addressModal && (
        <div
          onClick={() => setAddressModal(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 360, padding: 24, borderRadius: 18,
              border: "1px solid transparent",
              backgroundImage:
                "linear-gradient(#111,#111), linear-gradient(to right,#ff9900,#e100ff)",
              backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
            }}
          >
            <h3 style={{ color: "#fff", margin: "0 0 6px", fontSize: 16 }}>✓ {addressModal.title}</h3>
            <p style={{ color: "#aaa", margin: "0 0 8px", fontSize: 13 }}>Contract address:</p>
            <input
              readOnly
              value={addressModal.address}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                width: "100%", boxSizing: "border-box", background: "#000", color: "#fff",
                border: "1px solid #444", borderRadius: 10, padding: "10px 12px",
                fontSize: 12, marginBottom: 14, fontFamily: "monospace",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => copyAddress(addressModal.address)}
                style={{
                  flex: 1, padding: 10, borderRadius: 30, border: "none",
                  background: "linear-gradient(to right,#ff9900,#e100ff)",
                  color: "#fff", fontWeight: "bold", cursor: "pointer",
                }}
              >
                {addressCopied ? "Copied!" : "Copy Address"}
              </button>
              <button
                type="button"
                onClick={() => setAddressModal(null)}
                style={{
                  flex: 1, padding: 10, borderRadius: 30, border: "1px solid #444",
                  background: "transparent", color: "#fff", cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CreateContract;
