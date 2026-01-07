import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import Navbar from '../../components/Navbar';
import Scrollbar from '../../components/Scrollbar';
import ShareModal from '../../components/ShareModal';
import { eventAPI, venueAPI } from '../../backend/services/Event';
import { IEvent, IVenue } from '../../backend/services/types/api';

const EventDetails: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
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
    sessionStorage.removeItem(`purchaseState-${id}`);
  };

  const formatCount = (count: string): string => {
    return count;
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
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
      <Scrollbar />

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
          <div className={styles.feedContentOverlayTop}>
            <h1 className={styles.feedEventTitle}>{event.title}</h1>
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
          <div className={styles.actionButton} onClick={handleShare}>
            <Image src="/Paper_Plane.svg" alt="Share" width={24} height={24} />
            <span className={styles.actionCounter}>{formatCount(event.views)}</span>
          </div>
          <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
            <Image src="/Heart_01.svg" alt="Like" width={24} height={24} />
            <span className={styles.actionCounter}>{formatCount(event.likes)}</span>
          </div>
          <div className={styles.actionButton} onClick={toggleMute}>
            {isMuted ? (
              <Image src="/Volume_Off_02.png" alt="Muted" width={24} height={24} />
            ) : (
              <Image src="/Volume.svg" alt="Volume" width={22} height={17} />
            )}
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
                  <Image src={artist.image} alt={artist.name} width={48} height={48} />
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
              <Image src={event.organizer.image} alt={event.organizer.name} width={48} height={48} />
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

      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        eventTitle={event?.title || ''}
        eventUrl={`/event/${id || ''}`}
      />
    </div>
  );
};

export default EventDetails;