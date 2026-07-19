// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex } from 'viem';
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

export function useXaoDm({ peer, session }: { peer: Address | null; session: PersistedSession | null }): UseXaoDmResult {
  const { address: myAddress } = useAccount();

  const threadId = useMemo<Hex | null>(
    () => (myAddress && peer ? dmThreadId(myAddress, peer) : null),
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

    (async () => {
      try {
        // (2) cached?
        const cached = loadConversationKeyRaw(threadId);
        if (cached) {
          const key = await importAesKey(cached);
          if (!cancelled) { setThreadKey(key); setStatus('ready'); }
          return;
        }

        // (3) recipient path — did the peer already start? replay my inbox for this thread.
        // Collect candidates into an array rather than mutating a `let` from inside the
        // callback closure — TS's control-flow narrowing can't see through that mutation
        // and would otherwise narrow the post-await read to `never`.
        const candidates: DmNotice[] = [];
        await queryInboxNotices(myAddress, session.privateKeyHex, (n) => {
          if (n.threadId.toLowerCase() === threadId.toLowerCase()) candidates.push(n);
        });
        const adopted = candidates.reduce<DmNotice | null>(
          (best, n) => (!best || n.ts < best.ts ? n : best),
          null,
        );
        if (adopted) {
          const raw = b64decode(adopted.convKeyB64);
          saveConversationKeyRaw(threadId, raw);
          upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: adopted.ts });
          const key = await importAesKey(raw);
          if (!cancelled) { setThreadKey(key); setStatus('ready'); }
          return;
        }

        // (4) initiator path — need the peer's key bundle
        const peerCert = await queryPeerKeyBundle(peer);
        if (!peerCert) { if (!cancelled) setStatus('no-peer-key'); return; }

        const raw = generateRawConversationKey();
        const notice: DmNotice = { from: myAddress, threadId, convKeyB64: b64encode(raw), ts: Date.now() };
        const noticeBytes = await encodeDmNotice(
          notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert.sessionPublicKeyHex,
        );
        await publishDmNotice(peer, noticeBytes);
        // Only cache the key locally once the peer has actually been notified —
        // if publish throws above, nothing is cached, so a retry re-runs the
        // full initiator path instead of finding an orphaned "ready" key that
        // the peer can never decrypt.
        saveConversationKeyRaw(threadId, raw);
        upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: notice.ts });
        const key = await importAesKey(raw);
        if (!cancelled) { setThreadKey(key); setStatus('ready'); }
      } catch (err) {
        console.error('[xaomsg] DM key negotiation failed:', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => { cancelled = true; };
  }, [threadId, contentTopic, peer, myAddress, session]);

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session });
  return { ...thread, status };
}
