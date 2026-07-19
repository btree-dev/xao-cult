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
  const [keyLoadError, setKeyLoadError] = useState<string | null>(null);
  useEffect(() => {
    setKeyLoadError(null);
    if (!showContract) { setThreadKey(null); return; }
    let cancelled = false;
    loadThreadKey(showContract)
      .then((k) => { if (!cancelled) setThreadKey(k); })
      .catch((err) => { if (!cancelled) setKeyLoadError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, [showContract]);

  const thread = useXaoThread({ threadId, contentTopic, threadKey, session });
  return { ...thread, error: keyLoadError ?? thread.error };
}
