import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isEthereumWallet } from '@dynamic-labs/ethereum';

// How long a logged-in user's wallet may take to reach wagmi before we stop
// showing a spinner and tell them it isn't going to happen on its own.
const CONNECT_GRACE_MS = 8000;

export type WalletReadiness =
  | 'loading'    // Dynamic SDK still starting up
  | 'logged-out' // no Dynamic user
  | 'ready'      // Dynamic user + wagmi connected — safe to use the app
  | 'connecting' // Dynamic user, wagmi not connected yet, still within the grace period
  | 'no-wallet'  // Dynamic user with no primary wallet in this browser
  | 'non-evm'    // primary wallet isn't an Ethereum wallet, so wagmi can't use it
  | 'stalled';   // EVM wallet present but wagmi never connected (locked / not responding)

/**
 * Single source of truth for "can this user use the app right now".
 *
 * Dynamic's login (user) and wagmi's connection are separate: DynamicWagmiConnector
 * only connects wagmi when Dynamic has an EVM primaryWallet whose connector
 * answers. When that never happens nothing errors or logs — the app just sits
 * there — so this hook names which case we're in so the UI can say so.
 */
export function useWalletReadiness(): { readiness: WalletReadiness; walletLabel: string | null } {
  const { user, sdkHasLoaded, primaryWallet } = useDynamicContext();
  const { isConnected } = useAccount();
  const [graceExpired, setGraceExpired] = useState(false);

  const waitingOnWallet = sdkHasLoaded && !!user && !isConnected;
  useEffect(() => {
    if (!waitingOnWallet) {
      setGraceExpired(false);
      return;
    }
    const t = setTimeout(() => setGraceExpired(true), CONNECT_GRACE_MS);
    return () => clearTimeout(t);
  }, [waitingOnWallet]);

  let readiness: WalletReadiness;
  if (!sdkHasLoaded) readiness = 'loading';
  else if (!user) readiness = 'logged-out';
  else if (isConnected) readiness = 'ready';
  else if (!graceExpired) readiness = 'connecting';
  else if (!primaryWallet) readiness = 'no-wallet';
  else if (!isEthereumWallet(primaryWallet)) readiness = 'non-evm';
  else readiness = 'stalled';

  const walletLabel = primaryWallet
    ? `${primaryWallet.connector?.name ?? 'wallet'} ${primaryWallet.address.slice(0, 6)}…${primaryWallet.address.slice(-4)}`
    : null;

  // Nothing else logs in these states, so leave a breadcrumb for debugging.
  useEffect(() => {
    if (readiness !== 'no-wallet' && readiness !== 'non-evm' && readiness !== 'stalled') return;
    console.warn('[wallet-readiness]', readiness, {
      userId: user?.userId,
      primaryWallet: primaryWallet
        ? { address: primaryWallet.address, chain: primaryWallet.chain, connector: primaryWallet.connector?.name }
        : null,
      linkedCredentials: user?.verifiedCredentials?.map((c) => ({
        format: c.format,
        chain: c.chain,
        walletName: c.walletName,
        address: c.address,
      })),
    });
  }, [readiness, user, primaryWallet]);

  return { readiness, walletLabel };
}
