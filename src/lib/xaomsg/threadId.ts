import { type Address, type Hex, concat, keccak256, toBytes, isAddress } from 'viem';

export const THREAD_DOMAIN = 'xao-thread-v1';

export function threadIdForShow(showAddress: Address): Hex {
  if (!isAddress(showAddress, { strict: false })) {
    throw new Error(`threadIdForShow: invalid address: ${showAddress}`);
  }
  const lower = showAddress.toLowerCase() as Address;
  return keccak256(concat([toBytes(THREAD_DOMAIN), toBytes(lower)]));
}
