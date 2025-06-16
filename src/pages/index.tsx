import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import { formatWalletEmail } from '../lib/utils';

const Home: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check if wallet is connected and redirect to profile creation
  useEffect(() => {
    const checkSession = async () => {
      try {
        setCheckingAuth(true);
        
        // Check if there's a Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // We have a session, check if there's a profile
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.session.user.id)
            .single();
          
          if (error || !profileData) {
            // No profile yet, redirect to profile creation
            router.push('/create-profile');
          } else {
            // Profile exists, redirect to dashboard
            router.push('/dashboard');
          }
          return;
        }
        
        // If wallet is connected but no session, redirect to registration
        if (isConnected && address) {
          // First, redirect to registration page instead of create-profile
          router.push('/register');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkSession();
  }, [isConnected, address, router]);
  
  const handleWalletConnect = () => {
    // The actual connection happens in ConnectButton.Custom
    // After connection, the useEffect above will handle redirection
  };
  
  if (checkingAuth) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>XAO Cult</title>
        <meta
          content="DAO-Governed User-First dApp for NFT Smart Contracts"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div className={styles.hintText}>
          Suggested
        </div>      
        <div className={styles.itemContainer}>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              return (
                <div
                  {...(!mounted && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!mounted || !account || !chain) {
                      return (
                        <button 
                          onClick={() => {
                            openConnectModal();
                            handleWalletConnect();
                          }} 
                          type="button" 
                          className={styles.bigButton}
                        >
                          <Image
                            src="/MetaMask-icon-fox.svg"
                            alt="Wallet Icon"
                            width={20}
                            height={20}
                            className={styles.buttonIcon}
                          />
                          Sign in with Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} type="button">
                          Wrong network
                        </button>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={openChainModal}
                          style={{ display: 'flex', alignItems: 'center' }}
                          type="button"
                        >
                          {chain.hasIcon && (
                            <div
                              style={{
                                background: chain.iconBackground,
                                width: 12,
                                height: 12,
                                borderRadius: 999,
                                overflow: 'hidden',
                                marginRight: 4,
                              }}
                            >
                              {chain.iconUrl && (
                                <Image
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  width={12}
                                  height={12}
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>

                        <button onClick={openAccountModal} type="button">
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ''}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
        <button className={styles.bigButton}>
          <span role="img" aria-label="passkey" className={styles.passkeyIcon}>
            🔑
          </span>
          Sign in with Passkey
        </button>
        <div className={styles.rowContainer}>
          <div className={styles.gradientLine} />
          <Image
              alt="XAO Monster"
              src="/xao-monster.png"
              width={250}
              height={250}
              style={{ width: '25%', height: 'auto', maxWidth: '100%' }}
            /> 
          <div className={styles.gradientLine} />
        </div>    
        <div className={styles.hintText}>
          OR
        </div>
        <button 
          className={styles.bigButton}
          onClick={() => router.push('/email-signin')}
        >
          <span role="img" aria-label="email" className={styles.passkeyIcon}>
            ✉️
          </span>
          Sign in with Email
        </button>
      </main>
    </div>
  );
};

export default Home;
