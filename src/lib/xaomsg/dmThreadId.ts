import { type Address, type Hex, concat, keccak256, toBytes, isAddress } from 'viem';

export const DM_THREAD_DOMAIN = 'xao-dm-thread-v1';

/** Canonical thread id for a 1:1 DM. Sorts the two lowercased addresses so
 *  both parties derive the same id regardless of who initiates. */
export function dmThreadId(a: Address, b: Address): Hex {
  const lo = a.toLowerCase() as Address;
  const hi = b.toLowerCase() as Address;
  if (!isAddress(lo, { strict: false }) || !isAddress(hi, { strict: false })) {
    throw new Error(`dmThreadId: invalid address(es): ${a}, ${b}`);
  }
  const [first, second] = lo < hi ? [lo, hi] : [hi, lo];
  return keccak256(concat([toBytes(DM_THREAD_DOMAIN), toBytes(first), toBytes(second)]));
}
