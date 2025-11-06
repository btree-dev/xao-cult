import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import Navbar from '../../components/Navbar';
import Scrollbar from '../../components/Scrollbar';
import { eventAPI, venueAPI } from '../../backend/services/Event';
import { IEvent, IVenue } from '../../backend/services/types/api';

const EventDetails: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<IEvent | null>(null);
  const [venue, setVenue] = useState<IVenue | null>(null);
  const [lineup, setLineup] = useState<IEvent[]>([]);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id || typeof id !== 'string') return;
      
      setLoading(true);
      try {
        console.log('🔍 Fetching event with ID:', id);
        
        // Fetch the main event
        const eventData = await eventAPI.getEventById(id);
        console.log('✅ Event data received:', eventData);
        setEvent(eventData);

        // Fetch venue data
        if (eventData.venueId) {
          try {
            console.log('🏢 Fetching venue with ID:', eventData.venueId);
            const venueData = await venueAPI.getVenueById(eventData.venueId);
            console.log('✅ Venue data received:', venueData);
            setVenue(venueData);
          } catch (venueError: any) {
            console.error('⚠️ Error fetching venue:', venueError);
            setVenue(null);
          }
        }

        // Fetch ALL events for lineup
        try {
          console.log('📅 Fetching all events for lineup...');

          const allEvents = await eventAPI.getAllEvents({ limit: 50, skip: 0 });

          console.log('✅ All events received:', allEvents.length);
          console.log('📋 All events:', allEvents.map(e => ({
            id: e._id,
            title: e.title,
            organizer: e.organizerName,
            date: e.date
          })));

          // Filter out the current event and limit to 4 events for lineup
          const filteredLineup = allEvents
            .filter(e => {
              const isSameEvent = e._id === id;
              console.log(`🔍 Event: ${e.title} (${e._id}) - Same as current? ${isSameEvent}`);
              return !isSameEvent;
            })
            .slice(0, 4);
          
          console.log('✅ Filtered lineup count:', filteredLineup.length);
          console.log('📋 Filtered lineup:', filteredLineup.map(e => ({
            id: e._id,
            title: e.title,
            organizer: e.organizerName
          })));
          
          setLineup(filteredLineup);
        } catch (lineupError: any) {
          console.error('❌ Error fetching lineup:', lineupError);
          console.error('❌ Error message:', lineupError.message);
          console.error('❌ Error response:', lineupError.response?.data);
          setLineup([]);
        }
      } catch (error: any) {
        console.error('❌ Error fetching event:', error);
        console.error('❌ Error message:', error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventData();
  }, [id]);

  const handleBuyTicket = () => {
    router.push(`/event/${id}/purchase`);
    sessionStorage.removeItem(`purchaseState-${id}`);
  };

  // Format date helper
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
    return `${day}${suffix} ${month}`;
  };

  // Format time helper
  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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
              <Image 
                src={event.eventPicUrl || '/default-profile.png'} 
                alt={event.organizerName} 
                width={32} 
                height={32} 
              />
            </div>
            <div className={styles.authorName}>@{event.organizerName}</div>
            {event.tags && event.tags.length > 0 && (
              <div className={styles.headerTag}>{event.tags[0]}</div>
            )}
          </div>
        </div>
        <div className={styles.feedContent}>
          <Image 
            src={event.eventPicUrl || '/default-event.png'} 
            alt={event.title} 
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
            <span className={styles.actionCounter}>{event.views || 0}</span>
          </div>
          <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="white" strokeWidth="2"/>
            </svg>
            <span className={styles.actionCounter}>{event.likes || 0}</span>
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
            <span>{formatDate(event.date)}</span>
          </div>
          <div className={styles.eventDetail}>
            <div className={styles.eventDetailIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span>{formatTime(event.startTime)}</span>
          </div>
          <div className={styles.eventDetail}>
            <div className={styles.eventDetailIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <span>{venue ? venue.name : 'Loading venue...'}</span>
          </div>
        </div>

        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>LINEUP</h2>
          <div className={styles.lineupGrid}>
            {lineup.length > 0 ? (
              lineup.map((lineupEvent, index) => (
                <div key={lineupEvent._id || index} className={styles.lineupItem}>
                  <div className={styles.lineupAvatar}>
                    <Image 
                      src={lineupEvent.eventPicUrl || '/default-profile.png'} 
                      alt={lineupEvent.organizerName} 
                      width={40} 
                      height={40} 
                    />
                  </div>
                  <span className={styles.lineupName}>{lineupEvent.organizerName}</span>
                </div>
              ))
            ) : (
              <p>No other events available</p>
            )}
          </div>
        </div>

        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>DETAILS</h2>
          <p className={styles.eventDescription}>
            {event.description || 'No description available'}
          </p>
          <button className={styles.readMoreButton}>Read more</button>
        </div>

        <div className={styles.eventSection}>
          <h2 className={styles.sectionTitle}>ORGANIZER</h2>
          <div className={styles.organizerInfo}>
            <div className={styles.organizerAvatar}>
              <Image 
                src={event.eventPicUrl || '/default-profile.png'} 
                alt={event.organizerName} 
                width={40} 
                height={40} 
              />
            </div>
            <span className={styles.organizerName}>{event.organizerName}</span>
          </div>
        </div>
      </div>

      <div className={styles.buyTicketContainer}>
        <button className={styles.buyTicketButton} onClick={handleBuyTicket}>
          Buy Ticket {event.ticketPrice ? `- $${event.ticketPrice}` : ''}
        </button>
      </div>
    </div>
  );
};

export default EventDetails;