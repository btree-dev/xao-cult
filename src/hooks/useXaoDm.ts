// src/hooks/useXaoDm.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex, isAddress } from 'viem';
import { useAccount } from 'wagmi';
import { dmThreadId } from '../lib/xaomsg/dmThreadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import {
  hexEncode, importAesKey, loadConversationKeyRaw, saveConversationKeyRaw,
} from '../lib/xaomsg/conversationKey';
import {
  encodeThreadNotice, publishThreadNotice, queryPeerKeyBundle, type ThreadNotice,
} from '../lib/xaomsg/inbox';
import { deriveDmConversationKeyRaw } from '../lib/xaomsg/ecies';
import { upsertConversation } from '../lib/xaomsg/conversationStore';
import { formatMessagePreview } from '../lib/xaomsg/messagePreview';
import {
  buildContactCardPayload, applyContactCard, hashContactCardProfile,
  lastSentContactCardHash, markContactCardSent,
} from '../lib/xaomsg/contactCard';
import {
  ContentType, type ContactCardPayload, type ResolvedMessage,
} from '../lib/xaomsg/types';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import { useProfileCache } from '../contexts/ProfileCacheContext';
import type { PersistedSession } from '../lib/xaomsg/session';
import { XAOMSG_DEBUG_BUILD, wakuDebugLog, wakuDebugWarn } from '../lib/xaomsg/debugBuild';

export type DmStatus = 'idle' | 'negotiating' | 'ready' | 'no-peer-key' | 'error';
export interface UseXaoDmResult extends UseXaoThreadResult { status: DmStatus; }

// Dedupe concurrent negotiations for the same thread (React StrictMode's
// dev-mode mount→cleanup→mount, or a fast remount) so two effect instances
// never both fire the peer-key-bundle lookup and discovery-notice publish
// for the same threadId at once.
const inFlightNegotiations = new Map<Hex, Promise<Uint8Array | null>>();

async function negotiateKey(
  threadId: Hex,
  peer: Address,
  myAddress: Address,
  session: PersistedSession,
): Promise<Uint8Array | null> {
  wakuDebugLog(`[xaomsg] dm#1 [build ${XAOMSG_DEBUG_BUILD}]: negotiateKey thread=${threadId} me=${myAddress} peer=${peer}`);
  const cached = loadConversationKeyRaw(threadId);
  if (cached) {
    wakuDebugLog(`[xaomsg] dm#2: using cached conversation key for thread ${threadId}:`, hexEncode(cached));
    return cached;
  }

  // ECDH(myPriv, theirPub) is symmetric, so both sides derive the identical
  // key locally the moment they know each other's session pubkey — no
  // transport, no "who generates it first" race, no divergence possible.
  wakuDebugLog(`[xaomsg] dm#3: no cached key, my session pubkey = ${session.cert.sessionPublicKeyHex}; looking up ${peer}'s cert`);
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) {
    wakuDebugWarn(`[xaomsg] dm#3: no cert found for peer ${peer} — cannot negotiate`);
    return null;
  }
  wakuDebugLog(`[xaomsg] dm#4: peer ${peer} cert found, their session pubkey = ${peerCert.sessionPublicKeyHex}`);
  const raw = await deriveDmConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex);
  wakuDebugLog(`[xaomsg] dm#5: derived conversation key for thread ${threadId}:`, hexEncode(raw));
  saveConversationKeyRaw(threadId, raw);
  upsertConversation(myAddress, { threadId, peer, lastActivityUnixMs: Date.now() });

  // Best-effort discovery ping so the peer's device can list this thread
  // (see useXaoInbox / syncAllKnownThreads) without opening Chat first. The
  // key material inside is redundant now — the peer derives the same key
  // themselves — so a failure here never blocks the key from being usable.
  try {
    const notice: ThreadNotice = { kind: 'dm', from: myAddress, threadId, ts: Date.now() };
    const noticeBytes = await encodeThreadNotice(notice, peerCert.sessionPublicKeyHex, session.privateKeyHex, session.cert);
    await publishThreadNotice(peer, noticeBytes);
  } catch (err) {
    console.warn('[xaomsg] DM discovery notice publish failed (key already usable locally):', err);
  }

  return raw;
}

export function useXaoDm({ peer, session }: { peer: Address | null; session: PersistedSession | null }): UseXaoDmResult {
  const { address: myAddress } = useAccount();
  const { setProfile, getProfile, currentUserProfile } = useProfileCache();

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

  // Pure chat + contact card — contract negotiation content
  // (PROPOSAL/COUNTER_PROPOSAL/ACCEPT/SYSTEM) never rides the DM thread; it
  // lives on its own per-draft event thread (see useXaoEvent). A DM never
  // touches the off-chain contract store.
  const onMessage = (resolved: ResolvedMessage) => {
    if (!myAddress || !peer) return;
    const { body } = resolved.envelope;
    // Username piggybacked on every message — caches the peer's display name
    // from the first message they send, without waiting on a CONTACT_CARD.
    if (body.senderUsername && body.sender.toLowerCase() === peer.toLowerCase()) {
      const existing = getProfile(body.sender);
      setProfile({ ...existing, walletAddress: body.sender, username: body.senderUsername, cachedAt: Date.now() });
    }
    if (body.contentType === ContentType.CONTACT_CARD) {
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
      return;
    }

    const preview = formatMessagePreview(resolved);
    if (preview && threadId) {
      upsertConversation(myAddress, {
        threadId,
        peer,
        lastActivityUnixMs: resolved.envelope.body.sentAt,
        lastPreview: preview,
      });
    }
  };

  const thread = useXaoThread({
    threadId, contentTopic, threadKey, session, onMessage,
    senderUsername: currentUserProfile?.username,
  });

  // Auto-send our contact card on first contact, and again whenever our
  // profile (username or avatar) has changed since the last card we sent on
  // this thread — mirrors the design's "on opening/first-contact" rule
  // without re-sending on every remount (the sent-hash map is
  // localStorage-backed and compared against the current profile's hash).
  useEffect(() => {
    if (status !== 'ready' || !threadId || !currentUserProfile || !myAddress) return;
    const currentHash = hashContactCardProfile(currentUserProfile.username, currentUserProfile.profilePictureUrl);
    if (lastSentContactCardHash(threadId) === currentHash) return;
    markContactCardSent(threadId, currentHash); // mark before the async send so a fast remount can't double-send
    thread.postContactCard(buildContactCardPayload({
      walletAddress: myAddress,
      username: currentUserProfile.username,
      profilePictureUrl: currentUserProfile.profilePictureUrl,
    })).catch((err) => console.warn('[xaomsg] failed to send contact card:', err));
    // thread.postContactCard is stable per Task 3's useCallback deps; omitting
    // it (and the rest of `thread`) avoids re-running this effect on every
    // message received, which is unrelated to "has our profile changed".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, threadId, currentUserProfile, myAddress]);

  return { ...thread, status };
}
