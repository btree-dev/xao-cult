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
import { XAOMSG_DEBUG_BUILD, isWakuDebugEnabled, wakuDebugLog, wakuDebugWarn } from '../lib/xaomsg/debugBuild';

const ZERO_HASH = ('0x' + '00'.repeat(32)) as Hex;

// Debug-only: dumps a thread's raw AES key as hex so the same key can be
// eyeballed/diffed across two browsers (sender vs. receiver) while chasing a
// decrypt mismatch. `importAesKey` (conversationKey.ts) always imports with
// extractable: true, so this succeeds for every real thread key in this app.
// Gated on isWakuDebugEnabled() by every call site (not just the eventual
// console.log) so the crypto.subtle.exportKey call itself is skipped when
// debug logging is off, not just its output.
async function debugKeyHex(key: CryptoKey): Promise<string> {
  try {
    const raw = await crypto.subtle.exportKey('raw', key);
    return Array.from(new Uint8Array(raw)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return `<key not extractable: ${err instanceof Error ? err.message : String(err)}>`;
  }
}

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
  /** The sender's own XAO username, piggybacked on every outbound message so
   *  the counterparty's display name arrives with the message itself. */
  senderUsername?: string | null;
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

export function useXaoThread({ threadId, contentTopic, threadKey, session, onMessage, senderUsername }: UseXaoThreadOptions): UseXaoThreadResult {
  const [messages, setMessages] = useState<ResolvedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const senderUsernameRef = useRef(senderUsername);
  senderUsernameRef.current = senderUsername;

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
        // `source` is tagged through so a decrypt failure can be pinned to
        // live delivery vs. store backfill (e.g. a message encrypted under a
        // since-invalidated conversation key surfaces only on the 'history'
        // path — see conversationKey.ts's v3 cache-bust comment).
        const onBytes = async (bytes: Uint8Array, source: 'live' | 'history') => {
          try {
            wakuDebugLog(`[xaomsg] thread#16 [build ${XAOMSG_DEBUG_BUILD}] (${source}): decoding payload bytes on topic ${contentTopic}, thread ${threadId}`);
            const b64 = new TextDecoder().decode(bytes);
            wakuDebugLog(`[xaomsg] thread#16 (${source}): raw ciphertext (b64, ${b64.length} chars):`, b64);

            if (isWakuDebugEnabled()) {
              wakuDebugLog(`[xaomsg] thread#17 (${source}): decrypting body with key:`, await debugKeyHex(threadKey));
            }
            let plaintext: string;
            try {
              plaintext = await decryptBody(b64, threadKey);
            } catch (err) {
              console.warn(
                `[xaomsg] thread#17 (${source}): decrypt failed — thread key doesn't match this ciphertext ` +
                  '(stale/wrong conversation key), dropping message',
              );
              if (isWakuDebugEnabled()) {
                wakuDebugWarn(
                  `[xaomsg] thread#17 (${source}): decrypt-fail detail — key used:`,
                  await debugKeyHex(threadKey),
                  'ciphertext:', b64,
                  'error:', err,
                );
              }
              return;
            }
            wakuDebugLog(`[xaomsg] thread#17 (${source}): decrypted plaintext:`, plaintext);

            wakuDebugLog(`[xaomsg] thread#18 (${source}): parsing envelope JSON`);
            const envelope = JSON.parse(plaintext) as OnWireEnvelope;

            wakuDebugLog(`[xaomsg] thread#19 (${source}): verifying envelope signature`);
            if (!(await verifyEnvelope(envelope))) {
              console.warn('[xaomsg] envelope verification failed; dropping');
              return;
            }

            wakuDebugLog(`[xaomsg] thread#20 (${source}): checking threadId match`);
            if (envelope.body.threadId !== threadId) {
              wakuDebugWarn(`[xaomsg] thread#20 (${source}): threadId mismatch, dropping`, {
                expected: threadId,
                got: envelope.body.threadId,
              });
              return;
            }

            const resolved: ResolvedMessage = {
              envelope, bodyHash: computeBodyHash(envelope), receivedAtUnixMs: Date.now(),
            };
            if (cancelled) return;
            wakuDebugLog(`[xaomsg] thread#21 (${source}): recording message ${envelope.body.messageId}`);
            record(resolved);
          } catch (err) {
            console.warn(`[xaomsg] failed to handle inbound message (${source}):`, err);
          }
        };

        // Subscribe to live messages BEFORE backfilling history, so nothing
        // published during the store query is missed (mergeResolved dedupes any
        // overlap between the two sources).
        const unsub = await subscribeToTopic(contentTopic, (bytes) => { void onBytes(bytes, 'live'); });
        if (cancelled) { await unsub(); return; }
        unsubRef.current = unsub;
        // isLoading stays true through history backfill (not just subscribe)
        // so the empty-thread message never flashes before history arrives —
        // messages already merged in via onBytes still render live underneath.
        await queryHistory(contentTopic, (bytes) => { void onBytes(bytes, 'history'); });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
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
        senderUsername: senderUsernameRef.current ?? undefined,
      });
      const envelope = await buildEnvelope(body, session.privateKeyHex, session.cert);
      const plaintext = JSON.stringify(envelope);
      wakuDebugLog(`[xaomsg] thread#22 [build ${XAOMSG_DEBUG_BUILD}] (send): encrypting message ${body.messageId} on topic ${contentTopic}, thread ${threadId}`);
      if (isWakuDebugEnabled()) {
        wakuDebugLog('[xaomsg] thread#22 (send): encrypting with key:', await debugKeyHex(threadKey));
      }
      wakuDebugLog('[xaomsg] thread#22 (send): plaintext envelope:', plaintext);
      const ciphertextB64 = await encryptBody(plaintext, threadKey);
      wakuDebugLog(`[xaomsg] thread#23 (send): ciphertext (b64, ${ciphertextB64.length} chars):`, ciphertextB64);
      await publishToTopic(contentTopic, new TextEncoder().encode(ciphertextB64));
      wakuDebugLog(`[xaomsg] thread#23 (send): published message ${body.messageId}`);

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
