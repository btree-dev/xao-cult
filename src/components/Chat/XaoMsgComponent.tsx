import React, { useEffect, useRef, useState } from 'react';
import { type Address } from 'viem';
import { useAccount } from 'wagmi';
import styles from '../../styles/CreateContract.module.css';
import { useXaoMsg } from '../../hooks/useXaoMsg';
import { useXaoMsgSession } from '../../hooks/useXaoMsgSession';
import { ContentType, type ResolvedMessage } from '../../lib/xaomsg/types';

export interface XaoMsgComponentProps {
  showContract: Address | null;
  embedded?: boolean;
}

const XaoMsgComponent: React.FC<XaoMsgComponentProps> = ({ showContract, embedded = false }) => {
  const { session, isUnlocking, error: sessionError, unlock } = useXaoMsgSession();
  const { messages, isLoading, error, postText } = useXaoMsg({ showContract, session });
  const { address: myAddress } = useAccount();

  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const id = requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  if (!showContract) {
    return <div className={styles.RecievedMessage}>Open this chat from a contract to use XaoMsg.</div>;
  }

  if (!session) {
    return (
      <div className={styles.RecievedMessage}>
        <div style={{ marginBottom: 12 }}>
          XaoMsg unlocks for 24 hours with a single wallet signature.
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
          {isUnlocking ? 'Signing…' : 'Unlock chat for 24h'}
        </button>
      </div>
    );
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
        {isLoading && <div className={styles.RecievedMessage}>Connecting to Waku…</div>}
        {error && <div className={styles.RecievedMessage} style={{ color: '#ff8080' }}>{error}</div>}
        {!isLoading && messages.length === 0 && (
          <div className={styles.RecievedMessage}>No messages yet. Start the negotiation.</div>
        )}
        {messages.map((m) => renderMessage(m, myAddress, styles))}
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

function renderMessage(m: ResolvedMessage, myAddress: Address | undefined, styles: Record<string, string>) {
  const { body } = m.envelope;
  const isMine = !!myAddress && body.sender.toLowerCase() === myAddress.toLowerCase();
  const cls = isMine ? styles.sentMessage : styles.RecievedMessage;
  const key = body.messageId;

  if (body.contentType === ContentType.TEXT) {
    const t = body.payload as { kind: 'text'; text: string };
    return <div key={key} className={cls}>{t.text}</div>;
  }
  if (body.contentType === ContentType.PROPOSAL || body.contentType === ContentType.COUNTER_PROPOSAL) {
    const p = body.payload as { revisionNumber: number };
    return <div key={key} className={cls}>📋 Proposal (rev {p.revisionNumber}) — Phase 1 placeholder; full DAG ships in Plan 3</div>;
  }
  if (body.contentType === ContentType.ACCEPT) {
    return <div key={key} style={{ color: '#80ff80' }}>✓ Accepted by {body.sender.slice(0, 6)}…</div>;
  }
  if (body.contentType === ContentType.REJECT) {
    return <div key={key} style={{ color: '#ff8080' }}>✗ Rejected by {body.sender.slice(0, 6)}…</div>;
  }
  return <div key={key} className={cls}>(unknown content type)</div>;
}

export default XaoMsgComponent;
