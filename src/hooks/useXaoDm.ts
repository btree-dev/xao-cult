// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { dmThreadId } from '../lib/xaomsg/dmThreadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import {
  generateRawConversationKey, importAesKey, loadConversationKeyRaw, saveConversationKeyRaw,
} from '../lib/xaomsg/conversationKey';
import {
  encodeDmNotice, publishDmNotice, queryInboxNotices, queryPeerKeyBundle, type DmNotice,
} from '../lib/xaomsg/inbox';
import { upsertConversation } from '../lib/xaomsg/conversationStore';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import type { PersistedSession } from '../lib/xaomsg/session';

export type DmStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';
export interface UseXaoDmResult extends UseXaoThreadResult { status: DmStatus; }

function b64encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...Array.from(bytes))); }
function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

// Dedupe concurrent negotiations for the same thread (React StrictMode's
// dev-mode mount→cleanup→mount, or a fast remount) so two effect instances
// never both run the initiator/recipient side effects — key generation,
// notice publish, cache writes — for the same threadId at once.
const inFlightNegotiations = new Map<Hex, Promise<Uint8Array | null>>();

async function negotiateKey(
  threadId: Hex,
  peer: Address,
  myAddress: Address,
  session: PersistedSession,
): Promise<Uint8Array | null> {
  const cached = loadConversationKeyRaw(threadId);
  if (cached) return cached;

  // Recipient path — did the peer (or our own other tab/device) already
  // start? Replay my inbox for this thread. Every notice here is already
  // wallet-authenticated (inbox.ts verifies the sender's SessionCert and the
  // thread/sender consistency before ever surfacing a notice), so trusting
  // its contents is safe.
  const candidates: DmNotice[] = [];
  await queryInboxNotices(myAddress, session.privateKeyHex, (n) => {
    if (n.threadId.toLowerCase() === threadId.toLowerCase()) candidates.push(n);
  });
  // Sort for deterministic iteration order only. The actual winner is
  // whichever raw key lands in the cache first — here, or via useXaoInbox's
  // live subscription running concurrently — never the self-reported `ts`,
  // so a notice can't steer adoption by lying about its timestamp. This is
  // the same "first cached wins" rule useXaoInbox.applyNotice uses.
  candidates.sort((a, b) => a.ts - b.ts);
  for (const n of candidates) {
    if (loadConversationKeyRaw(threadId)) break;
    const raw = b64decode(n.convKeyB64);
    saveConversationKeyRaw(threadId, raw);
    upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: n.ts });
  }
  const afterReplay = loadConversationKeyRaw(threadId);
  if (afterReplay) return afterReplay;

  // Initiator path — need the peer's key bundle.
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return null;

  const raw = generateRawConversationKey();
  const notice: DmNotice = { from: myAddress, threadId, convKeyB64: b64encode(raw), ts: Date.now() };
  const noticeBytes = await encodeDmNotice(notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
  await publishDmNotice(peer, noticeBytes);
  // Only cache once the peer has actually been notified — if publish throws
  // above, nothing is cached, so a retry re-runs the full initiator path
  // instead of finding an orphaned key the peer can never decrypt. Re-check
  // the cache once more first: a concurrent negotiation (another tab, or
  // useXaoInbox picking up our own notice's echo while we awaited publish)
  // may have already cached a key.
  const raced = loadConversationKeyRaw(threadId);
  if (raced) return raced;
  saveConversationKeyRaw(threadId, raw);
  upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: notice.ts });
  return raw;
}

export function useXaoDm({ peer, session }: { peer: Address | null; session: PersistedSession | null }): UseXaoDmResult {
  const { address: myAddress } = useAccount();

  const threadId = useMemo<Hex | null>(
    () => (myAddress && peer && isAddress(peer) ? dmThreadId(myAddress, peer) : null),
    [myAddress, peer],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [status, setStatus] = useState<DmStatus>('idle');

  useEffect(() => {
    setThreadKey(null);
    if (!threadId || !peer || !myAddress || !session) { setStatus('idle'); return; }
    let cancelled = false;
    setStatus('negotiating');

    let promise = inFlightNegotiations.get(threadId);
    if (!promise) {
      promise = negotiateKey(threadId, peer, myAddress, session).finally(() => {
        inFlightNegotiations.delete(threadId);
      });
      inFlightNegotiations.set(threadId, promise);
    }

    promise
      .then(async (raw) => {
        if (cancelled) return;
        if (!raw) { setStatus('no-peer-key'); return; }
        const key = await importAesKey(raw);
        if (!cancelled) { setThreadKey(key); setStatus('ready'); }
      })
      .catch((err) => {
        console.error('[xaomsg] DM key negotiation failed:', err);
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, [threadId, contentTopic, peer, myAddress, session]);

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session });
  return { ...thread, status };
}
