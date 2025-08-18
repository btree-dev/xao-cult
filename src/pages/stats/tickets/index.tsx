import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { supabase } from '../../../lib/supabase';
import StatsNav from '../../../components/StatsNav';
import Layout from '../../../components/Layout';

const TicketsPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Determine tab from pathname
  const activeTab =
  (router.query.tab === 'redeemed' && 'redeemed') ||
  (router.query.tab === 'unredeemed' && 'unredeemed') ||
  (router.pathname.includes('redeemed-tickets') && 'redeemed') ||
  'unredeemed';

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
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop',
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
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop',
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
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop',
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
      image: 'https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop',
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }
        setUser(user);
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
    router.push(`/stats/tickets/${ticketId}`);
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
    <Layout>
    <div className={styles.ticketsPage}>
      <Head>
        <title>My Tickets - XAO Cult</title>
        <meta content="My Tickets - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      {/* Background must be present */}
      <div className={styles.background} />

      {/* Fixed StatsNav */}
      <StatsNav />

      {/* Title for each tab */}
      <h2 className={styles.ticketsTitle}>
        {activeTab === 'unredeemed' ? 'Unredeemed Tickets' : 'Redeemed Tickets'}
      </h2>

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
                    <span>{ticket.views} views</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                    <span>{ticket.likes} likes</span>
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
  </Layout>
  );
};

export default TicketsPage;
