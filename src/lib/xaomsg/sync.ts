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
    applyDraftMessage(resolved, myAddress, peer, proposalHashIndex, draftId);
  });
}

/**
 * Full handling for one event (draft) inbox notice: the immediate
 * mint-pairing record (if this draft is already known locally) plus
 * key-derivation + backfill for its thread. Shared by syncAllKnownThreads's
 * one-time login replay and useXaoInbox's live subscription (Fix 6 —
 * without this, a counterparty already live in the app when you send a
 * first proposal wouldn't see it until they reloaded from `/`).
 *
 * SECURITY: `notice.from` must be one of the draft's own party1/party2
 * before the mint pairing is recorded — otherwise anyone who can publish
 * *any* event notice naming this draftId (not necessarily a party to it)
 * could claim an arbitrary contractAddress as "minted" for a draft that
 * isn't theirs. This mirrors useResolveEventThread's own parties
 * cross-check (defense in depth — that check protects the read path, this
 * one protects the write path that feeds it).
 */
export async function backfillEventThreadFromNotice(
  myAddress: Address,
  session: PersistedSession,
  notice: { draftId: string; from: Address; contractAddress?: Address },
): Promise<void> {
  if (notice.contractAddress) {
    const existingDraft = loadDraft(notice.draftId);
    if (existingDraft) {
      const fromLower = notice.from.toLowerCase();
      const isParty = existingDraft.party1.toLowerCase() === fromLower || existingDraft.party2.toLowerCase() === fromLower;
      if (isParty) {
        recordMint(notice.draftId, notice.contractAddress);
      }
    }
  }
  await ensureEventConversationKey(notice.from, notice.draftId, session);
  await backfillEventThread(myAddress, notice.from, notice.draftId);
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
  const events: { draftId: string; from: Address; contractAddress?: Address }[] = [];

  try {
    await publishKeyBundle(session.cert);
    await queryInboxNotices(myAddress, session.privateKeyHex, (notice: ThreadNotice) => {
      if (notice.kind === 'event') {
        if (!notice.draftId) return;
        // Immediate mint-pairing (if known locally) + key-derivation +
        // backfill all happen in backfillEventThreadFromNotice, below.
        events.push({ draftId: notice.draftId, from: notice.from, contractAddress: notice.contractAddress });
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
      backfillEventThreadFromNotice(myAddress, session, e)
        .catch((err) => {
          console.warn(`[xaomsg] sync: event thread backfill failed for draft ${e.draftId}:`, err);
        }),
    ),
  ]);
}
