import type { Address, Hex } from 'viem';

/** Content type — keep the order locked; integer values are sent on the wire. */
export enum ContentType {
  TEXT = 0,
  PROPOSAL = 1,
  COUNTER_PROPOSAL = 2,
  ACCEPT = 3,
  REJECT = 4,
  SYSTEM = 5,
  CONTACT_CARD = 6,
}

export interface TextPayload { kind: 'text'; text: string; }
export interface ProposalPayload {
  kind: 'proposal' | 'counter-proposal';
  revisionNumber: number;
  data: Record<string, unknown>;
}
export interface AcceptPayload { kind: 'accept'; proposalHash: Hex; }
export interface RejectPayload { kind: 'reject'; proposalHash: Hex; reason?: string; }

export interface ContactCardPayload {
  kind: 'contact-card';
  walletAddress: Address;
  username: string;
  profilePictureUrl?: string;
  sentAt: number;
}

/** `event: 'minted'` is the only case Plan 2 needs — a new ShowContract was
 *  deployed on-chain for an off-chain draft. Extend with more `event` values
 *  if a future phase needs other announcements on this channel. */
export interface SystemPayload {
  kind: 'system';
  event: 'minted';
  draftId: string;
  contractAddress: Address;
}

export type MessagePayload = TextPayload | ProposalPayload | AcceptPayload | RejectPayload | ContactCardPayload | SystemPayload;

/**
 * SessionCert authorises a session keypair on behalf of a wallet. The
 * keypair is deterministically derived from the wallet (see session.ts's
 * deriveSessionKeypair) — the same wallet always reproduces the same
 * keypair and the same cert, on any device. The wallet signs a fixed-format
 * challenge string; verifiers ecrecover it. No expiry: a compromised key
 * can't be rotated away per-user anyway once it's deterministic, so an
 * expiry field would be a control that looks real but isn't — see
 * docs/superpowers/specs/2026-07-30-deterministic-session-keys-design.md.
 */
export interface SessionCert {
  v: 1;
  walletAddress: Address;
  sessionPublicKeyHex: string;     // 33-byte compressed secp256k1 pubkey, hex with 0x prefix
  /** EIP-191 personal-sign signature over `sessionCertChallenge(...)`. */
  walletSignature: Hex;
}

/** The body an author signs — flat, deterministic, no extra fields. */
export interface MessageBody {
  v: 1;
  messageId: Hex;          // random per-message uuid → 32 bytes hex
  threadId: Hex;
  contentType: ContentType;
  /** Hash of the parent body, or 0x00…00 for root. Forward-compat for Plan 3 DAG. */
  parentHash: Hex;
  payload: MessagePayload;
  /** Unix epoch milliseconds. */
  sentAt: number;
  /** Address claiming authorship — verifier checks against cert.walletAddress. */
  sender: Address;
}

/** What goes on the wire (and on disk for storage tests). */
export interface OnWireEnvelope {
  body: MessageBody;
  /** keccak256(canonicalJSON(body)). Redundant with hashing on receive but stops a bad-impl peer from sending mismatched body+sig. */
  payloadHash: Hex;
  /** ECDSA over `payloadHash` using the session private key. 64 bytes, hex with 0x prefix. */
  signature: Hex;
  cert: SessionCert;
}

/** Once a peer has verified the envelope, this is the fully-resolved record. */
export interface ResolvedMessage {
  envelope: OnWireEnvelope;
  /** Hash used as the parent reference for child messages. */
  bodyHash: Hex;
  /** Wall-clock receive time on this client. */
  receivedAtUnixMs: number;
}
