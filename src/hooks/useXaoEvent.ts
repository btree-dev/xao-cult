// src/hooks/useXaoEvent.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Address, type Hex, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { threadIdForDraft } from '../lib/xaomsg/threadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import {
  importAesKey, loadConversationKeyRaw, saveConversationKeyRaw,
} from '../lib/xaomsg/conversationKey';
import {
  encodeThreadNotice, publishThreadNotice, queryPeerKeyBundle, type ThreadNotice,
} from '../lib/xaomsg/inbox';
import { deriveEventConversationKeyRaw } from '../lib/xaomsg/ecies';
import { applyDraftMessage, type ProposalHashIndex } from '../lib/xaomsg/draftSync';
import type { ResolvedMessage, SessionCert } from '../lib/xaomsg/types';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import type { PersistedSession } from '../lib/xaomsg/session';

export type EventStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';

export interface UseXaoEventResult extends UseXaoThreadResult {
  status: EventStatus;
  /** Publishes a discovery/mint notice for this draft to both the
   *  counterparty's inbox and my own, so either party (on any device) can
   *  discover this thread on next login. Pass `contractAddress` once the
   *  draft has minted — this is what lets useResolveEventThread map the
   *  on-chain address back to this same thread later, keeping the same
   *  thread and key in use pre- and post-mint (see
   *  docs/superpowers/specs/2026-07-27-event-thread-separation-design.md §5, §7). */
  notifyThread: (contractAddress?: Address) => Promise<void>;
}

interface NegotiationResult { raw: Uint8Array; peerCert: SessionCert | null; }

// Same dedupe purpose as useXaoDm's inFlightNegotiations — one negotiation
// per threadId even across a StrictMode mount→cleanup→mount.
const inFlightNegotiations = new Map<Hex, Promise<NegotiationResult | null>>();

// Cache is checked FIRST, before any network call — unlike a naive
// "always fetch the peer's cert" order, this means a thread whose key we
// already hold stays readable even when the peer's session cert has since
// expired (SESSION_DURATION_MS, session.ts — certs expire after 30 days).
// Nothing about our own ability to decrypt this thread depends on the
// peer's current cert; only a *fresh* key derivation does.
async function negotiateKey(
  threadId: Hex,
  draftId: string,
  peer: Address,
  session: PersistedSession,
): Promise<NegotiationResult | null> {
  const cached = loadConversationKeyRaw(threadId);
  if (cached) return { raw: cached, peerCert: null };
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return null;
  const raw = await deriveEventConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex, draftId);
  saveConversationKeyRaw(threadId, raw);
  return { raw, peerCert };
}

export function useXaoEvent(
  { draftId, peer, session }: { draftId: string | null; peer: Address | null; session: PersistedSession | null },
): UseXaoEventResult {
  const { address: myAddress } = useAccount();

  const threadId = useMemo<Hex | null>(
    () => (draftId ? threadIdForDraft(draftId) : null),
    [draftId],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [status, setStatus] = useState<EventStatus>('idle');
  const peerCertRef = useRef<SessionCert | null>(null);

  useEffect(() => {
    setThreadKey(null);
    peerCertRef.current = null;
    if (!threadId || !draftId || !peer || !isAddress(peer) || !session) { setStatus('idle'); return; }
    let cancelled = false;
    setStatus('negotiating');

    let promise = inFlightNegotiations.get(threadId);
    if (!promise) {
      promise = negotiateKey(threadId, draftId, peer, session).finally(() => {
        inFlightNegotiations.delete(threadId);
      });
      inFlightNegotiations.set(threadId, promise);
    }

    promise
      .then(async (result) => {
        if (cancelled) return;
        if (!result) { setStatus('no-peer-key'); return; }
        if (result.peerCert) {
          peerCertRef.current = result.peerCert;
        } else {
          // Cache hit — readiness never waits on this. Fire-and-forget so
          // notifyThread has a chance to get a fresh recipient cert later,
          // without gating status/readiness on the peer's cert being
          // current (see negotiateKey above).
          queryPeerKeyBundle(peer).then((cert) => {
            if (!cancelled && cert) peerCertRef.current = cert;
          }).catch(() => {});
        }
        const key = await importAesKey(result.raw);
        if (!cancelled) { setThreadKey(key); setStatus('ready'); }
      })
      .catch((err) => {
        console.error('[xaomsg] event key negotiation failed:', err);
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, [threadId, draftId, peer, session]);

  // proposalHash -> draftId correlation for ACCEPT resolution — same purpose
  // as useXaoDm's original ref, just scoped to this one draft's thread.
  const draftByProposalHash = useRef<ProposalHashIndex>(new Map());

  const onMessage = (resolved: ResolvedMessage) => {
    if (!myAddress || !peer || !draftId) return;
    applyDraftMessage(resolved, myAddress, peer, draftByProposalHash.current, draftId);
  };

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session, onMessage });

  const notifyThread = async (contractAddress?: Address): Promise<void> => {
    if (!myAddress || !peer || !draftId || !threadId || !session) return;
    const notice: ThreadNotice = { kind: 'event', from: myAddress, threadId, draftId, contractAddress, ts: Date.now() };

    const peerCert = peerCertRef.current;
    if (peerCert) {
      try {
        const bytes = await encodeThreadNotice(notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
        await publishThreadNotice(peer, bytes);
      } catch (err) {
        console.warn('[xaomsg] event notice publish to peer failed:', err);
      }
    }
    // Also publish to my OWN inbox so any other device of mine discovers
    // this thread (and, once minted, the contractAddress mapping) too.
    try {
      const selfBytes = await encodeThreadNotice(notice, session.cert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
      await publishThreadNotice(myAddress, selfBytes);
    } catch (err) {
      console.warn('[xaomsg] event notice publish to self failed:', err);
    }
  };

  return { ...thread, status, notifyThread };
}
