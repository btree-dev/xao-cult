import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/Navbar';

const TicketDetailPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();
  const { id } = router.query;

  // Mock tickets data
  const mockTickets = [
    {
      id: 'ticket-1',
      eventId: 'rivo-event-1',
      title: 'Rivo Open Air',
      date: '05 June 2025',
      location: 'Berlin, Germany',
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      redeemed: false,
      ticketCode: 'RIVO-2025-06-05-001',
      lineup: ['Lola Mex', 'Synthetics', 'Rivo', 'NEON.BLK'],
      details: 'XAO is proud to present an unforgettable night of music, art, and community at the Rivo Open Air concert at Wembley Stadium. Experience the electric atmosphere as top artists perform live under the stars. Immerse yourself in the vibrant energy, connect with fellow music lovers, and create memories that will last a lifetime.',
      organizer: 'Tomorrowland Events'
    },
    {
      id: 'ticket-2',
      eventId: 'xao-event-1',
      title: 'XAO Festival',
      date: '15 July 2025',
      location: 'London, UK',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      redeemed: false,
      ticketCode: 'XAO-2025-07-15-001',
      lineup: ['XAO', 'Synthetics', 'NEON.BLK'],
      details: 'Join us for the annual XAO Festival, a celebration of music, art, and culture. This year\'s lineup features some of the most exciting artists in electronic music, with stunning visuals and immersive experiences throughout the venue.',
      organizer: 'XAO Events'
    },
    {
      id: 'ticket-3',
      eventId: 'edm-event-1',
      title: 'Electric Dreams',
      date: '20 August 2025',
      location: 'Paris, France',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80',
      redeemed: true,
      ticketCode: 'EDM-2025-08-20-001',
      lineup: ['NEON.BLK', 'Lola Mex', 'Synthetics'],
      details: 'Electric Dreams brings you a night of cutting-edge electronic music in the heart of Paris. Experience stunning visuals, state-of-the-art sound systems, and performances from world-class DJs.',
      organizer: 'Electric Dreams Productions'
    },
    {
      id: 'ticket-4',
      eventId: 'rivo-event-2',
      title: 'Rivo Open Air',
      date: '05 September 2025',
      location: 'Madrid, Spain',
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      redeemed: true,
      ticketCode: 'RIVO-2025-09-05-001',
      lineup: ['Rivo', 'Synthetics', 'NEON.BLK'],
      details: 'Rivo Open Air returns to Madrid for another unforgettable night of music and community. Join us under the stars for performances from top artists and an atmosphere like no other.',
      organizer: 'Rivo Productions'
    },
  ];

  useEffect(() => {
    const getTicketData = async () => {
      if (!id) return;
      
      setLoading(true);
      
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/');
          return;
        }
        
        setUser(user);
        
        // In a real app, fetch ticket from the database
        // For now we're using mock data
        const ticketData = mockTickets.find(t => t.id === id);
        
        if (!ticketData) {
          router.push('/tickets');
          return;
        }
        
        setTicket(ticketData);
      } catch (error) {
        console.error('Error in ticket detail page:', error);
        router.push('/tickets');
      } finally {
        setLoading(false);
      }
    };
    
    getTicketData();
  }, [id, router]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  const handleBackToTickets = () => {
    router.push('/tickets');
  };

  // Generate QR code URL
  const getQRCodeUrl = (ticketCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketCode)}`;
  };

  if (loading || !ticket) {
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
    <div className={styles.ticketDetailContainer}>
      <div className={styles.background} />
      <Head>
        <title>{ticket.title} Ticket - XAO Cult</title>
        <meta content={`${ticket.title} Ticket - XAO Cult`} name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle={currentPage === 0 ? `${ticket.redeemed ? 'Redeemed' : 'Unredeemed'} Ticket` : ticket.title} />

      {currentPage === 0 ? (
        <div className={styles.ticketQrContainer}>
          <div className={styles.qrPagination}>
            <span className={styles.qrPageIndicator}>
              {mockTickets.findIndex(t => t.id === id) + 1} / {mockTickets.length}
            </span>
          </div>
          <div className={styles.qrCodeWrapper}>
            <div className={styles.qrCode}>
              <Image 
                src={getQRCodeUrl(ticket.ticketCode)} 
                alt="Ticket QR Code" 
                width={200} 
                height={200} 
              />
            </div>
            <div className={styles.qrTicketInfo}>
              <h2 className={styles.qrTicketTitle}>{ticket.title}</h2>
              <div className={styles.qrTicketDetails}>
                <div className={styles.qrTicketDetail}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span>{ticket.date}</span>
                </div>
                <div className={styles.qrTicketDetail}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="white" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span>{ticket.location}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.ticketDetailSection}>
            <h3 className={styles.sectionTitle}>DATE AND LOCATION</h3>
            <div className={styles.detailRow}>
              <div className={styles.detailIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <span className={styles.detailText}>{ticket.date}</span>
            </div>
            <div className={styles.detailRow}>
              <div className={styles.detailIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s-8-4.5-8-11.8a8 8 0 0116 0C20 17.5 12 22 12 22z" stroke="white" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <span className={styles.detailText}>{ticket.location}</span>
            </div>
          </div>

          <div className={styles.ticketDetailSection}>
            <h3 className={styles.sectionTitle}>LINEUP</h3>
            <div className={styles.lineupGrid}>
              {ticket.lineup.map((artist: string, index: number) => (
                <div key={index} className={styles.lineupItem}>
                  <div className={styles.lineupAvatar}>
                    <Image 
                      src={index % 2 === 0 ? '/rivo-profile-pic.svg' : '/xao-profile.svg'} 
                      alt={artist} 
                      width={40} 
                      height={40} 
                    />
                  </div>
                  <span className={styles.lineupName}>{artist}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.ticketDetailSection}>
            <h3 className={styles.sectionTitle}>DETAILS</h3>
            <p className={styles.detailText}>{ticket.details}</p>
            <button className={styles.readMoreButton}>Read more</button>
          </div>

          <div className={styles.ticketDetailSection}>
            <h3 className={styles.sectionTitle}>ORGANIZER</h3>
            <div className={styles.organizerInfo}>
              <div className={styles.organizerAvatar}>
                <Image 
                  src="/rivo-profile-pic.svg" 
                  alt={ticket.organizer} 
                  width={40} 
                  height={40} 
                />
              </div>
              <span className={styles.organizerName}>{ticket.organizer}</span>
            </div>
          </div>

          <div className={styles.ticketActionButtons}>
            <button className={styles.sellButton}>Sell</button>
            <button className={styles.giftButton}>Gift</button>
          </div>
        </div>
      ) : (
        <div className={styles.ticketDetailsPage}>
          {/* Additional pages content would go here */}
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage; 