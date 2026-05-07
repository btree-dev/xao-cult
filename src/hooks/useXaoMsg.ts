import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Address, type Hex } from 'viem';
import { threadIdForShow } from '../lib/xaomsg/threadId';
import { contentTopicForThread } from '../lib/xaomsg/topicId';
import { loadThreadKey } from '../lib/xaomsg/threadKey';
import { encryptBody, decryptBody } from '../lib/xaomsg/crypto';
import {
  buildEnvelope,
  buildUnsignedBody,
  computeBodyHash,
  verifyEnvelope,
} from '../lib/xaomsg/envelope';
import { publishToTopic, subscribeToTopic } from '../lib/xaomsg/waku';
import {
  ContentType,
  type OnWireEnvelope,
  type ProposalPayload,
  type ResolvedMessage,
  type TextPayload,
} from '../lib/xaomsg/types';
import type { PersistedSession } from '../lib/xaomsg/session';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

export interface UseXaoMsgOptions {
  showContract: Address | null;
  session: PersistedSession | null;
}

export interface UseXaoMsgResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
}

export function useXaoMsg({ showContract, session }: UseXaoMsgOptions): UseXaoMsgResult {
  const threadId = useMemo<Hex | null>(
    () => (showContract ? threadIdForShow(showContract) : null),
    [showContract],
  );
  const contentTopic = useMemo(() => (threadId ? contentTopicForThread(threadId) : null), [threadId]);

  const [threadKey, setThreadKey] = useState<CryptoKey | null>(null);
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showContract) {
      setThreadKey(null);
      return;
    }
    let cancelled = false;
    loadThreadKey(showContract)
      .then((k) => { if (!cancelled) setThreadKey(k); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, [showContract]);

  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (!contentTopic || !threadKey) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const onBytes = async (bytes: Uint8Array) => {
          try {
            const b64 = new TextDecoder().decode(bytes);
            const plaintext = await decryptBody(b64, threadKey);
            const envelope = JSON.parse(plaintext) as OnWireEnvelope;
            if (!(await verifyEnvelope(envelope))) {
              console.warn('[xaomsg] envelope verification failed; dropping');
              return;
            }
            if (envelope.body.threadId !== threadId) return;
            const resolved: ResolvedMessage = {
              envelope,
              bodyHash: computeBodyHash(envelope),
              receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            setMessages((prev) => {
              if (prev.some((m) => m.envelope.body.messageId === resolved.envelope.body.messageId)) {
                return prev;
              }
              return [...prev, resolved].sort((a, b) => a.envelope.body.sentAt - b.envelope.body.sentAt);
            });
          } catch (err) {
            console.warn('[xaomsg] failed to handle inbound message:', err);
          }
        };

        const unsub = await subscribeToTopic(contentTopic, (bytes) => { void onBytes(bytes); });
        if (cancelled) {
          await unsub();
          return;
        }
        unsubRef.current = unsub;
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      const u = unsubRef.current;
      unsubRef.current = null;
      if (u) void u();
    };
  }, [contentTopic, threadKey, threadId]);

  const post = useCallback(
    async (
      contentType: ContentType,
      payload: TextPayload | ProposalPayload,
      parentHash: Hex,
    ): Promise<ResolvedMessage> => {
      if (!session) throw new Error('No session — call unlock() first');
      if (!showContract || !threadId) throw new Error('No thread context');
      if (!threadKey) throw new Error('Thread key not ready');
      if (!contentTopic) throw new Error('No content topic');

      const body = buildUnsignedBody({
        threadId,
        contentType,
        payload,
        parentHash,
        sender: session.cert.walletAddress,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
      const bytes = new TextEncoder().encode(ciphertextB64);

      await publishToTopic(contentTopic, bytes);

      const resolved: ResolvedMessage = {
        envelope,
        bodyHash: computeBodyHash(envelope),
        receivedAtUnixMs: Date.now(),
      };
      // Optimistic insert — Waku may also echo this back; subscriber handler
      // dedupes by messageId.
      setMessages((prev) => [...prev, resolved].sort((a, b) => a.envelope.body.sentAt - b.envelope.body.sentAt));
      return resolved;
    },
    [session, showContract, threadId, threadKey, contentTopic],
  );

  const postText = useCallback(
    (text: string, parentHash: Hex = ZERO_HASH) =>
      post(ContentType.TEXT, { kind: 'text', text }, parentHash),
    [post],
  );
  const postProposal = useCallback(
    (proposal: ProposalPayload, parentHash: Hex = ZERO_HASH) =>
      post(proposal.kind === 'counter-proposal' ? ContentType.COUNTER_PROPOSAL : ContentType.PROPOSAL, proposal, parentHash),
    [post],
  );

  return { messages, isLoading, error, postText, postProposal };
}
