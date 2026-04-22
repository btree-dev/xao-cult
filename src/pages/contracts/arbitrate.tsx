import React, { useState } from "react";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { useRouter } from "next/router";
import { useReadContracts } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../wagmi";
import { useWeb3 } from "../../hooks/useWeb3";
import { ARBITRATION_AGENT_ABI } from "../../lib/web3/eventcontract";
import { CONTRACT_ADDRESSES } from "../../lib/web3/chains";
import { baseSepolia } from "wagmi/chains";

const CASE_STATUS_LABELS = ['OPEN', 'RULED', 'DEFAULTED', 'WITHDRAWN'];
const RULING_LABELS = ['PENDING', 'NO BREACH', 'BREACH BY PARTY 1', 'BREACH BY PARTY 2'];
const RULING_TIMEOUT_DAYS = 7;

const panelStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '12px',
};
const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' };
const valueStyle: React.CSSProperties = { color: 'white', fontSize: '14px', marginBottom: '12px', wordBreak: 'break-all' };

const Arbitrate: React.FC = () => {
  const router = useRouter();
  const { address, chain } = useWeb3();
  const showContract = router.query.showContract as string | undefined;
  const showContractAddr = showContract?.startsWith('0x') ? (showContract as `0x${string}`) : undefined;

  const arbitrationAgentAddr = (
    CONTRACT_ADDRESSES[(chain?.id ?? baseSepolia.id) as keyof typeof CONTRACT_ADDRESSES]?.ArbitrationAgent || '0x'
  ) as `0x${string}`;

  const hasValidAgent = arbitrationAgentAddr !== '0x' && arbitrationAgentAddr !== '0x0000000000000000000000000000000000000000';

  // ─── ON-CHAIN READS ────────────────────────────────────────────────────────

  const { data: openCaseData, refetch: refetchOpenCase } = useReadContracts({
    contracts: showContractAddr && hasValidAgent ? [
      { address: arbitrationAgentAddr, abi: ARBITRATION_AGENT_ABI, functionName: 'getOpenCaseForContract', args: [showContractAddr] },
    ] : [],
    query: { enabled: !!(showContractAddr && hasValidAgent) },
  });

  const openCaseId = openCaseData?.[0]?.status === 'success' ? BigInt(openCaseData[0].result as bigint) : null;
  const hasOpenCase = openCaseId !== null && openCaseId > BigInt(0);

  const { data: caseData, refetch: refetchCase } = useReadContracts({
    contracts: hasOpenCase ? [
      { address: arbitrationAgentAddr, abi: ARBITRATION_AGENT_ABI, functionName: 'getCase', args: [openCaseId!] },
      { address: arbitrationAgentAddr, abi: ARBITRATION_AGENT_ABI, functionName: 'getCaseEvidence', args: [openCaseId!] },
    ] : [],
    query: { enabled: hasOpenCase },
  });

  const caseInfo = caseData?.[0]?.status === 'success' ? (caseData[0].result as any) : null;
  const evidenceList = caseData?.[1]?.status === 'success' ? (caseData[1].result as any[]) : [];

  // ─── LOCAL STATE ──────────────────────────────────────────────────────────

  const [evidenceCID, setEvidenceCID] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  const [openCID, setOpenCID] = useState('');
  const [openDesc, setOpenDesc] = useState('');
  const [isOpeningCase, setIsOpeningCase] = useState(false);

  const [isTriggeringDefault, setIsTriggeringDefault] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // ─── HANDLERS ────────────────────────────────────────────────────────────

  const handleOpenCase = async () => {
    if (!showContractAddr || !hasValidAgent) return;
    try {
      setIsOpeningCase(true);
      const txHash = await writeContract(config, {
        address: arbitrationAgentAddr,
        abi: ARBITRATION_AGENT_ABI,
        functionName: 'openCase',
        args: [showContractAddr, openCID, openDesc],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      await refetchOpenCase();
      await refetchCase();
      setOpenCID('');
      setOpenDesc('');
    } catch (err: any) {
      console.error(err);
      alert('Failed to open case. Make sure the contract is in DISPUTED status and you are a party.');
    } finally {
      setIsOpeningCase(false);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!hasOpenCase || !openCaseId || !evidenceCID.trim()) return;
    try {
      setIsSubmittingEvidence(true);
      const txHash = await writeContract(config, {
        address: arbitrationAgentAddr,
        abi: ARBITRATION_AGENT_ABI,
        functionName: 'submitEvidence',
        args: [openCaseId, evidenceCID, evidenceDesc],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      await refetchCase();
      setEvidenceCID('');
      setEvidenceDesc('');
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit evidence.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleTriggerDefault = async () => {
    if (!hasOpenCase || !openCaseId) return;
    try {
      setIsTriggeringDefault(true);
      const txHash = await writeContract(config, {
        address: arbitrationAgentAddr,
        abi: ARBITRATION_AGENT_ABI,
        functionName: 'triggerDefault',
        args: [openCaseId],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      await refetchCase();
    } catch (err: any) {
      console.error(err);
      alert('Cannot trigger default yet — 7-day timeout has not elapsed, or case is no longer open.');
    } finally {
      setIsTriggeringDefault(false);
    }
  };

  const handleWithdrawCase = async () => {
    if (!hasOpenCase || !openCaseId) return;
    try {
      setIsWithdrawing(true);
      const txHash = await writeContract(config, {
        address: arbitrationAgentAddr,
        abi: ARBITRATION_AGENT_ABI,
        functionName: 'withdrawCase',
        args: [openCaseId],
      });
      await waitForTransactionReceipt(config, { hash: txHash });
      await refetchOpenCase();
      await refetchCase();
    } catch (err: any) {
      console.error(err);
      alert('Cannot withdraw — the ShowContract must no longer be in DISPUTED state.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ─── COMPUTED ─────────────────────────────────────────────────────────────

  const caseStatus = caseInfo ? Number(caseInfo[4]) : null;
  const ruling = caseInfo ? Number(caseInfo[5]) : null;
  const openedAt = caseInfo ? Number(caseInfo[7]) : null;
  const ruledAt = caseInfo ? Number(caseInfo[8]) : null;
  const rulingNotes = caseInfo ? String(caseInfo[9]) : '';
  const evidenceCount = caseInfo ? Number(caseInfo[10]) : 0;
  const arbitrator = caseInfo ? String(caseInfo[6]) : '';

  const defaultDeadline = openedAt ? new Date((openedAt + RULING_TIMEOUT_DAYS * 86400) * 1000) : null;
  const canTriggerDefault = defaultDeadline ? Date.now() >= defaultDeadline.getTime() : false;

  const isParty = !!(address && caseInfo &&
    (address.toLowerCase() === String(caseInfo[2]).toLowerCase() ||
     address.toLowerCase() === String(caseInfo[3]).toLowerCase()));

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const renderCaseStatus = () => {
    if (!caseInfo) return null;
    const statusColors: Record<number, string> = { 0: '#ff9900', 1: '#4ade80', 2: '#888', 3: '#888' };
    const color = statusColors[caseStatus ?? 0] ?? '#888';
    return (
      <div style={{ ...panelStyle, border: `1px solid ${color}40` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ background: color, borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
            {CASE_STATUS_LABELS[caseStatus ?? 0]}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Case #{openCaseId?.toString()}</span>
        </div>

        <p style={labelStyle}>Opened by</p>
        <p style={valueStyle}>{String(caseInfo[1])}</p>

        {openedAt && (
          <>
            <p style={labelStyle}>Opened</p>
            <p style={valueStyle}>{new Date(openedAt * 1000).toLocaleString()}</p>
          </>
        )}

        {defaultDeadline && caseStatus === 0 && (
          <>
            <p style={labelStyle}>Default deadline (7 days)</p>
            <p style={{ ...valueStyle, color: canTriggerDefault ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>
              {defaultDeadline.toLocaleString()}
              {canTriggerDefault ? ' — eligible for default ruling' : ''}
            </p>
          </>
        )}

        {arbitrator && arbitrator !== '0x0000000000000000000000000000000000000000' && (
          <>
            <p style={labelStyle}>Assigned Arbitrator</p>
            <p style={valueStyle}>{arbitrator}</p>
          </>
        )}

        {caseStatus !== 0 && ruling !== null && (
          <>
            <p style={labelStyle}>Ruling</p>
            <p style={{ ...valueStyle, color: ruling === 1 ? '#4ade80' : ruling === 2 ? '#ef4444' : '#ff9900' }}>
              {RULING_LABELS[ruling]}
            </p>
          </>
        )}

        {ruledAt ? (
          <>
            <p style={labelStyle}>Ruled at</p>
            <p style={valueStyle}>{new Date(ruledAt * 1000).toLocaleString()}</p>
          </>
        ) : null}

        {rulingNotes && rulingNotes.length > 0 && (
          <>
            <p style={labelStyle}>Ruling notes (IPFS CID)</p>
            <p style={valueStyle}>{rulingNotes}</p>
          </>
        )}

        <p style={labelStyle}>Evidence submitted</p>
        <p style={valueStyle}>{evidenceCount}</p>
      </div>
    );
  };

  const renderEvidenceList = () => {
    if (!evidenceList.length) return null;
    return (
      <div style={panelStyle}>
        <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Evidence ({evidenceList.length})</h3>
        {evidenceList.map((ev: any, i: number) => (
          <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '10px' }}>
            <p style={labelStyle}>{new Date(Number(ev.timestamp) * 1000).toLocaleString()} — {String(ev.submittedBy).slice(0, 10)}…</p>
            <p style={{ color: 'white', fontSize: '13px', marginBottom: '4px' }}>{ev.ipfsCID}</p>
            {ev.description && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{ev.description}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderSubmitEvidence = () => {
    if (!hasOpenCase || caseStatus !== 0) return null;
    return (
      <div style={panelStyle}>
        <h3 style={{ color: 'white', fontSize: '14px', marginBottom: '12px' }}>Submit Evidence</h3>
        <p style={{ ...labelStyle, marginBottom: '8px' }}>
          Upload your files to IPFS and paste the CID here. Both parties and the assigned arbitrator can submit evidence.
        </p>
        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder="IPFS CID (e.g. Qm...)"
            value={evidenceCID}
            onChange={e => setEvidenceCID(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder="Description (optional)"
            value={evidenceDesc}
            onChange={e => setEvidenceDesc(e.target.value)}
            className={styles.input}
          />
        </div>
        <button
          className={styles.arbitrateButton}
          onClick={handleSubmitEvidence}
          disabled={isSubmittingEvidence || !evidenceCID.trim()}
        >
          {isSubmittingEvidence ? 'Submitting…' : 'Submit Evidence'}
        </button>
      </div>
    );
  };

  const renderActions = () => {
    if (!hasOpenCase || caseStatus !== 0 || !isParty) return null;
    return (
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
        {canTriggerDefault && (
          <button
            onClick={handleTriggerDefault}
            disabled={isTriggeringDefault}
            style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
          >
            {isTriggeringDefault ? 'Processing…' : 'Trigger Default (No Breach)'}
          </button>
        )}
        <button
          onClick={handleWithdrawCase}
          disabled={isWithdrawing}
          style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          {isWithdrawing ? 'Processing…' : 'Withdraw Case'}
        </button>
      </div>
    );
  };

  const renderOpenCaseForm = () => {
    if (!showContractAddr || !hasValidAgent) return null;
    if (hasOpenCase) return null;
    return (
      <div style={{ ...panelStyle, border: '1px solid rgba(225,0,255,0.3)' }}>
        <h3 style={{ color: '#e100ff', fontSize: '14px', marginBottom: '8px' }}>Open Arbitration Case</h3>
        <p style={{ ...labelStyle, marginBottom: '12px' }}>
          The ShowContract must be in DISPUTED status. You can attach initial evidence (IPFS CID).
        </p>
        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder="Initial evidence IPFS CID (optional)"
            value={openCID}
            onChange={e => setOpenCID(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder="Description (optional)"
            value={openDesc}
            onChange={e => setOpenDesc(e.target.value)}
            className={styles.input}
          />
        </div>
        <button
          className={styles.arbitrateButton}
          onClick={handleOpenCase}
          disabled={isOpeningCase}
          style={{ background: 'rgba(225,0,255,0.2)', borderColor: '#e100ff', color: '#e100ff' }}
        >
          {isOpeningCase ? 'Opening…' : 'Open Case'}
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Arbitration — XAO Cult</title>
          <meta name="description" content="Arbitration Case Management" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar pageTitle="Arbitration" showRectangleRight={false} />

        <main style={{ padding: '16px', maxWidth: '420px', margin: '0 auto' }}>
          {!showContractAddr && (
            <div style={panelStyle}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                No contract specified. Navigate here from a contract in DISPUTED status.
              </p>
            </div>
          )}

          {showContractAddr && !hasValidAgent && (
            <div style={panelStyle}>
              <p style={{ color: '#ff9900', fontSize: '14px' }}>
                ArbitrationAgent contract not deployed on this network yet.
              </p>
            </div>
          )}

          {showContractAddr && hasValidAgent && (
            <>
              <div style={{ ...panelStyle, border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={labelStyle}>Show Contract</p>
                <p style={{ ...valueStyle, fontSize: '12px' }}>{showContractAddr}</p>
              </div>

              {!hasOpenCase && renderOpenCaseForm()}

              {hasOpenCase && (
                <>
                  {renderCaseStatus()}
                  {renderActions()}
                  {renderSubmitEvidence()}
                  {renderEvidenceList()}
                </>
              )}
            </>
          )}

          <div style={{ marginTop: '16px' }}>
            <button
              className={styles.cancelButton}
              onClick={() => router.back()}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Arbitrate;
