import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address, Hex } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

vi.mock('./waku', () => ({
  publishToTopic: vi.fn(async () => {}),
  subscribeToTopic: vi.fn(),
  queryHistory: vi.fn(async () => {}),
}));
vi.mock('./inbox', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./inbox')>();
  return {
    ...actual,
    publishKeyBundle: vi.fn(async () => {}),
    queryInboxNotices: vi.fn(async () => {}),
    queryPeerKeyBundle: vi.fn(async () => null),
  };
});

import { syncAllKnownThreads } from './sync';
import { queryHistory } from './waku';
import { publishKeyBundle, queryInboxNotices, queryPeerKeyBundle } from './inbox';
import { deriveDmConversationKeyRaw } from './ecies';
import { dmThreadId } from './dmThreadId';
import { contentTopicForThread } from './topicId';
import { saveConversationKeyRaw, generateRawConversationKey, importAesKey } from './conversationKey';
import { encryptBody } from './crypto';
import { buildUnsignedBody, buildEnvelope } from './envelope';
import { createSessionKeypair, mintSessionCert } from './session';
import { upsertDraft, loadDraft } from './offchainContracts';
import { loadConversations } from './conversationStore';
import { ContentType, type ProposalPayload } from './types';
import type { PersistedSession } from './session';

type Account = ReturnType<typeof privateKeyToAccount>;

/** Mints a real, signature-verifiable session cert for `account`, the same
 *  way the app does (mirrors inbox.test.ts's makeGenuineCertWithKey) — the
 *  cert's walletAddress and the signature must come from the SAME key, or
 *  verifySessionCert (which recovers the signer and compares it to
 *  walletAddress) rejects it outright. */
async function makeSession(account: Account): Promise<PersistedSession> {
  const kp = await createSessionKeypair();
  const cert = await mintSessionCert({
    walletAddress: account.address,
    sessionPublicKeyHex: kp.publicKey,
    expiresAtUnixMs: Date.now() + 60 * 60 * 1000,
    chainId: 84532,
    signMessage: (message) => account.signMessage({ message }),
  });
  return { cert, privateKeyHex: kp.privateKey };
}

/** Builds the exact encrypted-bytes shape a peer's real `post()` would have
 *  published on the DM thread's content topic, so `syncAllKnownThreads`'s
 *  decode/decrypt/verify pipeline exercises the real code path. */
async function encryptedProposalBytes(
  threadId: Hex, threadKey: CryptoKey, senderAccount: Account, draftId: string, revisionNumber: number,
): Promise<Uint8Array> {
  const senderSession = await makeSession(senderAccount);
  const payload: ProposalPayload = { kind: 'proposal', revisionNumber, data: { draftId } };
  const body = buildUnsignedBody({
    threadId, contentType: ContentType.PROPOSAL, payload, parentHash: ('0x' + '00'.repeat(32)) as Hex, sender: senderAccount.address,
  });
  const envelope = await buildEnvelope(body, senderSession.privateKeyHex, senderSession.cert);
  const ciphertextB64 = await encryptBody(JSON.stringify(envelope), threadKey);
  return new TextEncoder().encode(ciphertextB64);
}

describe('syncAllKnownThreads', () => {
  let myAccount: Account;
  let peerAccount: Account;
  let MY: Address;
  let PEER: Address;

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(queryHistory).mockReset().mockImplementation(async () => {});
    vi.mocked(publishKeyBundle).mockReset().mockImplementation(async () => {});
    vi.mocked(queryInboxNotices).mockReset().mockImplementation(async () => {});
    vi.mocked(queryPeerKeyBundle).mockReset().mockImplementation(async () => null);
    myAccount = privateKeyToAccount(generatePrivateKey());
    peerAccount = privateKeyToAccount(generatePrivateKey());
    MY = myAccount.address;
    PEER = peerAccount.address;
  });

  it('backfills a known draft thread and upserts the newer revision', async () => {
    const threadId = dmThreadId(MY, PEER);
    const rawKey = generateRawConversationKey();
    saveConversationKeyRaw(threadId, rawKey);
    const threadKey = await importAesKey(rawKey);

    upsertDraft({
      draftId: 'd1', party1: MY, party2: PEER, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now(),
    });

    const bytes = await encryptedProposalBytes(threadId, threadKey, peerAccount, 'd1', 2);
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(bytes);
    });

    const session = await makeSession(myAccount);
    await syncAllKnownThreads(MY, session);

    expect(loadDraft('d1')?.revisionNumber).toBe(2);
  });

  it('discovers a new peer via an inbox notice and backfills its thread too', async () => {
    // No key travels in the notice anymore — the thread key is whatever
    // ECDH(mySession, peerSession) derives, and ensureConversationKey gets
    // there by resolving the peer's key bundle, mocked below.
    const threadId = dmThreadId(MY, PEER);
    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const rawKey = await deriveDmConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex);
    const threadKey = await importAesKey(rawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onDmNotice) => {
      onDmNotice({ from: PEER, threadId, convKeyB64: 'unused', ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const bytes = await encryptedProposalBytes(threadId, threadKey, peerAccount, 'd2', 1);
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(bytes);
    });

    await syncAllKnownThreads(MY, session);

    expect(loadConversations(MY).some((c) => c.peer.toLowerCase() === PEER.toLowerCase())).toBe(true);
    expect(loadDraft('d2')?.revisionNumber).toBe(1);
    expect(publishKeyBundle).toHaveBeenCalledWith(session.cert);
  });

  it('a failure backfilling one peer does not block others', async () => {
    const threadIdA = dmThreadId(MY, PEER);
    const otherAccount = privateKeyToAccount(generatePrivateKey());
    const otherPeer = otherAccount.address;
    const threadIdB = dmThreadId(MY, otherPeer);
    saveConversationKeyRaw(threadIdA, generateRawConversationKey());
    const rawKeyB = generateRawConversationKey();
    saveConversationKeyRaw(threadIdB, rawKeyB);
    const threadKeyB = await importAesKey(rawKeyB);

    upsertDraft({ draftId: 'dA', party1: MY, party2: PEER, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now() });
    upsertDraft({ draftId: 'dB', party1: MY, party2: otherPeer, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now() });

    const topicA = contentTopicForThread(threadIdA);
    const topicB = contentTopicForThread(threadIdB);
    const bytesB = await encryptedProposalBytes(threadIdB, threadKeyB, otherAccount, 'dB', 2);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === topicA) throw new Error('simulated network failure');
      if (topic === topicB) await onMessage(bytesB);
    });

    const session = await makeSession(myAccount);
    await expect(syncAllKnownThreads(MY, session)).resolves.toBeUndefined();
    expect(loadDraft('dB')?.revisionNumber).toBe(2);
  });
});
