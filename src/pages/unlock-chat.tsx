import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAccount } from 'wagmi';
import styles from '../styles/Home.module.css';
import ccStyles from '../styles/CreateContract.module.css';
import { useXaoMsgSession } from '../hooks/useXaoMsgSession';
import { syncAllKnownThreads } from '../lib/xaomsg/sync';

const UnlockChat: NextPage = () => {
  const router = useRouter();
  const { user: dynamicUser } = useDynamicContext();
  const { address } = useAccount();
  const { session, isUnlocking, error, unlock } = useXaoMsgSession();
  const attemptedRef = useRef(false);
  const syncStartedRef = useRef(false);

  // No wallet connected (direct nav, stale bookmark) — nothing to unlock.
  useEffect(() => {
    if (!dynamicUser) router.replace('/');
  }, [dynamicUser, router]);

  // Auto-fire the unlock signature exactly once, for any wallet type, as
  // soon as we know there's no already-valid session to reuse.
  useEffect(() => {
    if (!address || session) return;
    if (attemptedRef.current || isUnlocking) return;
    attemptedRef.current = true;
    void unlock();
  }, [address, session, isUnlocking, unlock]);

  // Once a session is ready — whether it was already valid on mount or was
  // just freshly signed above — kick off the background sync once and move
  // on immediately. Sync results land in the Negotiation tab whenever they
  // arrive; nothing here waits on it.
  useEffect(() => {
    if (!address || !session || syncStartedRef.current) return;
    syncStartedRef.current = true;
    void syncAllKnownThreads(address, session).catch((err) => {
      console.warn('[xaomsg] background sync failed:', err);
    });
    router.replace('/dashboard');
  }, [address, session, router]);

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
        ) : (
          <div className={styles.navOverlay}>
            <div className={styles.navSpinner} />
          </div>
        )}
      </main>
    </div>
  );
};

export default UnlockChat;
