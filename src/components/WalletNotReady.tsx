import React from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import styles from '../styles/Home.module.css';
import ccStyles from '../styles/CreateContract.module.css';
import type { WalletReadiness } from '../hooks/useWalletReadiness';

const MESSAGES: Partial<Record<WalletReadiness, { title: string; body: string }>> = {
  'no-wallet': {
    title: 'No wallet connected',
    body: "You're signed in, but there's no wallet linked to this account in this browser. Connect or link an Ethereum wallet to continue, or log out and sign in with a different account.",
  },
  'non-evm': {
    title: 'Unsupported wallet',
    body: 'XAO runs on Base, so it needs an Ethereum-compatible wallet. Switch your primary wallet to an Ethereum wallet, or log out and sign in with one.',
  },
  stalled: {
    title: "Your wallet isn't responding",
    body: 'Make sure your wallet is unlocked and installed in this browser, then reload. If it still hangs, log out and sign in again.',
  },
};

/**
 * Explains why a signed-in user can't get past login (see useWalletReadiness)
 * instead of leaving them on a blank screen. `compact` drops the reload/log-out
 * buttons for the login page, where Dynamic's own widget already offers them.
 */
export default function WalletNotReady({
  readiness,
  walletLabel,
  compact = false,
}: {
  readiness: WalletReadiness;
  walletLabel: string | null;
  compact?: boolean;
}) {
  const { handleLogOut } = useDynamicContext();
  const msg = MESSAGES[readiness];
  if (!msg) return null;

  return (
    <div className={styles.unlockErrorBox}>
      <h1 className={styles.signExplainerTitle}>{msg.title}</h1>
      <p className={styles.signExplainerIntro}>{msg.body}</p>
      {walletLabel && <p className={styles.signExplainerIntro}>Wallet: {walletLabel}</p>}
      {!compact && (
        <>
          <button className={ccStyles.confirmButton} onClick={() => window.location.reload()}>
            Reload
          </button>
          <button className={ccStyles.confirmButton} onClick={() => void handleLogOut()}>
            Log out
          </button>
        </>
      )}
    </div>
  );
}
