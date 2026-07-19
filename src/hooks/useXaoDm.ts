// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  buildContactCardPayload, applyContactCard, hasSentContactCard, markContactCardSent,
} from '../lib/xaomsg/contactCard';
import { upsertDraft, recordApproval, recordMint } from '../lib/xaomsg/offchainContracts';
import {
  ContentType, type AcceptPayload, type ContactCardPayload, type ProposalPayload, type ResolvedMessage, type SystemPayload,
} from '../lib/xaomsg/types';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import { useProfileCache } from '../contexts/ProfileCacheContext';
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
  const { setProfile, currentUserProfile } = useProfileCache();

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

  // proposalHash (a PROPOSAL/COUNTER_PROPOSAL's own bodyHash) -> draftId, so a
  // later ACCEPT (which only carries the proposalHash it approves) can be
  // applied to the right off-chain draft. Assumes causal order — an ACCEPT
  // can only ever reference a proposal that already exists, and Waku store
  // replay returns messages in order, so the map is always populated before
  // a referencing ACCEPT is processed.
  const draftByProposalHash = useRef(new Map<Hex, string>());

  const onMessage = (resolved: ResolvedMessage) => {
    if (!myAddress || !peer) return;
    const { body, cert } = resolved.envelope;
    switch (body.contentType) {
      case ContentType.CONTACT_CARD: {
        const card = body.payload as ContactCardPayload;
        // Two independent checks, both required: `body.sender` is the
        // wallet-verified signer (verifyEnvelope already confirmed it matches
        // cert.walletAddress) — checking it against `peer` rejects a message
        // from anyone who isn't actually our DM counterparty. Checking the
        // *payload's own* claimed `walletAddress` against that same verified
        // sender stops a genuine-but-third-party sender from putting a
        // different wallet's address inside the card and having it cached
        // under that other wallet's identity.
        if (
          body.sender.toLowerCase() === peer.toLowerCase() &&
          card.walletAddress.toLowerCase() === body.sender.toLowerCase()
        ) {
          setProfile(applyContactCard(card));
        }
        break;
      }
      case ContentType.PROPOSAL:
      case ContentType.COUNTER_PROPOSAL: {
        const p = body.payload as ProposalPayload;
        const draftId = String((p.data as { draftId?: unknown }).draftId || '');
        if (!draftId) break;
        draftByProposalHash.current.set(resolved.bodyHash, draftId);
        const [party1, party2] = ([myAddress, peer] as Address[]).sort(
          (a, b) => a.toLowerCase().localeCompare(b.toLowerCase()),
        ) as [Address, Address];
        upsertDraft({
          draftId, party1, party2, terms: p.data, revisionNumber: p.revisionNumber,
          approvals: [], lastActivityUnixMs: body.sentAt,
        });
        break;
      }
      case ContentType.ACCEPT: {
        const a = body.payload as AcceptPayload;
        const draftId = draftByProposalHash.current.get(a.proposalHash);
        if (draftId) recordApproval(draftId, cert.walletAddress);
        break;
      }
      case ContentType.SYSTEM: {
        const s = body.payload as SystemPayload;
        // Fires for both the sender's own optimistic send and the recipient's
        // inbound copy (record() invokes onMessage either way) — recordMint
        // is a plain overwrite, so both sides converge on the same state.
        if (s.event === 'minted') recordMint(s.draftId, s.contractAddress);
        break;
      }
      default:
        break;
    }
  };

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session, onMessage });

  // Auto-send our contact card once per thread, once the secure channel is
  // ready — mirrors the design's "on opening/first-contact" rule without
  // re-sending on every remount (hasSentContactCard is localStorage-backed).
  useEffect(() => {
    if (status !== 'ready' || !threadId || !currentUserProfile || !myAddress) return;
    if (hasSentContactCard(threadId)) return;
    markContactCardSent(threadId); // mark before the async send so a fast remount can't double-send
    thread.postContactCard(buildContactCardPayload({
      walletAddress: myAddress,
      username: currentUserProfile.username,
      profilePictureUrl: currentUserProfile.profilePictureUrl,
    })).catch((err) => console.warn('[xaomsg] failed to send contact card:', err));
    // thread.postContactCard is stable per Task 3's useCallback deps; omitting
    // it (and the rest of `thread`) avoids re-running this effect on every
    // message received, which is unrelated to "have we sent our card yet".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, threadId, currentUserProfile, myAddress]);

  return { ...thread, status };
}
