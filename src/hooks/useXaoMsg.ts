// src/hooks/useXaoMsg.ts
import { useEffect, useMemo, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { threadIdForShow } from '../lib/xaomsg/threadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import { loadThreadKey } from '../lib/xaomsg/threadKey';
import { useXaoThread, type UseXaoThreadResult } from './useXaoThread';
import type { PersistedSession } from '../lib/xaomsg/session';

export interface UseXaoMsgOptions {
  showContract: Address | null;
  session: PersistedSession | null;
}
export type UseXaoMsgResult = UseXaoThreadResult;

export function useXaoMsg({ showContract, session }: UseXaoMsgOptions): UseXaoMsgResult {
  const threadId = useMemo<Hex | null>(
    () => (showContract ? threadIdForShow(showContract) : null),
    [showContract],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  useEffect(() => {
    if (!showContract) { setThreadKey(null); return; }
    let cancelled = false;
    loadThreadKey(showContract).then((k) => { if (!cancelled) setThreadKey(k); }).catch(() => {});
    return () => { cancelled = true; };
  }, [showContract]);

  return useXaoThread({ threadId, contentTopic, threadKey, session });
}
