import React from 'react';
import styles from '../styles/FloatingNav.module.css';
import { useRouter } from 'next/router';

const FloatingNav = () => {
  const router = useRouter();

  return (
    <div className={styles.floatingNav}>
      <button onClick={() => router.push('/home')} title="Home">
        <img src="/FloatingNav/home.svg" alt="Home" />
      </button>
      <button onClick={() => router.push('../swap-token/swap-token')} title="Swap">
        <img src="/FloatingNav/swap.svg" alt="Swap" />
      </button>
      <button onClick={() => router.push('/chat')} title="Chat">
        <img src="/FloatingNav/chat.svg" alt="Chat" />
      </button>
      <button onClick={() => router.push('/stats')} title="Stats">
        <img src="/FloatingNav/stats.svg" alt="Stats" />
      </button>
    </div>
  );
};

export default FloatingNav;
