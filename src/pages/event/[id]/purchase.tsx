import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';

const TicketPurchase: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [ticketType, setTicketType] = useState('General Admission');
  const [ticketCount, setTicketCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
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
            title: 'Rivo Open Air',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            ticketPrice: 50.00
          };
        } else if (id === 'xao-event-1') {
          mockEvent = {
            id,
            title: 'XAO Festival',
            date: '15th December',
            time: '08:00PM',
            location: 'O2 Arena, London',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 65.00
          };
        } else if (id === 'edm-event-1') {
          mockEvent = {
            id,
            title: 'Electric Dreams',
            date: '20th January',
            time: '09:00PM',
            location: 'Alexandra Palace, London',
            image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
            ticketPrice: 45.00
          };
        } else {
          // Default event if ID doesn't match
          mockEvent = {
            id,
            title: 'Rivo Open Air',
            date: '5th December',
            time: '06:30PM',
            location: 'Wembley Stadium, London',
            image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
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

  const handleConfirmPurchase = () => {
    router.push(`/event/${id}/confirm`);
  };

  const addTicket = () => {
    setTicketCount(prev => prev + 1);
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

  const totalPrice = event.ticketPrice * ticketCount;

  return (
    <div className={styles.ticketPurchaseContainer}>
      <div className={styles.background} />
      <Head>
        <title>Ticket Purchase - XAO Cult</title>
        <meta content="Ticket Purchase - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle="Ticket Purchase" />

      <div 
        className={styles.eventImageContainer}
        style={{ 
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('${event.image}')` 
        }}
      >
        <div className={styles.eventImageOverlay}>
          <h1 className={styles.eventTitle}>{event.title}</h1>
        </div>
      </div>

      <div className={styles.ticketPurchaseContent}>
        <div className={styles.ticketTypeSection}>
          <h2 className={styles.sectionTitle}>Ticket Type</h2>
          <div className={styles.ticketTypeSelector}>
            <div className={styles.ticketTypeOption}>
              <div className={styles.ticketTypeRadio}>
                <div className={`${styles.radioInner} ${ticketType === 'General Admission' ? styles.radioSelected : ''}`}></div>
              </div>
              <div className={styles.ticketTypeInfo}>
                <span className={styles.ticketTypeName}>General Admission</span>
                <span className={styles.ticketTypeVersion}>v2</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.additionalTicketsSection}>
          <button className={styles.addTicketButton} onClick={addTicket}>
            Add another ticket
          </button>
        </div>

        <div className={styles.paymentMethodSection}>
          <h2 className={styles.sectionTitle}>Pay With</h2>
          <div className={styles.paymentMethodSelector}>
            <div 
              className={`${styles.paymentOption} ${paymentMethod === 'wallet' ? styles.paymentSelected : ''}`}
              onClick={() => setPaymentMethod('wallet')}
            >
              <div className={styles.paymentOptionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M16 14H16.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M2 10H22" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <span className={styles.paymentOptionName}>Wallet</span>
            </div>
          </div>
        </div>

        <div className={styles.cashSaleSection}>
          <div className={styles.cashSaleOption}>
            <div className={styles.cashSaleIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles.cashSaleText}>Cash Sale</span>
          </div>
        </div>

        <div className={styles.ticketSummarySection}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Total:</span>
            <span className={styles.summaryValue}>${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={styles.confirmPurchaseContainer}>
        <button className={styles.confirmPurchaseButton} onClick={handleConfirmPurchase}>
          Confirm Purchase
        </button>
      </div>
    </div>
  );
};

export default TicketPurchase; 