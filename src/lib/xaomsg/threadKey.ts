import type { Address } from 'viem';
import { deriveDeterministicThreadKey } from './crypto';

/** Phase-1: deterministic derivation. Plan 2 swaps in an ECIES handshake. */
export async function loadThreadKey(showContract: Address): Promise<CryptoKey> {
  return deriveDeterministicThreadKey(showContract);
}
