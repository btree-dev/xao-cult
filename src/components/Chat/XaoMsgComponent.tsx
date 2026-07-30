import React, { useEffect, useRef, useState } from 'react';
import { type Address, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import styles from '../../styles/CreateContract.module.css';
import { useXaoMsg } from '../../hooks/useXaoMsg';
import { useXaoDm } from '../../hooks/useXaoDm';
import { useXaoEvent } from '../../hooks/useXaoEvent';
import { useXaoMsgSession } from '../../hooks/useXaoMsgSession';
import {
  ContentType,
  type ContactCardPayload, type ProposalPayload, type RejectPayload,
  type ResolvedMessage, type SystemPayload, type TextPayload,
} from '../../lib/xaomsg/types';
import { CONTRACT_MESSAGE_VERSION, type ContractProposalMessage } from '../../types/contractMessage';
import { loadDraft } from '../../lib/xaomsg/offchainContracts';

export interface XaoMsgComponentProps {
  showContract?: Address | null;
  peer?: Address | null;
  draftId?: string | null;
  embedded?: boolean;
  onContractProposalSelect?: (proposal: ContractProposalMessage) => void;
}

const XaoMsgComponent: React.FC<XaoMsgComponentProps> = ({
  showContract = null, peer = null, draftId = null, embedded = false, onContractProposalSelect,
}) => {
  const { session, isUnlocking, error: sessionError, unlock } = useXaoMsgSession();
  // draftId takes priority: create-contract.tsx and contracts-detail.tsx
  // (via useResolveEventThread) pass BOTH draftId and peer together for
  // event mode. peer alone (no draftId) means DM mode.
  const isEvent = !!draftId;
  const isDm = !isEvent && !!peer;

  const contractThread = useXaoMsg({ showContract: isDm || isEvent ? null : showContract, session });
  const dmThread = useXaoDm({ peer: isDm ? peer : null, session });
  const eventThread = useXaoEvent({ draftId: isEvent ? draftId : null, peer: isEvent ? peer : null, session });
  const { messages, isLoading, error, postText } = isDm ? dmThread : isEvent ? eventThread : contractThread;
  const activeStatus = isDm ? dmThread.status : isEvent ? eventThread.status : null;

  const { address: myAddress } = useAccount();

  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const id = requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  // The real message list lives in .chatMain > .messagesContainer, whose
  // `position: relative; top: 80px` is what clears the (position: absolute)
  // BackNavbar. A bare .RecievedMessage div outside that wrapper renders at
  // the very top of the page flow and overlaps the navbar — so every
  // standalone guard message below is wrapped the same way.
  const panel = (content: React.ReactNode) => (
    <div className={embedded ? styles.chatContainer : styles.chatMain}>
      <div className={styles.messagesContainer}>{content}</div>
    </div>
  );

  if (!showContract && !peer && !draftId) {
    return panel(<div className={styles.RecievedMessage}>Open this chat from a contract, a draft, or a wallet address to use XaoMsg.</div>);
  }

  if (peer && !isAddress(peer)) {
    return panel(<div className={styles.RecievedMessage}>This isn&apos;t a valid wallet address.</div>);
  }

  if (!session) {
    return panel(
      <div className={styles.RecievedMessage}>
        <div style={{ marginBottom: 12 }}>
          XaoMsg unlocks with two wallet signatures and stays unlocked — no expiry.
          After that, sending messages is gas-free and prompt-free.
        </div>
        {sessionError && <div style={{ color: '#ff8080', marginBottom: 8 }}>{sessionError}</div>}
        <button
          onClick={unlock}
          disabled={isUnlocking}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(to right, #ff9900, #e100ff)',
            border: 'none',
            borderRadius: 20,
            color: '#fff',
            cursor: isUnlocking ? 'not-allowed' : 'pointer',
          }}
        >
          {isUnlocking ? 'Signing…' : 'Unlock chat'}
        </button>
      </div>,
    );
  }

  if ((isDm || isEvent) && activeStatus === 'no-peer-key') {
    return panel(
      <div className={styles.RecievedMessage}>
        This user hasn&apos;t joined XaoMsg yet, so messages can&apos;t be encrypted to them.
        Ask them to open XaoMsg once, then try again.
      </div>,
    );
  }
  if ((isDm || isEvent) && (activeStatus === 'negotiating' || activeStatus === 'idle')) {
    return panel(<div className={styles.RecievedMessage}>Setting up a secure channel…</div>);
  }
  if ((isDm || isEvent) && activeStatus === 'error') {
    return panel(<div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>Couldn&apos;t set up the secure channel. Please retry.</div>);
  }

  const handleSend = async () => {
    if (!text.trim()) return;
    const body = text;
    setText('');
    setSending(true);
    try {
      await postText(body);
    } catch (err) {
      console.error('[xaomsg] send failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={embedded ? styles.chatContainer : styles.chatMain}>
      <div ref={containerRef} className={styles.messagesContainer}>
        {isLoading && <div className={styles.RecievedMessage}>Loading messages…</div>}
        {error && <div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>{error}</div>}
        {!isLoading && messages.length === 0 && (
          <div className={styles.RecievedMessage}>No messages yet. Start the negotiation.</div>
        )}
        {messages.map((m) => renderMessage(m, myAddress, styles, onContractProposalSelect))}
      </div>
      <div className={styles.messageInputContainer}>
        <div className={styles.messageInput}>
          <input
            type="text"
            placeholder={sending ? 'Sending…' : 'Message'}
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

function shortWho(addr: string, myAddress: Address | undefined): string {
  return myAddress && addr.toLowerCase() === myAddress.toLowerCase() ? 'You' : `${addr.slice(0, 6)}…`;
}

function toContractProposalMessage(m: ResolvedMessage): ContractProposalMessage {
  const p = m.envelope.body.payload as ProposalPayload;
  // A chat thread keeps every past revision's system line around, so the
  // message someone clicks is not necessarily the negotiation's current
  // state. Resolve to the latest known revision of the same draftId (from
  // the local off-chain store, which upsertDraft always keeps at the
  // highest revisionNumber) rather than this specific message's own
  // snapshot — clicking any revision of a negotiation should open where it
  // actually stands now.
  const draftId = (p.data as { draftId?: unknown }).draftId;
  const latest = draftId ? loadDraft(String(draftId)) : null;
  if (latest && latest.revisionNumber >= p.revisionNumber) {
    return {
      type: 'contract-proposal',
      version: CONTRACT_MESSAGE_VERSION,
      data: latest.terms,
      sentAt: latest.lastActivityUnixMs,
      proposedBy: m.envelope.body.sender,
      revisionNumber: latest.revisionNumber,
    };
  }
  return {
    type: 'contract-proposal',
    version: CONTRACT_MESSAGE_VERSION,
    data: p.data,
    sentAt: m.envelope.body.sentAt,
    proposedBy: m.envelope.body.sender,
    revisionNumber: p.revisionNumber,
  };
}

function renderMessage(
  m: ResolvedMessage,
  myAddress: Address | undefined,
  styles: Record<string, string>,
  onContractProposalSelect?: (proposal: ContractProposalMessage) => void,
) {
  const { body } = m.envelope;
  const isMine = !!myAddress && body.sender.toLowerCase() === myAddress.toLowerCase();
  const cls = isMine ? styles.sentMessage : styles.RecievedMessage;
  const key = body.messageId;

  if (body.contentType === ContentType.TEXT) {
    const t = body.payload as TextPayload;
    return <div key={key} className={cls}>{t.text}</div>;
  }
  if (body.contentType === ContentType.CONTACT_CARD) {
    const c = body.payload as ContactCardPayload;
    return <div key={key} className={styles.systemLine}>{shortWho(c.walletAddress, myAddress)} updated their profile details</div>;
  }
  if (body.contentType === ContentType.PROPOSAL || body.contentType === ContentType.COUNTER_PROPOSAL) {
    const p = body.payload as ProposalPayload;
    const verb = body.contentType === ContentType.PROPOSAL ? 'sent a contract' : 'sent an updated contract';
    const clickable = !!onContractProposalSelect;
    return (
      <div
        key={key}
        className={clickable ? `${styles.systemLine} ${styles.systemLineClickable}` : styles.systemLine}
        onClick={clickable ? () => onContractProposalSelect!(toContractProposalMessage(m)) : undefined}
      >
        📋 {shortWho(body.sender, myAddress)} {verb} (rev {p.revisionNumber})
      </div>
    );
  }
  if (body.contentType === ContentType.ACCEPT) {
    return <div key={key} className={styles.systemLine}>✓ {shortWho(body.sender, myAddress)} approved the contract</div>;
  }
  if (body.contentType === ContentType.REJECT) {
    const r = body.payload as RejectPayload;
    return (
      <div key={key} className={styles.systemLine}>
        ✗ {shortWho(body.sender, myAddress)} rejected the contract{r.reason ? `: ${r.reason}` : ''}
      </div>
    );
  }
  if (body.contentType === ContentType.SYSTEM) {
    const s = body.payload as SystemPayload;
    return (
      <div key={key} className={styles.systemLine}>
        Contract minted on-chain{s.contractAddress ? ` (${s.contractAddress.slice(0, 6)}…)` : ''}
      </div>
    );
  }
  return <div key={key} className={cls}>(unknown content type)</div>;
}

export default XaoMsgComponent;
