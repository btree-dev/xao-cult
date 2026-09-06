import { useEffect, useState } from 'react';
import { createPublicClient, http, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SHOW_CONTRACT_ABI } from '../lib/web3/eventcontract';

// Standalone read-only client — reads the two party structs off the deployed
// ShowContract WITHOUT touching the connected wallet (no MetaMask popup), same
// pattern as the permissionless Authenticate check. `party1()`/`party2()` each
// return [wallet, role, xaoUsername]; party1's username is written at the
// contract's construction and party2's when party2 signs (setParty2Username),
// so once a draft is on-chain this is the AUTHORITATIVE source of both display
// names — independent of the Waku contact-card exchange, which only fills the
// local cache during the pre-deploy negotiation window.
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

export interface OnchainUsernames {
  /** wallet address (lowercased) -> non-empty xaoUsername read on-chain */
  byAddress: Record<string, string>;
}

/** Reads party1/party2 xaoUsername from a deployed ShowContract. Returns an
 *  empty map (and never throws) when there is no contract address yet or the
 *  read fails — callers fall back to the local profile cache. */
export function useOnchainUsernames(contractAddress?: string | null): OnchainUsernames {
  const [byAddress, setByAddress] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!contractAddress || !contractAddress.startsWith('0x')) { setByAddress({}); return; }
    let cancelled = false;
    const addr = contractAddress as Address;

    (async () => {
      try {
        const [p1, p2] = await Promise.all([
          publicClient.readContract({ address: addr, abi: SHOW_CONTRACT_ABI, functionName: 'party1' }),
          publicClient.readContract({ address: addr, abi: SHOW_CONTRACT_ABI, functionName: 'party2' }),
        ]) as [readonly [Address, number, string], readonly [Address, number, string]];

        if (cancelled) return;
        const map: Record<string, string> = {};
        const add = (party: readonly [Address, number, string]) => {
          const [wallet, , username] = party;
          if (wallet && username && username.trim()) map[wallet.toLowerCase()] = username;
        };
        add(p1);
        add(p2);
        setByAddress(map);
      } catch (err) {
        if (!cancelled) {
          console.warn('[useOnchainUsernames] read failed (falling back to cache):', err);
          setByAddress({});
        }
      }
    })();

    return () => { cancelled = true; };
  }, [contractAddress]);

  return { byAddress };
}
