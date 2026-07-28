// src/lib/xaomsg/sync.ts
import type { Address } from 'viem';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';
import { contentTopicForThread } from './topicId';
import { queryHistory } from './waku';
import { decryptBody } from './crypto';
import { verifyEnvelope, computeBodyHash } from './envelope';
import { loadConversationKeyRaw, saveConversationKeyRaw, importAesKey } from './conversationKey';
import { publishKeyBundle, queryInboxNotices, queryPeerKeyBundle, type ThreadNotice } from './inbox';
import { deriveDmConversationKeyRaw, deriveEventConversationKeyRaw } from './ecies';
import { upsertConversation } from './conversationStore';
import { loadDraft, recordMint } from './offchainContracts';
import { applyDraftMessage, type ProposalHashIndex } from './draftSync';
import type { OnWireEnvelope, ResolvedMessage } from './types';
import type { PersistedSession } from './session';

/** Same decode -> decrypt -> verify pipeline useXaoThread uses for live/store
 *  messages, lifted out so the headless sync can reuse it without mounting
 *  the hook. Returns null for anything that fails to decrypt or verify —
 *  callers skip silently, matching useXaoThread's `onBytes` behavior. */
async function decodeResolvedMessage(
  bytes: Uint8Array, threadKey: CryptoKey, threadId: string,
): Promise<ResolvedMessage | null> {
  try {
    const b64 = new TextDecoder().decode(bytes);
    const plaintext = await decryptBody(b64, threadKey);
    const envelope = JSON.parse(plaintext) as OnWireEnvelope;
    if (!(await verifyEnvelope(envelope))) return null;
    if (envelope.body.threadId !== threadId) return null;
    return { envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now() };
  } catch {
    return null;
  }
}

async function ensureDmConversationKey(myAddress: Address, peer: Address, session: PersistedSession): Promise<void> {
  const threadId = dmThreadId(myAddress, peer);
  if (loadConversationKeyRaw(threadId)) return;
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return;
  const raw = await deriveDmConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex);
  saveConversationKeyRaw(threadId, raw);
}

async function backfillDmThread(myAddress: Address, peer: Address): Promise<void> {
  const threadId = dmThreadId(myAddress, peer);
  const rawKey = loadConversationKeyRaw(threadId);
  if (!rawKey) return;
  const threadKey = await importAesKey(rawKey);
  const contentTopic = contentTopicForThread(threadId);
  await queryHistory(contentTopic, async (bytes) => {
    // DM threads no longer carry contract content — just decode/verify to
    // keep the store peer's message flowing through the same pipeline; no
    // side effect is applied here (unlike the pre-refactor version).
    await decodeResolvedMessage(bytes, threadKey, threadId);
  });
}

async function ensureEventConversationKey(peer: Address, draftId: string, session: PersistedSession): Promise<void> {
  const threadId = threadIdForDraft(draftId);
  if (loadConversationKeyRaw(threadId)) return;
  const peerCert = await queryPeerKeyBundle(peer);
  if (!peerCert) return;
  const raw = await deriveEventConversationKeyRaw(session.privateKeyHex, peerCert.sessionPublicKeyHex, draftId);
  saveConversationKeyRaw(threadId, raw);
}

async function backfillEventThread(myAddress: Address, peer: Address, draftId: string): Promise<void> {
  const threadId = threadIdForDraft(draftId);
  const rawKey = loadConversationKeyRaw(threadId);
  if (!rawKey) return;
  const threadKey = await importAesKey(rawKey);
  const contentTopic = contentTopicForThread(threadId);
  const proposalHashIndex: ProposalHashIndex = new Map();
  await queryHistory(contentTopic, async (bytes) => {
    const resolved = await decodeResolvedMessage(bytes, threadKey, threadId);
    if (!resolved) return;
    applyDraftMessage(resolved, myAddress, peer, proposalHashIndex);
  });
}

/**
 * Runs once, right after a Waku session becomes ready (see /unlock-chat):
 * replays this wallet's own inbox to discover both DM peers and event
 * (draft) threads, then backfills every discovered thread so the DM
 * conversation list and the off-chain draft store are both caught up
 * without the user needing to open anything first.
 *
 * Best-effort throughout: failures are logged, never thrown, since the
 * caller has typically already navigated to /dashboard by the time this
 * settles. One thread's backfill failing never blocks another's.
 */
export async function syncAllKnownThreads(myAddress: Address, session: PersistedSession): Promise<void> {
  const dmPeers = new Set<string>();
  const events: { draftId: string; peer: string }[] = [];

  try {
    await publishKeyBundle(session.cert);
    await queryInboxNotices(myAddress, session.privateKeyHex, (notice: ThreadNotice) => {
      if (notice.kind === 'event') {
        if (!notice.draftId) return;
        // Record the mint pairing immediately if this draft is already known
        // locally — no need to wait for a full thread replay in that case.
        // If it isn't known locally yet (fresh device), the queued backfill
        // below creates it from the thread's own PROPOSAL/SYSTEM history.
        if (notice.contractAddress && loadDraft(notice.draftId)) {
          recordMint(notice.draftId, notice.contractAddress);
        }
        events.push({ draftId: notice.draftId, peer: notice.from });
        return;
      }
      upsertConversation(myAddress, {
        threadId: notice.threadId, peer: notice.from, lastActivityUnixMs: notice.ts, lastPreview: notice.preview,
      });
      dmPeers.add(notice.from.toLowerCase());
    });
  } catch (err) {
    console.warn('[xaomsg] sync: inbox backfill failed:', err);
  }

  await Promise.all([
    ...Array.from(dmPeers).map((peer) =>
      ensureDmConversationKey(myAddress, peer as Address, session)
        .then(() => backfillDmThread(myAddress, peer as Address))
        .catch((err) => {
          console.warn(`[xaomsg] sync: DM thread backfill failed for peer ${peer}:`, err);
        }),
    ),
    ...events.map((e) =>
      ensureEventConversationKey(e.peer as Address, e.draftId, session)
        .then(() => backfillEventThread(myAddress, e.peer as Address, e.draftId))
        .catch((err) => {
          console.warn(`[xaomsg] sync: event thread backfill failed for draft ${e.draftId}:`, err);
        }),
    ),
  ]);
}
