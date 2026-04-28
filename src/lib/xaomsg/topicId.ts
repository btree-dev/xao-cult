import { concat, keccak256, toBytes, type Hex } from 'viem';

/**
 * Domain prefix for the second hashing step. Distinct from THREAD_DOMAIN so
 * even if a future component reuses the threadId formula, the resulting Waku
 * topic is opaque to outside observers — no easy mapping topic → show address.
 */
export const MSG_TOPIC_DOMAIN = 'xao-msg-topic-v1';

/**
 * Waku content-topic format is `/<application>/<version>/<content>/<encoding>`.
 * Encoding is `json` because each envelope is a JSON-serialized object.
 */
export function contentTopicForThread(threadId: Hex): string {
  const opaque = keccak256(concat([toBytes(MSG_TOPIC_DOMAIN), toBytes(threadId)]));
  return `/xao/1/${opaque.slice(2)}/json`;
}
