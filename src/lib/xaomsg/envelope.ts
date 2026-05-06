import { keccak256, toBytes, type Hex, type Address } from 'viem';
import type { MessageBody, MessagePayload, OnWireEnvelope, SessionCert } from './types';
import { signWithSession, verifyWithSession, verifySessionCert, isExpired } from './session';

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify((value as Record<string, unknown>)[k])).join(',') + '}';
}

function randomHex32(): Hex {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let out = '0x';
  for (let i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, '0');
  return out as Hex;
}

export function buildUnsignedBody(input: {
  threadId: Hex;
  contentType: MessageBody['contentType'];
  payload: MessagePayload;
  parentHash: Hex;
  sender: Address;
  messageId?: Hex;
  sentAt?: number;
}): MessageBody {
  return {
    v: 1,
    messageId: input.messageId ?? randomHex32(),
    threadId: input.threadId,
    contentType: input.contentType,
    parentHash: input.parentHash,
    payload: input.payload,
    sentAt: input.sentAt ?? Date.now(),
    sender: input.sender,
  };
}

export function payloadDigest(body: MessageBody): Hex {
  return keccak256(toBytes(canonicalStringify(body)));
}

export function computeBodyHash(envelope: OnWireEnvelope): Hex {
  // Hash of the on-wire object EXCLUDING signature — child messages reference
  // this as parentHash, so it must be stable across re-signings of the same body.
  const { signature: _ignored, ...rest } = envelope;
  return keccak256(toBytes(canonicalStringify(rest)));
}

export async function buildEnvelope(
  body: MessageBody,
  sessionPrivateKey: Hex,
  cert: SessionCert,
): Promise<OnWireEnvelope> {
  const payloadHash = payloadDigest(body);
  const signature = await signWithSession(payloadHash, sessionPrivateKey);
  return { body, payloadHash, signature, cert };
}

export async function verifyEnvelope(envelope: OnWireEnvelope): Promise<boolean> {
  if (!(await verifySessionCert(envelope.cert))) return false;
  if (isExpired(envelope.cert)) return false;
  if (envelope.body.sender.toLowerCase() !== envelope.cert.walletAddress.toLowerCase()) return false;
  const recomputed = payloadDigest(envelope.body);
  if (recomputed !== envelope.payloadHash) return false;
  return verifyWithSession(envelope.payloadHash, envelope.signature, envelope.cert.sessionPublicKeyHex as Hex);
}
