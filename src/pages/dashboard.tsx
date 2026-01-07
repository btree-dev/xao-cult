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
import ShareModal from '../components/ShareModal';
import { EventDocs } from '../backend/eventsdata';
//import { loadEvents, EventDoc } from '../backend/services/Event';

const Dashboard: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>(EventDocs);
  const [mutedEvents, setMutedEvents] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const router = useRouter();

  // Format count to display as K or M
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  // Toggle mute for an event
  const toggleMute = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Handle share button click
  const handleShare = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSelectedEvent(null);
  };

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/');
          return;
        }
        
        setUser(user);
        
        let profileData = null;
        
        try {
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
        avatar: profile?.profile_picture_url || '/profileIcon.svg'  
      }} />
      <Scrollbar />

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
                key={event.id || index} 
                className={styles.feedItem}
                onClick={() => handleEventClick(event.id)}
              >
                <div className={styles.feedHeader}>
                  <div className={styles.feedAuthor}>
                    <div className={styles.authorAvatar}>
                      <Image 
                        src={event.profilePic} 
                        alt={event.artist} 
                        width={32} 
                        height={32} 
                      />
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
                  <div className={styles.feedContentOverlayTop}>
                    <h2 className={styles.feedEventTitle}>{event.title}</h2>
                    <div className={styles.feedEventLocation}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
                      </svg>
                      <span>{event.location}</span>
                    </div>
                    <div className={styles.feedEventDate}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" fill="white"/>
                      </svg>
                      <span>{event.date}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.feedActionsBottom}>
                  <div className={styles.actionButton} onClick={(e) => handleShare(event, e)}>
                    <Image src="/Paper_Plane.svg" alt="Share" width={24} height={24} />
                    <span className={styles.actionCounter}>{formatCount(event.Shares)}</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                    <Image src="/Heart_01.svg" alt="Like" width={24} height={24} />
                    <span className={styles.actionCounter}>{formatCount(event.likes)}</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => toggleMute(event.id, e)}>
                    {mutedEvents.has(event.id) ? (
                      <Image src="/Volume_Off_02.png" alt="Muted" width={24} height={24} />
                    ) : (
                      <Image src="/Volume.svg" alt="Volume" width={22} height={17} />
                    )}
                  </div>
                </div>
              </div>
              ))}
        </div>

        <ShareModal
          isOpen={shareModalOpen}
          onClose={closeShareModal}
          eventTitle={selectedEvent?.title || ''}
          eventUrl={`/event/${selectedEvent?.id || ''}`}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;