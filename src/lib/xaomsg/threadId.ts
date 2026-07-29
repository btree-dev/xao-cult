import { type Address, type Hex, concat, keccak256, toBytes, isAddress } from 'viem';

export const THREAD_DOMAIN = 'xao-thread-v1';

export function threadIdForShow(showAddress: Address): Hex {
  if (!isAddress(showAddress, { strict: false })) {
    throw new Error(`threadIdForShow: invalid address: ${showAddress}`);
  }
  const lower = showAddress.toLowerCase() as Address;
  return keccak256(concat([toBytes(THREAD_DOMAIN), toBytes(lower)]));
}

/** Distinct domain from THREAD_DOMAIN so a draftId string can never collide
 *  with an address-derived thread id, even in the edge case where a draftId
 *  happens to look like a hex address. */
export const DRAFT_THREAD_DOMAIN = 'xao-draft-thread-v1';

/** Thread id for a draft's own event thread — carries negotiation content
 *  pre-mint, and (via the inbox mint-notice mapping, see inbox.ts/sync.ts)
 *  keeps being used post-mint too. Independent of the DM thread between the
 *  same two people and of any other draft's thread. */
export function threadIdForDraft(draftId: string): Hex {
  if (!draftId) {
    throw new Error('threadIdForDraft: draftId must be non-empty');
  }
  return keccak256(concat([toBytes(DRAFT_THREAD_DOMAIN), toBytes(draftId)]));
}
