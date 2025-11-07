// pages/event/[id]/purchase.tsx
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { eventAPI, venueAPI, artistAPI } from '../../../backend/services/Event';
import { IEvent, IVenue, IArtist } from '../../../backend/services/types/api';
import Navbar from '../../../components/Navbar';
import Scrollbar from '../../../components/Scrollbar';
const TicketPurchase: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<IEvent | null>(null);
  const [venue, setVenue] = useState<IVenue | null>(null);
  const [artists, setArtists] = useState<IArtist[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const router = useRouter();
  const { id } = router.query;

  // ✅ Initial ticketTypes defaults
 const defaultTicketTypes = [
    { id: 'general', name: 'General Admission', price: 50, selected: false, count: 0 },
    { id: 'premium', name: 'Premium', price: 80, selected: false, count: 0 },
    { id: 'vip', name: 'VIP', price: 120, selected: false, count: 0 }
  ];

  // ✅ Restore state (runs only once after id is ready)
  useEffect(() => {
    if (!id) return;


    const savedState = sessionStorage.getItem(`purchaseState-${id}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setTicketTypes(parsed.ticketTypes || defaultTicketTypes);
        setPaymentMethod(parsed.paymentMethod || 'wallet');
        return;
      } catch (e) {
        console.error("Error parsing saved purchase state", e);
      }
    }
    // if nothing saved → load defaults
    setTicketTypes(defaultTicketTypes);
  }, [id]);

  // ✅ Persist state whenever tickets or payment changes
  useEffect(() => {
    if (!id || ticketTypes.length === 0) return;
    sessionStorage.setItem(
      `purchaseState-${id}`,
      JSON.stringify({ ticketTypes, paymentMethod })
    );
  }, [ticketTypes, paymentMethod, id]);

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
        
        // Fetch artists data
        if (eventData.artistIds && eventData.artistIds.length > 0) {
          try {
            console.log('🎤 Fetching artists with IDs:', eventData.artistIds);
            const artistPromises = eventData.artistIds.map(artistId => 
              artistAPI.getArtistById(artistId)
            );
            const artistsData = await Promise.all(artistPromises);
            console.log('✅ Artists data received:', artistsData);
            setArtists(artistsData);
          } catch (artistError: any) {
            console.error('⚠️ Error fetching artists:', artistError);
            setArtists([]);
          }
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

  const handleConfirmPurchase = () => {
    const selectedTickets = ticketTypes.filter((t) => t.selected);
    if (selectedTickets.length === 0) return;

    const ticketsQuery = selectedTickets.map((t) => ({
      type: t.name,
      count: t.count,
      price: t.price,
    }));

    router.push({
      pathname: `/event/${id}/confirm`,
      query: {
        tickets: JSON.stringify(ticketsQuery),
      },
    });
  };

  const toggleTicketType = (ticketId: string) => {
    setTicketTypes((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, selected: !t.selected, count: !t.selected ? 1 : 0 } : t
      )
    );
  };

  const addTicket = (ticketId: string) => {
    setTicketTypes((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, count: t.count + 1 } : t))
    );
  };

  const subtractTicket = (ticketId: string) => {
    setTicketTypes((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, count: t.count > 1 ? t.count - 1 : 1 } : t
      )
    );
  };

  const totalPrice = ticketTypes.reduce((acc, t) => {
    if (t.selected) return acc + t.price * t.count;
    return acc;
  }, 0);

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

  if (loading || !event || ticketTypes.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  const primaryArtist = artists.length > 0 ? artists[0] : null;
  return (
    <div className={styles.ticketPurchaseContainer}>
      <div className={styles.background} />
      <Head>
        <title>Ticket Purchase - XAO Cult</title>
        <meta content="Ticket Purchase - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle="Ticket Purchase" />
      <Scrollbar />

      <div
        className={styles.feedItem}
        style={{ marginTop: '20px', marginBottom: '20px', pointerEvents: 'none' }}
      >
        <div className={styles.feedHeader}>
          <div className={styles.feedAuthor}>
            <div className={styles.authorAvatar}>
              <Image
                src={ '/xao-profile.svg'}
                alt={primaryArtist?.name || event.organizerName}
                width={32}
                height={32}
              />
            </div>
            <div className={styles.authorName}>@{event.organizerName || 'artist'}</div>
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
      </div>

      <div className={styles.ticketPurchaseContent}>
        <div className={styles.ticketTypeSection}>
          <h2 className={styles.sectionTitle}>Ticket Types</h2>
          <div className={styles.ticketTypeSelector}>
            {ticketTypes.map((ticket) => (
              <div key={ticket.id} className={styles.ticketTypeOption}>
                <input
                  type="checkbox"
                  checked={ticket.selected}
                  onChange={() => toggleTicketType(ticket.id)}
                  className={styles.ticketCheckbox}
                />

                <div className={styles.ticketTypeInfo}>
                  <span className={styles.ticketTypeName}>{ticket.name}</span>
                  <span className={styles.ticketTypePrice}>${ticket.price}</span>
                </div>

                {ticket.selected && (
                  <div className={styles.ticketCounterRight}>
                    <button
                      className={styles.ticketCounterButton}
                      onClick={() => subtractTicket(ticket.id)}
                    >
                      -
                    </button>
                    <span className={styles.ticketCounterValue}>{ticket.count}</span>
                    <button
                      className={styles.ticketCounterButton}
                      onClick={() => addTicket(ticket.id)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.paymentMethodSection}>
          <h2 className={styles.sectionTitle}>Pay With</h2>
          <div className={styles.paymentMethodSelector}>
            <div
              className={`${styles.paymentOption} ${
                paymentMethod === 'wallet' ? styles.paymentSelected : ''
              }`}
              onClick={() => setPaymentMethod('wallet')}
            >
              <div className={styles.paymentOptionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="white" strokeWidth="2" />
                  <path d="M16 14H16.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M2 10H22" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <span className={styles.paymentOptionName}>Wallet</span>
            </div>

            <div
              className={`${styles.paymentOption} ${
                paymentMethod === 'cash' ? styles.paymentSelected : ''
              }`}
              onClick={() => setPaymentMethod('cash')}
            >
              <div className={styles.paymentOptionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.paymentOptionName}>Cash Sale</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.buyTicketContainer}>
        <button
          className={styles.buyTicketButton}
          onClick={handleConfirmPurchase}
          disabled={totalPrice === 0}
        >
          Buy Ticket ${totalPrice.toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default TicketPurchase;
