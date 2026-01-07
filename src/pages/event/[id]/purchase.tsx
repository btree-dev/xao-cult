// pages/event/[id]/purchase.tsx
import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import Scrollbar from '../../../components/Scrollbar';
const TicketPurchase: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const router = useRouter();
  const { id } = router.query;


 const defaultTicketTypes = [
    { id: 'general', name: 'General Admission', price: 50, selected: false, count: 0 },
    { id: 'premium', name: 'Premium', price: 80, selected: false, count: 0 },
    { id: 'vip', name: 'VIP', price: 120, selected: false, count: 0 }
  ];

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
    setTicketTypes(defaultTicketTypes);
  }, [id]);
  useEffect(() => {
    if (!id || ticketTypes.length === 0) return;
    sessionStorage.setItem(
      `purchaseState-${id}`,
      JSON.stringify({ ticketTypes, paymentMethod })
    );
  }, [ticketTypes, paymentMethod, id]);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
         let mockEvent;

        if (id === 'rivo-event-1') {
          mockEvent = {
            id,
            title: 'Rivo Open Air',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            image:
              'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop',
            ticketPrice: 50.0,
            artist: 'rivo',
            tag: 'Les Déferlantes 2025',
            profilePic: '/rivo-profile-pic.svg',
          };
        } else if (id === 'xao-event-1') {
          mockEvent = {
            id,
            title: 'XAO Festival',
            date: '15th December',
            time: '08:00PM',
            location: 'O2 Arena, London',
            image:
              'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 65.0,
            artist: 'xao',
            tag: 'Les Déferlantes 2025',
            profilePic: '/xao-profile.svg',
          };
        } else if (id === 'edm-event-1') {
          mockEvent = {
            id,
            title: 'Electric Dreams',
            date: '20th January',
            time: '09:00PM',
            location: 'Alexandra Palace, London',
            image:
              'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 45.0,
            artist: 'neonblk',
            tag: 'Les Déferlantes 2025',
            profilePic: '/rivo-profile-pic.svg',
          };
        } else {
          mockEvent = {
            id,
            title: 'Rivo Open Air',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            image:
              'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 50.0,
            artist: 'rivo',
            tag: 'Les Déferlantes 2025',
            profilePic: '/rivo-profile-pic.svg',
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
                src={event.profilePic || '/xao-profile.svg'}
                alt={event.artist || 'Artist'}
                width={32}
                height={32}
              />
            </div>
            <div className={styles.authorName}>@{event.artist || 'artist'}</div>
            <div className={styles.headerTag}>{event.tag || 'Event'}</div>
          </div>
        </div>
        <div className={styles.feedContent}>
          <Image
            src={event.image}
            alt={`${event.title} Content`}
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
