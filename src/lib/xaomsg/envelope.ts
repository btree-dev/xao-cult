import { keccak256, toBytes, type Hex, type Address } from 'viem';
import type { MessageBody, MessagePayload, OnWireEnvelope, SessionCert } from './types';
import { signWithSession, verifyWithSession, verifySessionCert } from './session';

// Must match how a real JSON.stringify/parse round-trip treats `undefined` —
// the wire transport always does exactly one such round-trip (post() calls
// JSON.stringify(envelope) before encrypting; the receiver JSON.parses the
// decrypted plaintext) between the sender signing payloadDigest(body) and the
// receiver recomputing it in verifyEnvelope. JSON.stringify drops
// undefined-valued object keys entirely and turns undefined array elements
// into null; if canonicalStringify didn't mirror that, any payload containing
// an explicit `undefined` (routine in a large, partially-filled form object,
// e.g. a contract proposal's data) would hash differently before and after
// the round-trip, so a genuine, untampered message would fail verification
// and get silently dropped on the receiving end.
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map((v) => (v === undefined ? 'null' : canonicalStringify(v))).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
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

// Normalizes a value through an actual JSON.stringify/parse round-trip before
// canonicalStringify sees it — the same round-trip the wire transport always
// performs. This makes the undefined-key fix above belt-and-suspenders rather
// than the only defense: it also covers every other value JSON.stringify
// treats specially in ways a raw structural walk wouldn't (e.g. a `Date`
// becomes an ISO string via its own toJSON(), not the `{}` a naive walk of
// its own enumerable properties would produce). Hashing the same normalized
// shape on both ends is what guarantees a genuine, untampered message
// verifies regardless of what value types happen to be in its payload.
function hashableStringify(value: unknown): string {
  return canonicalStringify(JSON.parse(JSON.stringify(value)));
}

export function payloadDigest(body: MessageBody): Hex {
  return keccak256(toBytes(hashableStringify(body)));
}

export function computeBodyHash(envelope: OnWireEnvelope): Hex {
  // Hash of the on-wire object EXCLUDING signature — child messages reference
  // this as parentHash, so it must be stable across re-signings of the same body.
  const { signature: _ignored, ...rest } = envelope;
  return keccak256(toBytes(hashableStringify(rest)));
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
  if (envelope.body.sender.toLowerCase() !== envelope.cert.walletAddress.toLowerCase()) return false;
  const recomputed = payloadDigest(envelope.body);
  if (recomputed !== envelope.payloadHash) return false;
  return verifyWithSession(envelope.payloadHash, envelope.signature, envelope.cert.sessionPublicKeyHex as Hex);
}
