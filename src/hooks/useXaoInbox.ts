// src/hooks/useXaoInbox.ts
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import {
  publishKeyBundle, queryInboxNotices, subscribeInbox, type DmNotice,
} from '../lib/xaomsg/inbox';
import {
  loadConversations, upsertConversation, type ConversationRecord,
} from '../lib/xaomsg/conversationStore';
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

    // Key material no longer travels in the notice — useXaoDm derives it
    // on-demand via ECDH when the user opens the thread, and syncAllKnownThreads
    // backfills it in the background. This hook only needs the notice to
    // populate the conversation list.
    const applyNotice = (n: DmNotice) => {
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
