// src/hooks/useXaoThread.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Hex } from 'viem';
import { encryptBody, decryptBody } from '../lib/xaomsg/crypto';
import {
  buildEnvelope, buildUnsignedBody, computeBodyHash, verifyEnvelope,
} from '../lib/xaomsg/envelope';
import { publishToTopic, queryHistory, subscribeToTopic } from '../lib/xaomsg/waku';
import { mergeResolved } from '../lib/xaomsg/merge';
import {
  ContentType, type OnWireEnvelope, type ProposalPayload, type ResolvedMessage, type TextPayload,
} from '../lib/xaomsg/types';
import type { PersistedSession } from '../lib/xaomsg/session';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

export interface UseXaoThreadOptions {
  threadId: Hex | null;
  contentTopic: string | null;
  threadKey: CryptoKey | null;
  session: PersistedSession | null;
}

export interface UseXaoThreadResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
}

export function useXaoThread({ threadId, contentTopic, threadKey, session }: UseXaoThreadOptions): UseXaoThreadResult {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    if (!contentTopic || !threadKey || !threadId) return;
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
            if (!(await verifyEnvelope(envelope))) return;
            if (envelope.body.threadId !== threadId) return;
            const resolved: ResolvedMessage = {
              envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            setMessages((prev) => mergeResolved(prev, resolved));
          } catch (err) {
            console.warn('[xaomsg] failed to handle inbound message:', err);
          }
        };

        const unsub = await subscribeToTopic(contentTopic, (bytes) => { void onBytes(bytes); });
        if (cancelled) { await unsub(); return; }
        unsubRef.current = unsub;
        setIsLoading(false);
        await queryHistory(contentTopic, (bytes) => { void onBytes(bytes); });
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
    async (contentType: ContentType, payload: TextPayload | ProposalPayload, parentHash: Hex): Promise<ResolvedMessage> => {
      if (!session) throw new Error('No session — call unlock() first');
      if (!threadId || !contentTopic) throw new Error('No thread context');
      if (!threadKey) throw new Error('Thread key not ready');

      const body = buildUnsignedBody({
        threadId, contentType, payload, parentHash, sender: session.cert.walletAddress,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
      await publishToTopic(contentTopic, new TextEncoder().encode(ciphertextB64));

      const resolved: ResolvedMessage = {
        envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
      };
      setMessages((prev) => mergeResolved(prev, resolved));
      return resolved;
    },
    [session, threadId, threadKey, contentTopic],
  );

  const postText = useCallback(
    (text: string, parentHash: Hex = ZERO_HASH) => post(ContentType.TEXT, { kind: 'text', text }, parentHash),
    [post],
  );
  const postProposal = useCallback(
    (proposal: ProposalPayload, parentHash: Hex = ZERO_HASH) =>
      post(proposal.kind === 'counter-proposal' ? ContentType.COUNTER_PROPOSAL : ContentType.PROPOSAL, proposal, parentHash),
    [post],
  );

  return { messages, isLoading, error, postText, postProposal };
}
