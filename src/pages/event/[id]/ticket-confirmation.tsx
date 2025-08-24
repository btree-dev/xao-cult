import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../../../styles/Home.module.css';
import Navbar from '../../../components/Navbar';

const TicketConfirmation: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
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
            title: 'Rivo Open Air',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop',
            ticketPrice: 50.0,
          };
        } else if (id === 'xao-event-1') {
          mockEvent = {
            id,
            title: 'XAO Festival',
            date: '15th December',
            time: '08:00PM',
            location: 'O2 Arena, London',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 65.0,
          };
        } else if (id === 'edm-event-1') {
          mockEvent = {
            id,
            title: 'Electric Dreams',
            date: '20th January',
            time: '09:00PM',
            location: 'Alexandra Palace, London',
            image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 45.0,
          };
        } else {
          mockEvent = {
            id,
            title: 'Rivo Open Air',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 50.0,
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

  const handleSeeInAsset = () => {
    router.push('/stats/tickets?tab=unredeemed');
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
    <div className={styles.confirmationContainer}>
      <div className={styles.background} />
      <Head>
        <title>Purchase Confirmation - XAO Cult</title>
        <meta content="Purchase Confirmation - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle="Purchase Confirmation" />

      <div
        className={styles.confirmOverlayContainer}
        style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('${event.image}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            zIndex: 2,
          }}
        >
          <h1 className={styles.feedEventTitle} style={{ marginBottom: '10px' }}>
            Ticket Confirmed
          </h1>

          <p style={{ color: '#fff', marginBottom: '20px', textAlign: 'center' }}>
            You have successfully purchased your ticket!
          </p>

          <div
            className={styles.confirmationContent}
            style={{
              background: 'transparent',
              width: '100%',
              maxWidth: '400px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <div className={styles.confirmationEventInfo}>
              <div className={styles.ticketTypeInfo}>
                <span className={styles.ticketTypeName}>General Admission</span>
              </div>
            </div>

            <div className={styles.confirmationSummary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Event Date:</span>
                <span className={styles.summaryValue}>{event.date}</span>
              </div>
            </div>
          </div>

          <div
            className={styles.confirmButtonContainer}
            style={{ position: 'relative', bottom: 'auto' }}
          >
            <button className={styles.confirmButton} onClick={handleSeeInAsset}>
              See in Assets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketConfirmation;
