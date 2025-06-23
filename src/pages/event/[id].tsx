import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';

const EventDetails: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // In a real app, this would fetch the event from the database
        // For now, we'll use mock data based on the event ID
        let mockEvent;
        
        if (id === 'rivo-event-1') {
          mockEvent = {
            id,
            title: 'Rivo',
            artist: 'rivo',
            tag: 'Les Déferlantes 2025',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            description: 'Join DJ Rivo for an unforgettable night of music, light and energy! This VIP ticket gives you access to the best seats in the house, plus entry to the after-party. Enjoy the electrifying atmosphere at Wembley Stadium. Enjoy stage views, expedited entry and access to a private lounge Get ready for a night of pulsating beats, lights, and breathtaking visuals.',
            image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            profilePic: '/rivo-profile-pic.svg',
            likes: '12.4M',
            views: '1347',
            lineup: [
              { name: 'Lola Max', image: '/rivo-profile-pic.svg' },
              { name: 'Synthetics', image: '/rivo-profile-pic.svg' },
              { name: 'Rivo', image: '/rivo-profile-pic.svg' },
              { name: 'NEON.BLK', image: '/rivo-profile-pic.svg' },
            ],
            organizer: {
              name: 'Tomorrowland Events',
              image: '/rivo-profile-pic.svg'
            },
            ticketPrice: 50.00
          };
        } else if (id === 'xao-event-1') {
          mockEvent = {
            id,
            title: 'XAO',
            artist: 'xao',
            tag: 'Les Déferlantes 2025',
            date: '15th December',
            time: '08:00PM',
            location: 'O2 Arena, London',
            description: 'Experience the revolutionary XAO Festival featuring cutting-edge performances and immersive audio-visual experiences. This exclusive event brings together the best electronic artists for a night of unparalleled entertainment.',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
            profilePic: '/xao-profile.svg',
            likes: '8.2M',
            views: '982',
            lineup: [
              { name: 'XAO', image: '/xao-profile.svg' },
              { name: 'Synthetics', image: '/rivo-profile-pic.svg' },
              { name: 'NEON.BLK', image: '/rivo-profile-pic.svg' },
              { name: 'Lola Max', image: '/rivo-profile-pic.svg' },
            ],
            organizer: {
              name: 'XAO Productions',
              image: '/xao-profile.svg'
            },
            ticketPrice: 65.00
          };
        } else if (id === 'edm-event-1') {
          mockEvent = {
            id,
            title: 'NEON.BLK',
            artist: 'neonblk',
            tag: 'Les Déferlantes 2025',
            date: '20th January',
            time: '09:00PM',
            location: 'Alexandra Palace, London',
            description: 'Electric Dreams is the ultimate EDM experience featuring NEON.BLK and other top electronic artists. Prepare for a night of pulsating rhythms, spectacular light shows, and an atmosphere charged with energy.',
            image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
            profilePic: '/rivo-profile-pic.svg',
            likes: '5.7M',
            views: '743',
            lineup: [
              { name: 'NEON.BLK', image: '/rivo-profile-pic.svg' },
              { name: 'Synthetics', image: '/rivo-profile-pic.svg' },
              { name: 'Lola Max', image: '/rivo-profile-pic.svg' },
              { name: 'XAO', image: '/xao-profile.svg' },
            ],
            organizer: {
              name: 'Electric Dreams Productions',
              image: '/rivo-profile-pic.svg'
            },
            ticketPrice: 45.00
          };
        } else {
          // Default event if ID doesn't match
          mockEvent = {
            id,
            title: 'Rivo',
            artist: 'rivo',
            tag: 'Les Déferlantes 2025',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            description: 'Join DJ Rivo for an unforgettable night of music, light and energy! This VIP ticket gives you access to the best seats in the house, plus entry to the after-party.',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
            profilePic: '/rivo-profile-pic.svg',
            likes: '9.8M',
            views: '1125',
            lineup: [
              { name: 'Lola Max', image: '/rivo-profile-pic.svg' },
              { name: 'Synthetics', image: '/rivo-profile-pic.svg' },
              { name: 'Rivo', image: '/rivo-profile-pic.svg' },
              { name: 'NEON.BLK', image: '/rivo-profile-pic.svg' },
            ],
            organizer: {
              name: 'Tomorrowland Events',
              image: '/rivo-profile-pic.svg'
            },
            ticketPrice: 50.00
          };
        }
        
        setEvent(mockEvent);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id]);

  const handleBuyTicket = () => {
    router.push(`/event/${id}/purchase`);
  };

  if (loading || !event) {
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
    <div className={styles.eventDetailsContainer}>
      <div className={styles.background} />
      <Head>
        <title>{event.title} - XAO Cult</title>
        <meta content={`${event.title} - XAO Cult`} name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle="Event Details" />

      <div className={styles.feedItem} style={{ marginTop: '20px' }}>
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
            <h1 className={styles.feedEventTitle}>{event.title}</h1>
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

      <div className={styles.eventContent}>
        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>DATE AND LOCATION</h2>
          <div className={styles.eventDetail}>
            <div className={styles.eventDetailIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M16 2V6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 2V6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 10H21" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <span>{event.date}</span>
          </div>
          <div className={styles.eventDetail}>
            <div className={styles.eventDetailIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span>{event.time}</span>
          </div>
          <div className={styles.eventDetail}>
            <div className={styles.eventDetailIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <span>{event.location}</span>
          </div>
        </div>

        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>LINEUP</h2>
          <div className={styles.lineupGrid}>
            {event.lineup.map((artist: any, index: number) => (
              <div key={index} className={styles.lineupItem}>
                <div className={styles.lineupAvatar}>
                  <Image src={artist.image} alt={artist.name} width={40} height={40} />
                </div>
                <span className={styles.lineupName}>{artist.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>DETAILS</h2>
          <p className={styles.eventDescription}>{event.description}</p>
          <button className={styles.readMoreButton}>Read more</button>
        </div>

        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>ORGANIZER</h2>
          <div className={styles.organizerInfo}>
            <div className={styles.organizerAvatar}>
              <Image src={event.organizer.image} alt={event.organizer.name} width={40} height={40} />
            </div>
            <span className={styles.organizerName}>{event.organizer.name}</span>
          </div>
        </div>
      </div>

      <div className={styles.buyTicketContainer}>
        <button className={styles.buyTicketButton} onClick={handleBuyTicket}>
          Buy Ticket
        </button>
      </div>
    </div>
  );
};

export default EventDetails; 