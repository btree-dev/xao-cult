import { type Address, concat, keccak256, toBytes } from 'viem';

export const INBOX_TOPIC_DOMAIN = 'xao-inbox-topic-v1';

/** Deterministic Waku content topic for a user's inbox. Intentionally derivable
 *  from the address alone so a cold sender can find it. Notices posted here are
 *  ECIES-encrypted to the owner (see inbox.ts); the key bundle posted here is public. */
export function inboxTopicForAddress(addr: Address): string {
  const opaque = keccak256(concat([toBytes(INBOX_TOPIC_DOMAIN), toBytes(addr.toLowerCase() as Address)]));
  return `/xao/1/${opaque.slice(2)}/json`;
}
