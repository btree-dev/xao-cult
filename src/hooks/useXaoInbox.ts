// src/hooks/useXaoInbox.ts
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import {
  publishKeyBundle, queryInboxNotices, subscribeInbox, type ThreadNotice,
} from '../lib/xaomsg/inbox';
import {
  loadConversations, upsertConversation, type ConversationRecord,
} from '../lib/xaomsg/conversationStore';
import { backfillEventThreadFromNotice } from '../lib/xaomsg/sync';
import type { PersistedSession } from '../lib/xaomsg/session';

export interface UseXaoInboxResult { conversations: ConversationRecord[]; }

export function useXaoInbox(session: PersistedSession | null): UseXaoInboxResult {
  const { address } = useAccount();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);

  useEffect(() => {
    if (!address) { setConversations([]); return; }
    setConversations(loadConversations(address));
  }, [address]);

  useEffect(() => {
    if (!address || !session) return;
    let cancelled = false;
    let unsub: (() => Promise<void>) | null = null;

    // Same callback is passed to both subscribeInbox (live) AND
    // queryInboxNotices (full history replay) below — so on every mount,
    // every historical event notice ever received would otherwise re-fire
    // an event-thread backfill (key derivation + a full queryHistory call
    // per draft), duplicating what syncAllKnownThreads already did once at
    // login. This set bounds that to once per draftId per mount, live or
    // replayed.
    const queuedBackfillDraftIds = new Set<string>();

    // Only dm-kind notices populate the DM conversation list — event
    // (draft/contract) notices never appear in `conversations`. They still
    // need a live-delivery path though (Fix 6): without this, a
    // counterparty already live in the app when you send a first proposal
    // wouldn't see it until they reload from `/` (syncAllKnownThreads only
    // runs once, at login). So an event notice fires the same
    // backfillEventThreadFromNotice used at login, fire-and-forget, purely
    // so the data lands in localStorage sooner — it never touches
    // `conversations`.
    const applyNotice = (n: ThreadNotice) => {
      if (n.kind === 'event') {
        if (!n.draftId) return;
        if (cancelled) return;
        if (queuedBackfillDraftIds.has(n.draftId)) return;
        queuedBackfillDraftIds.add(n.draftId);
        backfillEventThreadFromNotice(address as Address, session, {
          draftId: n.draftId, from: n.from, contractAddress: n.contractAddress,
        }).catch((err) => console.warn('[xaomsg] live event notice backfill failed:', err));
        return;
      }
      const owner = address as Address;
      const next = upsertConversation(owner, {
        threadId: n.threadId, peer: n.from, lastActivityUnixMs: n.ts, lastPreview: n.preview,
      });
      if (!cancelled) setConversations(next);
    };

    (async () => {
      try {
        await publishKeyBundle(session.cert);
      } catch (err) {
        console.warn('[xaomsg] key bundle publish failed:', err);
      }

      try {
        unsub = await subscribeInbox(address as Address, session.privateKeyHex, () => {}, applyNotice);
        if (cancelled) { await unsub(); return; }
        await queryInboxNotices(address as Address, session.privateKeyHex, applyNotice);
      } catch (err) {
        console.error('[xaomsg] inbox subscription failed:', err);
      }
    })();

    return () => { cancelled = true; if (unsub) void unsub(); };
  }, [address, session]);

  return { conversations };
}
