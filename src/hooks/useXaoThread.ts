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
  ContentType,
  type AcceptPayload,
  type ContactCardPayload,
  type OnWireEnvelope,
  type ProposalPayload,
  type RejectPayload,
  type ResolvedMessage,
  type SystemPayload,
  type TextPayload,
} from '../lib/xaomsg/types';
import type { PersistedSession } from '../lib/xaomsg/session';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

export interface UseXaoThreadOptions {
  threadId: Hex | null;
  contentTopic: string | null;
  threadKey: CryptoKey | null;
  session: PersistedSession | null;
  /** Fired once per newly-merged message — inbound or our own send, deduped
   *  by messageId — so a caller can route side effects (profile-cache writes,
   *  off-chain contract store upserts) by `resolved.envelope.body.contentType`
   *  without this hook knowing about those concerns. */
  onMessage?: (resolved: ResolvedMessage) => void;
}

export interface UseXaoThreadResult {
  messages: ResolvedMessage[];
  isLoading: boolean;
  error: string | null;
  postText: (text: string, parentHash?: Hex) => Promise<ResolvedMessage>;
  postProposal: (proposal: ProposalPayload, parentHash?: Hex) => Promise<ResolvedMessage>;
  postContactCard: (card: ContactCardPayload) => Promise<ResolvedMessage>;
  postAccept: (proposalHash: Hex) => Promise<ResolvedMessage>;
  postReject: (proposalHash: Hex, reason?: string) => Promise<ResolvedMessage>;
  postSystem: (payload: SystemPayload) => Promise<ResolvedMessage>;
}

export function useXaoThread({ threadId, contentTopic, threadKey, session, onMessage }: UseXaoThreadOptions): UseXaoThreadResult {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards onMessage against firing twice for the same message — Waku echoes
  // a light-pushed message back through our own filter subscription, and that
  // echo can land alongside the optimistic insert from post().
  const seenIdsRef = useRef<Set<Hex>>(new Set());
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const record = useCallback((resolved: ResolvedMessage) => {
    const id = resolved.envelope.body.messageId;
    setMessages((prev) => mergeResolved(prev, resolved));
    if (!seenIdsRef.current.has(id)) {
      seenIdsRef.current.add(id);
      onMessageRef.current?.(resolved);
    }
  }, []);

  const unsubRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    seenIdsRef.current = new Set();
    if (!contentTopic || !threadKey || !threadId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        // Shared decode → decrypt → verify → merge pipeline for every inbound
        // byte payload, whether it arrives live via filter or as store history.
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
              envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            record(resolved);
          } catch (err) {
            console.warn('[xaomsg] failed to handle inbound message:', err);
          }
        };

        // Subscribe to live messages BEFORE backfilling history, so nothing
        // published during the store query is missed (mergeResolved dedupes any
        // overlap between the two sources).
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
  }, [contentTopic, threadKey, threadId, record]);

  const post = useCallback(
    async (
      contentType: ContentType,
      payload: TextPayload | ProposalPayload | AcceptPayload | RejectPayload | ContactCardPayload | SystemPayload,
      parentHash: Hex,
    ): Promise<ResolvedMessage> => {
      if (!session) throw new Error('No session — call unlock() first');
      if (!threadId) throw new Error('No thread context');
      if (!threadKey) throw new Error('Thread key not ready');
      if (!contentTopic) throw new Error('No content topic');

      const body = buildUnsignedBody({
        threadId, contentType, payload, parentHash, sender: session.cert.walletAddress,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
      await publishToTopic(contentTopic, new TextEncoder().encode(ciphertextB64));

      const resolved: ResolvedMessage = {
        envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
      };
      // Optimistic insert. Waku echoes this message back through our own filter
      // subscription, and that echo can arrive *before* this line runs — so
      // `record` dedupes by messageId rather than blindly appending/firing twice.
      record(resolved);
      return resolved;
    },
    [session, threadId, threadKey, contentTopic, record],
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
  const postContactCard = useCallback(
    (card: ContactCardPayload) => post(ContentType.CONTACT_CARD, card, ZERO_HASH),
    [post],
  );
  const postAccept = useCallback(
    (proposalHash: Hex) => post(ContentType.ACCEPT, { kind: 'accept', proposalHash }, proposalHash),
    [post],
  );
  const postReject = useCallback(
    (proposalHash: Hex, reason?: string) => post(ContentType.REJECT, { kind: 'reject', proposalHash, reason }, proposalHash),
    [post],
  );
  const postSystem = useCallback(
    (payload: SystemPayload) => post(ContentType.SYSTEM, payload, ZERO_HASH),
    [post],
  );

  return { messages, isLoading, error, postText, postProposal, postContactCard, postAccept, postReject, postSystem };
}
