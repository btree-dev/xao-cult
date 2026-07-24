// src/lib/xaomsg/sync.ts
import type { Address } from 'viem';
import { dmThreadId } from './dmThreadId';
import { contentTopicForThread } from './topicId';
import { queryHistory } from './waku';
import { decryptBody } from './crypto';
import { verifyEnvelope, computeBodyHash } from './envelope';
import { loadConversationKeyRaw, saveConversationKeyRaw, importAesKey } from './conversationKey';
import { publishKeyBundle, queryInboxNotices } from './inbox';
import { upsertConversation } from './conversationStore';
import { listDrafts } from './offchainContracts';
import { applyDraftMessage, type ProposalHashIndex } from './draftSync';
import type { OnWireEnvelope, ResolvedMessage } from './types';
import type { PersistedSession } from './session';

function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

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

/** Backfills one DM thread's store history into the off-chain draft store.
 *  No-ops if we don't have the conversation key locally yet (nothing to
 *  decrypt with) — this only ever happens for a thread neither the inbox
 *  replay nor a prior live session has negotiated on this device. */
async function backfillThread(myAddress: Address, peer: Address): Promise<void> {
  const threadId = dmThreadId(myAddress, peer);
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
 * discovers new counterparty threads via the inbox topic, then backfills
 * every known draft's DM thread — pre-existing or newly discovered — so the
 * off-chain draft store (and therefore the Negotiation tab) is caught up
 * without the user needing to open Chat first.
 *
 * Best-effort throughout: failures are logged, never thrown, since the
 * caller has typically already navigated to /dashboard by the time this
 * settles. One peer's backfill failing never blocks another's.
 */
export async function syncAllKnownThreads(myAddress: Address, session: PersistedSession): Promise<void> {
  const peers = new Set<string>();

  try {
    await publishKeyBundle(session.cert);
    await queryInboxNotices(myAddress, session.privateKeyHex, (notice) => {
      if (!loadConversationKeyRaw(notice.threadId)) {
        saveConversationKeyRaw(notice.threadId, b64decode(notice.convKeyB64));
      }
      upsertConversation(myAddress, {
        threadId: notice.threadId, peer: notice.from, lastActivityUnixMs: notice.ts, lastPreview: notice.preview,
      });
      peers.add(notice.from.toLowerCase());
    });
  } catch (err) {
    console.warn('[xaomsg] sync: inbox backfill failed:', err);
  }

  const myLower = myAddress.toLowerCase();
  for (const draft of listDrafts()) {
    const p1 = draft.party1.toLowerCase();
    const p2 = draft.party2.toLowerCase();
    if (p1 !== myLower && p2 !== myLower) continue;
    peers.add(p1 === myLower ? p2 : p1);
  }

  await Promise.all(
    Array.from(peers).map((peer) =>
      backfillThread(myAddress, peer as Address).catch((err) => {
        console.warn(`[xaomsg] sync: thread backfill failed for peer ${peer}:`, err);
      }),
    ),
  );
}
