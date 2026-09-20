import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAccount } from 'wagmi';
import styles from '../styles/Home.module.css';
import ccStyles from '../styles/CreateContract.module.css';
import { useXaoMsgSession } from '../hooks/useXaoMsgSession';
import { syncAllKnownThreads } from '../lib/xaomsg/sync';
import { useProfileCache } from '../contexts/ProfileCacheContext';
import { RETURN_TO_KEY } from '../components/AuthGate';

const SIGN_STEPS = [
  {
    title: 'Create your chat key',
    body: 'Generates a private encryption key from your wallet, so only you and the people you message can read your chats.',
  },
  {
    title: 'Verify your identity',
    body: 'Proves to other users that this chat key really belongs to your wallet address.',
  },
];

const UnlockChat: NextPage = () => {
  const router = useRouter();
  const { user: dynamicUser } = useDynamicContext();
  const { address } = useAccount();
  const { session, isUnlocking, error, unlock, isWalletReady, signStep } = useXaoMsgSession();
  const { currentUserProfile, isLoadingCurrentUser } = useProfileCache();
  const attemptedRef = useRef(false);
  const syncStartedRef = useRef(false);
  // Gates the first unlock() attempt on the user having read the explainer
  // screen below — unlock() itself only fires once this flips true. A retry
  // after an error skips straight back to unlock() since the user has
  // already seen the explanation once.
  const [explainerAcknowledged, setExplainerAcknowledged] = useState(false);

  // No wallet connected (direct nav, stale bookmark) — nothing to unlock.
  useEffect(() => {
    if (!dynamicUser) router.replace('/');
  }, [dynamicUser, router]);

  // Auto-fire the unlock signature exactly once, for any wallet type, as
  // soon as we know there's no already-valid session to reuse and the user
  // has acknowledged the explainer screen. Gated on isWalletReady (not just
  // `address`): wagmi's wallet client hydrates a render or two after
  // `address` appears, and calling unlock() before it's ready silently
  // no-ops — without this gate, attemptedRef would already be true by the
  // time the client became ready, permanently stalling the page with no
  // error and no retry.
  useEffect(() => {
    if (!address || !isWalletReady || session || !explainerAcknowledged) return;
    if (attemptedRef.current || isUnlocking) return;
    attemptedRef.current = true;
    void unlock();
  }, [address, isWalletReady, session, isUnlocking, unlock, explainerAcknowledged]);

  // Once a session is ready — whether it was already valid on mount or was
  // just freshly signed above — kick off the background sync once and move
  // on immediately. Sync results land in the Negotiation tab whenever they
  // arrive; nothing here waits on it. Also gated on isLoadingCurrentUser so a
  // brand-new wallet (no cached profile yet) lands on /create-profile instead
  // of /dashboard, rather than racing the profile cache's own load effect.
  useEffect(() => {
    if (!address || !session || syncStartedRef.current || isLoadingCurrentUser) return;
    syncStartedRef.current = true;
    void syncAllKnownThreads(address, session).catch((err) => {
      console.warn('[xaomsg] background sync failed:', err);
    });
    // If the user was sent here by the login gate (e.g. scanned a profile QR
    // while logged out), return them to the page they were headed for — the
    // chat — instead of the default landing. Only accept an internal path, and
    // never loop back to login/unlock.
    let returnTo: string | null = null;
    try {
      returnTo = sessionStorage.getItem(RETURN_TO_KEY);
      if (returnTo) sessionStorage.removeItem(RETURN_TO_KEY);
    } catch { /* private mode */ }
    const safeReturn =
      returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') &&
      returnTo !== '/' && !returnTo.startsWith('/unlock-chat')
        ? returnTo
        : null;
    if (safeReturn) {
      router.replace(safeReturn);
    } else {
      router.replace(currentUserProfile ? '/dashboard' : '/create-profile');
    }
  }, [address, session, router, isLoadingCurrentUser, currentUserProfile]);

  const handleRetry = () => {
    attemptedRef.current = true;
    void unlock();
  };

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>XAO Cult</title>
        <meta content="Unlocking XaoMsg chat" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <main className={styles.main}>
        {error ? (
          <div className={styles.unlockErrorBox}>
            <div>Couldn&apos;t unlock chat: {error}</div>
            <button className={ccStyles.confirmButton} onClick={handleRetry} disabled={isUnlocking}>
              {isUnlocking ? 'Signing…' : 'Try again'}
            </button>
          </div>
        ) : !session && !explainerAcknowledged ? (
          <div className={styles.signExplainerBox}>
            <h1 className={styles.signExplainerTitle}>Set up secure chat</h1>
            <p className={styles.signExplainerIntro}>
              Your wallet will ask you to sign two messages. These are free signature
              requests, not blockchain transactions — no gas, no funds moved.
            </p>
            <div className={styles.signStepList}>
              {SIGN_STEPS.map((step, i) => (
                <div className={styles.signStepItem} key={step.title}>
                  <span className={styles.signStepNumber}>{i + 1}</span>
                  <div className={styles.signStepText}>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              className={ccStyles.confirmButton}
              onClick={() => setExplainerAcknowledged(true)}
            >
              Continue
            </button>
          </div>
        ) : (
          <div className={styles.navOverlay}>
            <div className={styles.signProgressOverlay}>
              <div className={styles.navSpinner} />
              {isUnlocking && signStep > 0 && (
                <p className={styles.signProgressText}>
                  Check your wallet — signature {signStep} of 2: {SIGN_STEPS[signStep - 1].title}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UnlockChat;
