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
import { readContract } from '@wagmi/core';
import { config } from '../../../wagmi';
import { EVENT_CONTRACT_ABI, EVENT_CONTRACT_FACTORY_ABI } from '../../../lib/web3/eventcontract';
import { CONTRACT_ADDRESSES } from '../../../lib/web3/chains';
import { useWeb3 } from '../../../hooks/useWeb3';
const TicketsPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mutedTickets, setMutedTickets] = useState<Set<string>>(new Set());
  const [likedTickets, setLikedTickets] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const router = useRouter();
  const { address, chain } = useWeb3();

  // Determine tab from pathname
  const activeTab =
  (router.query.tab === 'redeemed' && 'redeemed') ||
  (router.query.tab === 'unredeemed' && 'unredeemed') ||
  (router.pathname.includes('redeemed-tickets') && 'redeemed') ||
  'unredeemed';

  // Mock ticket data + blockchain purchased tickets
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

  // Load user's purchased tickets directly from blockchain
  useEffect(() => {
    const loadBlockchainTickets = async () => {
      if (!address || !chain?.id) { setTicketsLoading(false); return; }

      setTicketsLoading(true);
      try {
        // Get factory address for current chain
        const factoryAddress = chain.id in CONTRACT_ADDRESSES
          ? (CONTRACT_ADDRESSES[chain.id as keyof typeof CONTRACT_ADDRESSES]?.EventContractFactory as `0x${string}`)
          : undefined;

        if (!factoryAddress || factoryAddress === '0x') { setTicketsLoading(false); return; }

        // Get all contract addresses from factory
        const allContracts = await readContract(config, {
          address: factoryAddress,
          abi: EVENT_CONTRACT_FACTORY_ABI,
          functionName: 'getContracts',
        }) as `0x${string}`[];

        if (!allContracts || allContracts.length === 0) { setTicketsLoading(false); return; }

        const blockchainTickets: any[] = [];

        // For each contract, check if user has tickets
        for (const contractAddr of allContracts) {
          try {
            const userTicketIds = await readContract(config, {
              address: contractAddr,
              abi: EVENT_CONTRACT_ABI,
              functionName: 'getTickets',
              args: [address],
            }) as bigint[];

            if (!userTicketIds || userTicketIds.length === 0) continue;

            // User has tickets in this contract — fetch event details
            const [eventName, imageUri, locationData, datesData] = await Promise.all([
              readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'name' }),
              readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'imageUri' }),
              readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'location' }),
              readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'dates' }),
            ]);

            const loc = locationData as any;
            const dates = datesData as any;
            const venueName = loc?.venue ?? loc?.[0] ?? '';
            const showTimestamp = dates?.show ?? dates?.[1];
            const eventDate = showTimestamp && Number(showTimestamp) > 0
              ? new Date(Number(showTimestamp) * 1000).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
              : 'TBD';

            // Fetch info for each ticket the user owns
            for (const ticketId of userTicketIds) {
              try {
                const info = await readContract(config, {
                  address: contractAddr,
                  abi: EVENT_CONTRACT_ABI,
                  functionName: 'getTicketInfo',
                  args: [ticketId],
                }) as [bigint, string, string, boolean, bigint, bigint];

                const [, , typeName, checkedIn] = info;

                blockchainTickets.push({
                  id: `chain-${contractAddr}-${ticketId.toString()}`,
                  eventId: contractAddr,
                  title: (eventName as string) || 'Blockchain Event',
                  artist: typeName || 'Contract',
                  tag: 'Blockchain',
                  date: eventDate,
                  location: venueName,
                  image: (imageUri as string) || '',
                  profilePic: '/profileIcon.svg',
                  likes: '0',
                  views: '0',
                  redeemed: checkedIn,
                  contractAddress: contractAddr,
                  ticketId: ticketId.toString(),
                  isBlockchain: true,
                });
              } catch {
                continue;
              }
            }
          } catch {
            continue;
          }
        }

        setTickets(prev => {
          const filtered = prev.filter((t: any) => !t.isBlockchain);
          return [...blockchainTickets, ...filtered];
        });
      } catch (e) {
        console.error('Error loading blockchain tickets:', e);
      } finally {
        setTicketsLoading(false);
      }
    };

    loadBlockchainTickets();
  }, [address, chain?.id]);

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

  const toggleLike = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedTickets(prev => {
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
    activeTab === 'unredeemed' ? (!ticket.redeemed && ticket.isBlockchain) : (ticket.redeemed && ticket.isBlockchain)
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
        {ticketsLoading ? (
          <div className={styles.loadingContainer}>
            <p>Loading...</p>
          </div>
        ) : filteredTickets.length > 0 ? (
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
                      src={ticket.image || '/profileIcon.svg'}
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
                  <div className={styles.actionButton} onClick={(e) => toggleLike(ticket.id, e)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 7.69431C10 2.99988 3 3.49988 3 9.49991C3 15.4999 12 20.5001 12 20.5001C12 20.5001 21 15.4999 21 9.49991C21 3.49988 14 2.99988 12 7.69431Z"
                        fill={likedTickets.has(ticket.id) ? "#DC143C" : "none"}
                        stroke={likedTickets.has(ticket.id) ? "#DC143C" : "white"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
