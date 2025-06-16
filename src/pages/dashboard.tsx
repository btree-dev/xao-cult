import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabase';

const Dashboard: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [events, setEvents] = useState<any[]>([
    {
      id: 'rivo-event-1',
      title: 'Rivo Open Air',
      artist: 'Rivo',
      tag: 'Los Delincuentes 2025',
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      profilePic: '/rivo-profile-pic.svg'
    },
    {
      id: 'xao-event-1',
      title: 'XAO Festival',
      artist: 'XAO',
      tag: 'Los Delincuentes 2025',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      profilePic: '/xao-profile.svg'
    },
    {
      id: 'edm-event-1',
      title: 'Electric Dreams',
      artist: 'NEON.BLK',
      tag: 'Summer Festival 2025',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      profilePic: '/rivo-profile-pic.svg'
    }
  ]);
  
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/');
          return;
        }
        
        setUser(user);
        
        // Try to get profile
        let profileData = null;
        
        try {
          // Get the user's profile
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!error) {
            profileData = data;
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
        
        // If we don't have a profile, redirect to create profile
        if (!profileData) {
          router.push('/create-profile');
          return;
        } else {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error in dashboard:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [router]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  if (loading) {
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
    <div className={styles.dashboardContainer}>
      <div className={styles.background} />
      <Head>
        <title>Dashboard - XAO Cult</title>
        <meta content="Dashboard - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      {showLogoutConfirm && (
        <div className={styles.logoutConfirmOverlay}>
          <div className={styles.logoutConfirmBox}>
            <h3>Sign Out</h3>
            <p>Are you sure you want to sign out?</p>
            <div className={styles.logoutButtons}>
              <button onClick={handleLogoutCancel} className={styles.cancelButton}>Cancel</button>
              <button onClick={handleSignOut} className={styles.confirmButton}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.walletCardContainer}>
        <div className={styles.walletCard}>
          <div className={styles.walletCardHeader}>
            <span className={styles.walletUsername}>@{profile?.username || 'yevhenii_d'}</span>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <Image src="/usdc-logo.svg" alt="USDC" width={36} height={36} />
              </div>
              <span className={styles.walletCurrencyName}>USDC</span>
            </div>
            <div className={styles.walletCurrencyRight}>
              <span className={styles.walletCurrencyValue}>13,246.22</span>
              <span className={styles.walletCurrencyUsd}>(13,246.22 usd)</span>
            </div>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <Image src="/xao-logo.svg" alt="XAO" width={36} height={36} />
              </div>
              <span className={styles.walletCurrencyName}>XAO</span>
            </div>
            <div className={styles.walletCurrencyRight}>
              <span className={styles.walletCurrencyValue}>1,280.99</span>
              <span className={styles.walletCurrencyUsd}>(500,000 usd)</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.feedContainer}>
        {events.map((event, index) => (
          <div 
            key={index} 
            className={styles.feedItem}
            onClick={() => handleEventClick(event.id)}
          >
            <div className={styles.feedHeader}>
              <div className={styles.feedAuthor}>
                <div className={styles.authorAvatar}>
                  <Image src={event.profilePic} alt={event.artist} width={40} height={40} />
                </div>
                <div className={styles.authorName}>@{event.artist}</div>
                <div className={styles.headerTag}>{event.tag}</div>
              </div>
            </div>
            <div className={styles.feedContent}>
              <Image 
                src={event.image} 
                alt={`${event.artist} Content`} 
                width={500} 
                height={300} 
                className={styles.feedImage}
              />
              <div className={styles.feedContentOverlay}>
                <h2 className={styles.feedEventTitle}>{event.title}</h2>
              </div>
            </div>
            <div className={styles.feedActions}>
              <button className={`${styles.actionButton} ${styles.actionLike}`} onClick={(e) => e.stopPropagation()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2"/>
                </svg>
              </button>
              <button className={`${styles.actionButton} ${styles.actionComment}`} onClick={(e) => e.stopPropagation()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="white" strokeWidth="2"/>
                </svg>
              </button>
              <button className={`${styles.actionButton} ${styles.actionShare}`} onClick={(e) => e.stopPropagation()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" stroke="white" strokeWidth="2"/>
                  <polyline points="16 6 12 2 8 6" stroke="white" strokeWidth="2"/>
                  <line x1="12" y1="2" x2="12" y2="15" stroke="white" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard; 