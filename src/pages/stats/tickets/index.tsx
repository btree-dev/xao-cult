import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { supabase } from '../../../lib/supabase';
import StatsNav from '../../../components/StatsNav';
import Layout from '../../../components/Layout';
import ShareModal from '../../../components/ShareModal';
import { TicketsQR } from '../../../backend/ticket-services/ticketdata';
const TicketsPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mutedTickets, setMutedTickets] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const router = useRouter();

  // Determine tab from pathname
  const activeTab =
  (router.query.tab === 'redeemed' && 'redeemed') ||
  (router.query.tab === 'unredeemed' && 'unredeemed') ||
  (router.pathname.includes('redeemed-tickets') && 'redeemed') ||
  'unredeemed';

  // Mock ticket data
  const [tickets, setTickets] = useState<any[]>(TicketsQR);

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

  const toggleMute = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const handleShare = (ticket: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicket(ticket);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSelectedTicket(null);
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
      <div className={styles.background} />

      <StatsNav />
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
                  <div className={ticket.redeemed ? styles.redeemedImageWrapper : styles.unredeemedImageWrapper}>
                    <Image
                      src={ticket.image}
                      alt={`${ticket.title} Content`}
                      width={430}
                      height={500}
                      className={ticket.redeemed ? styles.redeemedTicketImage : styles.unredeemedTicketImage}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.feedContentOverlay}>
                    <h3 className={styles.feedEventTitle}>{ticket.title}</h3>
                    <span className={styles.ticketLocation}>
                      <img src="/Map_Pin.svg" alt="Location" className={styles.locationIcon} />
                      {ticket.location}
                    </span>
                    <span className={styles.ticketDate}>
                      <img src="/Calendar_Days.svg" alt="Date" className={styles.dateIcon} />
                      {ticket.date}
                    </span>
                  </div>
                </div>
                <div className={styles.feedActionsBottom}>
                  <div className={styles.actionButton} onClick={(e) => handleShare(ticket, e)}>
                    <Image src="/Paper_Plane.svg" alt="Share" width={24} height={24} />
                    <span className={styles.actionCounter}>{ticket.views}</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => e.stopPropagation()}>
                    <Image src="/Heart_01.svg" alt="Like" width={24} height={24} />
                    <span className={styles.actionCounter}>{ticket.likes}</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => toggleMute(ticket.id, e)}>
                    {mutedTickets.has(ticket.id) ? (
                      <Image src="/Volume_Off_02.png" alt="Muted" width={24} height={24} />
                    ) : (
                      <Image src="/Volume.svg" alt="Volume" width={22} height={17} />
                    )}
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

      <ShareModal
        isOpen={shareModalOpen}
        onClose={closeShareModal}
        eventTitle={selectedTicket?.title || ''}
        eventUrl={`/stats/tickets/${selectedTicket?.id || ''}`}
      />
    </div>
  </Layout>
  );
};

export default TicketsPage;
