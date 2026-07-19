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
import { loadConversationKeyRaw, saveConversationKeyRaw } from '../lib/xaomsg/conversationKey';
import type { PersistedSession } from '../lib/xaomsg/session';

function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

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

    const applyNotice = (n: DmNotice) => {
      const owner = address as Address;
      if (!loadConversationKeyRaw(n.threadId)) saveConversationKeyRaw(n.threadId, b64decode(n.convKeyB64));
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
