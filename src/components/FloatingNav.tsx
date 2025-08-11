import React from 'react';
import styles from '../styles/FloatingNav.module.css';
import { useRouter } from 'next/router';

const FloatingNav = () => {
  const router = useRouter();

  return (
    <div className={styles.floatingNav}>
      <button onClick={() => router.push('../dashboard')} title="Home">
        <img src="/floating-nav/home.svg" alt="Home" />
      </button>
      <button onClick={() => router.push('../dashboard')} title="Swap">
        <img src="/floating-nav/swap.svg" alt="Swap" />
      </button>
      <button onClick={() => router.push('../assets/transaction-history')} title="Chat">
        <img src="/floating-nav/chat.svg" alt="Chat" />
      </button>
      <button onClick={() => router.push('../assets/swap-token')} title="Stats">
        <img src="/floating-nav/stats.svg" alt="Stats" />
      </button>
    </div>
  );
};

export default FloatingNav;
