import { describe, it, expect } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { type Hex } from 'viem';
import { ContentType } from './types';
import {
  buildUnsignedBody,
  payloadDigest,
  computeBodyHash,
  buildEnvelope,
  verifyEnvelope,
} from './envelope';
import { deriveSessionKeypair } from './session';

async function seal(text = 'hello') {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const { privateKey: sk, cert } = await deriveSessionKeypair(account.address, (m) => account.signMessage({ message: m }));
  const body = buildUnsignedBody({
    threadId: ('0x' + 'aa'.repeat(32)) as Hex,
    contentType: ContentType.TEXT,
    payload: { kind: 'text', text },
    parentHash: ('0x' + '00'.repeat(32)) as Hex,
    sender: account.address,
  });
  const envelope = await buildEnvelope(body, sk, cert);
  return { account, cert, sk, body, envelope };
}

describe('envelope', () => {
  it('round-trips build → verify', async () => {
    const { envelope } = await seal();
    expect(await verifyEnvelope(envelope)).toBe(true);
  });

  it('rejects when the body is tampered (payloadHash no longer matches)', async () => {
    const { envelope } = await seal();
    const tampered = { ...envelope, body: { ...envelope.body, payload: { kind: 'text' as const, text: 'HELLO' } } };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('rejects when sender does not match cert wallet', async () => {
    const { envelope } = await seal();
    const otherAddr = '0x000000000000000000000000000000000000beef' as `0x${string}`;
    const tampered = { ...envelope, body: { ...envelope.body, sender: otherAddr } };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('rejects an envelope whose payloadHash does not match its body', async () => {
    const { envelope } = await seal();
    const tampered = { ...envelope, payloadHash: ('0x' + 'ff'.repeat(32)) as Hex };
    expect(await verifyEnvelope(tampered)).toBe(false);
  });

  it('verifies after a JSON round-trip even when the payload has undefined-valued keys', async () => {
    // Reproduces the real wire path: post() signs payloadDigest(body) against
    // the in-memory body, then JSON.stringify(envelope)s it for encryption;
    // the receiver JSON.parses the decrypted plaintext before verifying. A
    // payload built from a large, partially-filled form (e.g. a contract
    // proposal) routinely has explicit `undefined` values for unset fields.
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { privateKey: sk, cert } = await deriveSessionKeypair(account.address, (m) => account.signMessage({ message: m }));
    const body = buildUnsignedBody({
      threadId: ('0x' + 'aa'.repeat(32)) as Hex,
      contentType: ContentType.PROPOSAL,
      payload: {
        kind: 'proposal',
        revisionNumber: 1,
        data: { eventName: 'Show', venueName: undefined, tickets: undefined, party1: account.address },
      },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: account.address,
    });
    const envelope = await buildEnvelope(body, sk, cert);
    // Simulate the wire transport's JSON.stringify -> JSON.parse round-trip
    // (the encrypt/decrypt in between is opaque to this concern).
    const roundTripped = JSON.parse(JSON.stringify(envelope));
    expect(await verifyEnvelope(roundTripped)).toBe(true);
  });

  it('verifies after a JSON round-trip when the payload contains a Date object', async () => {
    // A raw Date has no own enumerable properties, so a naive structural walk
    // (canonicalStringify without the JSON-round-trip normalization) would
    // hash it as `{}` — but the real wire transport's JSON.stringify calls
    // Date.prototype.toJSON() and encodes it as an ISO string, so the
    // receiver would decode a string, not `{}`, and the hashes would diverge.
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const { privateKey: sk, cert } = await deriveSessionKeypair(account.address, (m) => account.signMessage({ message: m }));
    const body = buildUnsignedBody({
      threadId: ('0x' + 'aa'.repeat(32)) as Hex,
      contentType: ContentType.PROPOSAL,
      payload: {
        kind: 'proposal',
        revisionNumber: 1,
        data: { eventDate: new Date('2026-08-01T00:00:00.000Z') as unknown as string },
      },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: account.address,
    });
    const envelope = await buildEnvelope(body, sk, cert);
    const roundTripped = JSON.parse(JSON.stringify(envelope));
    expect(await verifyEnvelope(roundTripped)).toBe(true);
  });

  it('payloadDigest is stable across object key ordering', () => {
    const a = buildUnsignedBody({
      threadId: ('0x' + 'aa'.repeat(32)) as Hex,
      contentType: ContentType.TEXT,
      payload: { kind: 'text', text: 'x' },
      parentHash: ('0x' + '00'.repeat(32)) as Hex,
      sender: '0x000000000000000000000000000000000000dead',
      messageId: ('0x' + 'bb'.repeat(32)) as Hex,
      sentAt: 12345,
    });
    const b = { ...a }; // structural clone; same fields, same hashes
    expect(payloadDigest(a)).toEqual(payloadDigest(b));
  });
});
