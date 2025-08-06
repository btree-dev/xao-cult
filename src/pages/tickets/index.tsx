import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';

const TicketsPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unredeemed');
  const router = useRouter();

  // Mock ticket data
  const [tickets, setTickets] = useState<any[]>([
    {
      id: 'ticket-1',
      eventId: 'rivo-event-1',
      title: 'Rivo',
      artist: 'rivo',
      tag: 'Les Déferlantes 2025',
      date: '05 June 2025',
      location: 'Berlin, Germany',
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      profilePic: '/rivo-profile-pic.svg',
      likes: '12.4M',
      views: '1347',
      redeemed: false,
    },
    {
      id: 'ticket-2',
      eventId: 'xao-event-1',
      title: 'XAO',
      artist: 'xao',
      tag: 'Les Déferlantes 2025',
      date: '15 July 2025',
      location: 'London, UK',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      profilePic: '/xao-profile.svg',
      likes: '8.2M',
      views: '982',
      redeemed: false,
    },
    {
      id: 'ticket-3',
      eventId: 'edm-event-1',
      title: 'NEON.BLK',
      artist: 'neonblk',
      tag: 'Les Déferlantes 2025',
      date: '20 August 2025',
      location: 'Paris, France',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      profilePic: '/rivo-profile-pic.svg',
      likes: '5.7M',
      views: '743',
      redeemed: true,
    },
    {
      id: 'ticket-4',
      eventId: 'rivo-event-2',
      title: 'Rivo',
      artist: 'rivo',
      tag: 'Les Déferlantes 2025',
      date: '05 September 2025',
      location: 'Madrid, Spain',
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      profilePic: '/rivo-profile-pic.svg',
      likes: '9.8M',
      views: '1125',
      redeemed: true,
    },
  ]);

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
        
        // In a real app, fetch tickets from the database
        // For now we're using mock data
      } catch (error) {
        console.error('Error in tickets page:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [router]);

  const handleTicketClick = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
    // router.push('/swap-token/swap-token');
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

  const filteredTickets = tickets.filter(ticket => 
    activeTab === 'unredeemed' ? !ticket.redeemed : ticket.redeemed
  );

  return (
    <div className={styles.ticketsContainer}>
      <div className={styles.background} />
      <Head>
        <title>My Tickets - XAO Cult</title>
        <meta content="My Tickets - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle="My Tickets" />

      <div className={styles.ticketsTabContainer}>
        <div className={styles.ticketsTabs}>
          <button 
            className={`${styles.ticketsTab} ${activeTab === 'unredeemed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('unredeemed')}
          >
            Unredeemed Tickets
          </button>
          <button 
            className={`${styles.ticketsTab} ${activeTab === 'redeemed' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('redeemed')}
          >
            Redeemed Tickets
          </button>
        </div>
      </div>

      <div className={styles.ticketsGrid}>
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket, index) => (
            <div 
              key={index} 
              className={styles.feedItem}
              onClick={() => handleTicketClick(ticket.id)}
            >
              <div className={styles.feedHeader}>
                <div className={styles.feedAuthor}>
                  <div className={styles.authorAvatar}>
                    <Image src={ticket.profilePic} alt={ticket.artist} width={32} height={32} />
                  </div>
                  <div className={styles.authorName}>@{ticket.artist}</div>
                  <div className={styles.headerTag}>{ticket.tag}</div>
                </div>
              </div>
              <div className={styles.feedContent}>
                <Image 
                  src={ticket.image} 
                  alt={`${ticket.title} Content`} 
                  width={430} 
                  height={764} 
                  className={styles.feedImage}
                />
                <div className={styles.feedContentOverlay}>
                  <h3 className={styles.feedEventTitle}>{ticket.title}</h3>
                  <p className={styles.ticketDate}>{ticket.date}</p>
                  <p className={styles.ticketLocation}>{ticket.location}</p>
                </div>
              </div>
              <div className={styles.feedActions}>
                <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                  <span>{ticket.views}</span>
                </div>
                <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span>{ticket.likes}</span>
                </div>
                <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyTickets}>
            <p>No {activeTab} tickets found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage; 