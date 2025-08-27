//src/pages/dashboard.tsx
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import Scrollbar from '../components/Scrollbar';

const Dashboard: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [events, setEvents] = useState<any[]>([
    {
      id: 'rivo-event-1',
      title: 'Rivo',
      artist: 'rivo',
      tag: 'Les Déferlantes 2025',
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      profilePic: '/rivo-profile-pic.svg',
      likes: '12.4M',
      views: '1347'
    },
    {
      id: 'xao-event-1',
      title: 'XAO',
      artist: 'xao',
      tag: 'Les Déferlantes 2025',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      profilePic: '/xao-profile.svg',
      likes: '8.2M',
      views: '982'
    },
    {
      id: 'edm-event-1',
      title: 'NEON.BLK',
      artist: 'neonblk',
      tag: 'Les Déferlantes 2025',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      profilePic: '/rivo-profile-pic.svg',
      likes: '5.7M',
      views: '743'
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
    <Layout>
    <div className={styles.dashboardContainer}>
      <div className={styles.background} />
      <Head>
        <title>Dashboard - XAO Cult</title>
        <meta content="Dashboard - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar userProfile={{ 
        username: profile?.username, 
        avatar: profile?.profile_picture_url || '/xao-profile.svg' 
      }} />
      <Scrollbar />

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
        <div 
          className={styles.walletCard} 
          style={{ 
            background: 'linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)'
          }}
        >
          <div className={styles.walletCardHeader}>
            <span className={styles.walletUsername}>@{profile?.username || 'yevhenii_d'}</span>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <Image src="/usdc-logo.svg" alt="USDC" width={24} height={24} />
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
                <Image src="/xao-logo.svg" alt="XAO" width={24} height={24} />
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
                  <Image src={event.profilePic} alt={event.artist} width={32} height={32} />
                </div>
                <div className={styles.authorName}>@{event.artist}</div>
                <div className={styles.headerTag}>{event.tag}</div>
              </div>
            </div>
            <div className={styles.feedContent}>
              <Image 
                src={event.image} 
                alt={`${event.artist} Content`} 
                width={430} 
                height={764} 
                className={styles.feedImage}
              />
              <div className={styles.feedContentOverlay}>
                <h2 className={styles.feedEventTitle}>{event.title}</h2>
              </div>
            </div>
            <div className={styles.feedActions}>
              <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
                <span className={styles.actionCounter}>{event.views}</span>
              </div>
              <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2"/>
                </svg>
                <span className={styles.actionCounter}>{event.likes}</span>
              </div>
              <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </Layout>
  );
};

export default Dashboard; 