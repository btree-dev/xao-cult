import React, { useEffect } from "react";
import Head from "next/head";
import { Inter } from "next/font/google";
import Layout from "../../components/Layout";
import ContractsNav from "../../components/ContractsNav";
import styles from "../../styles/CreateContract.module.css";
import { useAllContractsWithSummaries, formatContractDate } from "../../hooks/useGetContracts";
import { useWeb3 } from "../../hooks/useWeb3";
import { useRouter } from "next/router";
import { useOffchainContracts } from "../../hooks/useOffchainContracts";
import { useXaoMsgSession } from "../../hooks/useXaoMsgSession";
import { syncAllKnownThreads } from "../../lib/xaomsg/sync";
import { dismissDraft, negotiationState, type OffchainContractDraft, type NegotiationState } from "../../lib/xaomsg/offchainContracts";
import { CONTRACT_MESSAGE_VERSION, type ContractProposalMessage } from "../../types/contractMessage";

// Figma spec for the Inbox state labels: Inter Bold.
const inter = Inter({ subsets: ["latin"], weight: ["700"] });

const Negotiation: React.FC = () => {
  const router = useRouter();
  const { address, chain } = useWeb3();
  const { contracts, isLoading } = useAllContractsWithSummaries(chain?.id);
  const { drafts, reload } = useOffchainContracts(contracts);
  const { session, unlock, isUnlocking, isWalletReady, signStep } = useXaoMsgSession();
  const [syncing, setSyncing] = React.useState(false);

  // Manually pull the inbox again — for a party2 whose incoming draft hasn't
  // appeared yet (Waku store propagation, or they just unlocked chat).
  const handleRefresh = async () => {
    if (!address || !session) return;
    setSyncing(true);
    try {
      await syncAllKnownThreads(address, session);
      reload();
    } catch (err) {
      console.warn("[Negotiation] manual refresh failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Off-chain drafts (e.g. a proposal the counterparty sent over chat before any
  // on-chain save) only land in the local draft store once an inbox sync has run.
  // That normally happens at login (unlock-chat) or while the Search page is open
  // — NOT on this page — so a party2 who navigates straight here would see nothing.
  // Backfill the inbox on mount (once the chat session is unlocked), then re-read
  // the store so freshly-received drafts show without visiting Search first.
  useEffect(() => {
    if (!address || !session) return;
    let cancelled = false;
    void syncAllKnownThreads(address, session)
      .then(() => { if (!cancelled) reload(); })
      .catch((err) => console.warn("[Negotiation] inbox sync failed:", err));
    return () => { cancelled = true; };
  }, [address, session, reload]);

  console.log("=== NEGOTIATION DEBUG ===");
  console.log("Connected address:", address);
  console.log("Chain ID:", chain?.id);
  console.log("All contracts:", contracts);

  const myAddr = address?.toLowerCase();

  // Inbox state → gradient (drives both the card border and the gradient-filled
  // label) + label text. The Inbox shows the whole negotiation: off-chain drafts
  // AND on-chain contracts that aren't finalized yet (deployed but still awaiting
  // both signatures). Only a FULLY finalized contract leaves the Inbox. Gradients
  // are the Figma values.
  const STATE_STYLE: Record<NegotiationState, { gradient: string; label: string }> = {
    attention: { gradient: "linear-gradient(90deg, #F6FF00 0%, #F6FF00 100%)", label: "Requires Attention" },
    waiting: { gradient: "linear-gradient(90deg, #00FFB2 0%, #66FF00 100%)", label: "Waiting" },
    saved: { gradient: "linear-gradient(90deg, #00FFE5 0%, #001AFF 100%)", label: "Saved" },
  };

  // On-chain contracts still in negotiation: I'm a party, it's NOT finalized
  // (both parties haven't signed), and it isn't cancelled/disputed. These would
  // otherwise vanish from the Inbox once party1 signs (the off-chain draft gets
  // marked minted and filtered out) even though party2 still has to sign.
  // party1Signed mirrors isFinalized in the summary (no per-party sign flag), so
  // state is by role: party1 (deployed + signed) is Waiting; party2 owes a
  // signature → Requires Attention.
  const myPendingContracts = contracts.filter((c) => {
    const mine = !!myAddr && (c.party1Address.toLowerCase() === myAddr || c.party2Address.toLowerCase() === myAddr);
    const finalized = c.party1Signed; // == isFinalized (see useGetContracts)
    const terminal = c.status === 6 || c.status === 7; // CANCELLED / DISPUTED
    return mine && !finalized && !terminal;
  });

  const handleImageClick = (c: (typeof contracts)[number]) => {
    router.push({
      pathname: "/contracts/contracts-detail",
      query: { id: c.contractAddress, party1: c.party1Address, party2: c.party2Address, source: "negotiation" },
    });
  };

  // Permanently delete a device-local draft (also blocks a later sync from
  // restoring it). Used to clear old/stale off-chain drafts.
  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this off-chain draft from this device? This can't be undone.")) return;
    dismissDraft(draftId);
    reload();
  };

  const handleDraftClick = (draft: OffchainContractDraft) => {
    const myAddr = address?.toLowerCase();
    const peer = draft.party1.toLowerCase() === myAddr ? draft.party2 : draft.party1;
    const proposal: ContractProposalMessage = {
      type: "contract-proposal",
      version: CONTRACT_MESSAGE_VERSION,
      data: draft.terms,
      sentAt: draft.lastActivityUnixMs,
      proposedBy: peer,
      revisionNumber: draft.revisionNumber,
    };
    sessionStorage.setItem("selectedContractProposal", JSON.stringify(proposal));
    router.push(`/contracts/create-contract?peer=${encodeURIComponent(peer)}`);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Inbox - XAO Cult</title>
        </Head>
        <ContractsNav />
        <main className={styles.contractHomecontainer}>
          <div className={styles.topSection}>
            <h1 className={styles.heading}>Inbox</h1>
          </div>

          {/* Incoming off-chain drafts arrive over encrypted chat. Receiving them
              needs the chat session unlocked; and because Waku history can take a
              few seconds to propagate, offer a manual pull too. */}
          {!session ? (
            <div style={{ textAlign: "center", margin: "0 auto 16px", maxWidth: 420, color: "#ff9900", fontSize: 13, lineHeight: 1.5 }}>
              Unlock chat to receive drafts the other party sends you.
              <div>
                <button
                  type="button"
                  onClick={() => { void unlock(); }}
                  disabled={isUnlocking || !isWalletReady}
                  className={styles.confirmButton}
                  style={{ marginTop: 10, maxWidth: 240, opacity: (isUnlocking || !isWalletReady) ? 0.5 : 1 }}
                >
                  {isUnlocking ? `Unlocking chat… (signature ${signStep || 1} of 2)` : "Unlock Chat"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={syncing}
                className={styles.confirmButton}
                style={{ maxWidth: 240, opacity: syncing ? 0.6 : 1 }}
              >
                {syncing ? "Checking for drafts…" : "Refresh drafts"}
              </button>
            </div>
          )}
          {session && drafts.length === 0 && myPendingContracts.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "30px 0" }}>
              Nothing in your inbox yet. Create a contract to get started.
            </div>
          )}
          {drafts.map((draft) => {
            const terms = draft.terms as {
              promotion?: { value?: string };
              eventImageUri?: string;
              location?: { venueName?: string };
              datesAndTimes?: { eventStartDate?: string };
            };
            const eventName = terms.promotion?.value || "Untitled draft";
            const imageUri = terms.eventImageUri;
            const venue = terms.location?.venueName;
            const dateRaw = terms.datesAndTimes?.eventStartDate;
            const dateLabel = dateRaw ? new Date(dateRaw).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "long" }) : "";
            const st = STATE_STYLE[negotiationState(draft, myAddr)];
            return (
              <div
                key={draft.draftId}
                className={styles.ImageContainer}
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => handleDraftClick(draft)}
              >
                <button
                  type="button"
                  onClick={(e) => handleDeleteDraft(e, draft.draftId)}
                  title="Delete draft"
                  aria-label="Delete draft"
                  style={{
                    position: "absolute", top: "8px", right: "8px", zIndex: 3,
                    width: "28px", height: "28px", borderRadius: "50%", border: "none",
                    background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer",
                    fontSize: "15px", lineHeight: 1, display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  ✕
                </button>
                <span
                  style={{
                    position: "absolute", top: "8px", left: "8px", zIndex: 3,
                    padding: "3px 10px", borderRadius: "12px", background: "rgba(0,0,0,0.65)",
                    color: "#fff", fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  Off-chain
                </span>
                <img
                  src={imageUri || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"}
                  alt={eventName}
                  className={styles.waitingImage}
                  // Same technique as .waitingImage (transparent border + gradient
                  // painted in the border-box) but recoloured to the state gradient.
                  style={{ border: "3px solid transparent", background: `${st.gradient} border-box` }}
                />
                <div className={styles.AttentionDetailsOverlay}>
                  <h2 className={styles.promotionTitle}>{eventName}</h2>
                  {venue && (
                    <span className={styles.promotionLocation}>
                      <img src="/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                      {venue}
                    </span>
                  )}
                  {dateLabel && (
                    <span className={styles.promotionDate}>
                      <img src="/Calendar_Days.svg" alt="Date" className={styles.promotionIcon} />
                      {dateLabel}
                    </span>
                  )}
                </div>
                <div
                  className={`${styles.waitingTitle} ${inter.className}`}
                  style={{
                    backgroundImage: st.gradient,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    fontWeight: 700,
                    fontSize: 28,
                    lineHeight: "100%",
                    letterSpacing: "-0.45px",
                    // Let the long "Requires Attention" wrap/center instead of
                    // overflowing the card at 38px.
                    // whiteSpace: "normal",
                    textAlign: "center",
                    maxWidth: "92%",
                  }}
                >
                  {st.label}
                </div>
              </div>
            );
          })}

          {/* On-chain contracts still in negotiation (deployed, not finalized). */}
          {myPendingContracts.map((c) => {
            const state: NegotiationState = c.party1Address.toLowerCase() === myAddr ? "waiting" : "attention";
            const st = STATE_STYLE[state];
            const dateLabel = c.showDate && c.showDate > BigInt(0) ? formatContractDate(c.showDate) : "";
            return (
              <div
                key={c.contractAddress}
                className={styles.ImageContainer}
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => handleImageClick(c)}
              >
                <span
                  style={{
                    position: "absolute", top: "8px", left: "8px", zIndex: 3,
                    padding: "3px 10px", borderRadius: "12px", background: "rgba(0,0,0,0.65)",
                    color: "#fff", fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px",
                    border: "1px solid rgba(0,255,178,0.6)",
                  }}
                >
                  On-chain
                </span>
                <img
                  src={c.eventImageUri || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80"}
                  alt={c.eventName}
                  className={styles.waitingImage}
                  style={{ border: "3px solid transparent", background: `${st.gradient} border-box` }}
                />
                <div className={styles.AttentionDetailsOverlay}>
                  <h2 className={styles.promotionTitle}>{c.eventName}</h2>
                  {c.venueName && (
                    <span className={styles.promotionLocation}>
                      <img src="/Map_Pin.svg" alt="Location" className={styles.promotionIcon} />
                      {c.venueName}
                    </span>
                  )}
                  {dateLabel && (
                    <span className={styles.promotionDate}>
                      <img src="/Calendar_Days.svg" alt="Date" className={styles.promotionIcon} />
                      {dateLabel}
                    </span>
                  )}
                </div>
                <div
                  className={`${styles.waitingTitle} ${inter.className}`}
                  style={{
                    backgroundImage: st.gradient,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                    fontWeight: 700,
                    fontSize: 28,
                    lineHeight: "100%",
                    letterSpacing: "-0.45px",
                    textAlign: "center",
                    maxWidth: "92%",
                  }}
                >
                  {st.label}
                </div>
              </div>
            );
          })}
        </main>
      </div>
    </Layout>
  );
};

export default Negotiation;