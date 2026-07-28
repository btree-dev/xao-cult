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
import { deriveDmConversationKeyRaw, deriveEventConversationKeyRaw } from './ecies';
import { dmThreadId } from './dmThreadId';
import { threadIdForDraft } from './threadId';
import { contentTopicForThread } from './topicId';
import { saveConversationKeyRaw, generateRawConversationKey, importAesKey } from './conversationKey';
import { encryptBody } from './crypto';
import { buildUnsignedBody, buildEnvelope } from './envelope';
import { createSessionKeypair, mintSessionCert } from './session';
import { upsertDraft, loadDraft } from './offchainContracts';
import { loadConversations } from './conversationStore';
import { ContentType, type ProposalPayload, type SystemPayload } from './types';
import type { PersistedSession } from './session';

type Account = ReturnType<typeof privateKeyToAccount>;

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

async function encryptedDmProposalBytes(
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

async function encryptedEventBytes(
  threadId: Hex, threadKey: CryptoKey, senderAccount: Account, contentType: ContentType, payload: ProposalPayload | SystemPayload,
): Promise<Uint8Array> {
  const senderSession = await makeSession(senderAccount);
  const body = buildUnsignedBody({
    threadId, contentType, payload, parentHash: ('0x' + '00'.repeat(32)) as Hex, sender: senderAccount.address,
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

  it('discovers a new DM peer via a dm-kind inbox notice and backfills its thread', async () => {
    const threadId = dmThreadId(MY, PEER);
    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const rawKey = await deriveDmConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex);
    const threadKey = await importAesKey(rawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'dm', from: PEER, threadId, ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const bytes = await encryptedDmProposalBytes(threadId, threadKey, peerAccount, 'unused', 1);
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(bytes);
    });

    await syncAllKnownThreads(MY, session);

    expect(loadConversations(MY).some((c) => c.peer.toLowerCase() === PEER.toLowerCase())).toBe(true);
    expect(publishKeyBundle).toHaveBeenCalledWith(session.cert);
  });

  it('discovers a new draft via an event-kind inbox notice and backfills its own thread', async () => {
    const draftId = 'draft-new';
    const threadId = threadIdForDraft(draftId);
    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const rawKey = await deriveEventConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex, draftId);
    const threadKey = await importAesKey(rawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'event', from: PEER, threadId, draftId, ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const proposalBytes = await encryptedEventBytes(
      threadId, threadKey, peerAccount, ContentType.PROPOSAL,
      { kind: 'proposal', revisionNumber: 1, data: { draftId } } as ProposalPayload,
    );
    const targetTopic = contentTopicForThread(threadId);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === targetTopic) await onMessage(proposalBytes);
    });

    // Fresh device: this draft is not locally known before sync runs.
    expect(loadDraft(draftId)).toBeNull();

    await syncAllKnownThreads(MY, session);

    expect(loadDraft(draftId)?.revisionNumber).toBe(1);
  });

  it('records a mint pairing from the notice immediately, for a draft already known locally', async () => {
    const draftId = 'draft-known';
    const threadId = threadIdForDraft(draftId);
    const contractAddress = '0x3333333333333333333333333333333333333333' as Address;
    upsertDraft({
      draftId, party1: MY, party2: PEER, terms: {}, revisionNumber: 1, approvals: [], lastActivityUnixMs: Date.now(),
    });

    const session = await makeSession(myAccount);
    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'event', from: PEER, threadId, draftId, contractAddress, ts: Date.now() });
    });
    // No key bundle available for the peer — backfill will no-op, but the
    // immediate mint-pairing record from the notice itself must still land.
    vi.mocked(queryPeerKeyBundle).mockImplementation(async () => null);

    await syncAllKnownThreads(MY, session);

    expect(loadDraft(draftId)?.mintedContractAddress?.toLowerCase()).toBe(contractAddress.toLowerCase());
  });

  it('a failure backfilling one event thread does not block a DM peer backfill', async () => {
    const draftId = 'draft-fails';
    const eventThreadId = threadIdForDraft(draftId);
    const dmThreadIdVal = dmThreadId(MY, PEER);

    const session = await makeSession(myAccount);
    const peerSession = await makeSession(peerAccount);
    const dmRawKey = await deriveDmConversationKeyRaw(session.privateKeyHex, peerSession.cert.sessionPublicKeyHex);
    const dmThreadKey = await importAesKey(dmRawKey);

    vi.mocked(queryInboxNotices).mockImplementation(async (_addr, _priv, onThreadNotice) => {
      onThreadNotice({ kind: 'event', from: PEER, threadId: eventThreadId, draftId, ts: Date.now() });
      onThreadNotice({ kind: 'dm', from: PEER, threadId: dmThreadIdVal, ts: Date.now() });
    });
    vi.mocked(queryPeerKeyBundle).mockImplementation(async (peer) => (
      peer.toLowerCase() === PEER.toLowerCase() ? peerSession.cert : null
    ));

    const dmTopic = contentTopicForThread(dmThreadIdVal);
    const eventTopic = contentTopicForThread(eventThreadId);
    const dmBytes = await encryptedDmProposalBytes(dmThreadIdVal, dmThreadKey, peerAccount, 'unused', 1);
    vi.mocked(queryHistory).mockImplementation(async (topic, onMessage) => {
      if (topic === eventTopic) throw new Error('simulated network failure');
      if (topic === dmTopic) await onMessage(dmBytes);
    });

    await expect(syncAllKnownThreads(MY, session)).resolves.toBeUndefined();
    expect(loadConversations(MY).some((c) => c.peer.toLowerCase() === PEER.toLowerCase())).toBe(true);
  });
});
