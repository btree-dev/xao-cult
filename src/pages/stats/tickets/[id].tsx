import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../../../styles/Home.module.css';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';
import { mockTickets } from '../../../backend/ticket-services/ticketdata';
import { readContract } from '@wagmi/core';
import { config } from '../../../wagmi';
import { EVENT_CONTRACT_ABI } from '../../../lib/web3/eventcontract';
const TicketDetailPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();
  const { id } = router.query;

  // Matches both old 'blockchain-' and new 'chain-' prefixed IDs
  const isBlockchainTicket = typeof id === 'string' && (id.startsWith('blockchain-') || id.startsWith('chain-'));

  // Parse contract address and ticket ID from the chain- format: chain-{contractAddr}-{ticketId}
  const parseChainId = (ticketId: string) => {
    if (ticketId.startsWith('chain-')) {
      // Format: chain-0x...-ticketNum
      const withoutPrefix = ticketId.slice(6); // remove 'chain-'
      // Contract address is 42 chars (0x + 40 hex)
      const contractAddress = withoutPrefix.slice(0, 42);
      const onChainTicketId = withoutPrefix.slice(43); // skip the '-' after address
      return { contractAddress, onChainTicketId };
    }
    return null;
  };

  useEffect(() => {
    const getTicketData = async () => {
      if (!id) return;

      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/');
          return;
        }

        setUser(user);

        // Check if this is a blockchain purchased ticket
        if (isBlockchainTicket) {
          const parsed = parseChainId(id as string);

          if (parsed) {
            // Fetch ticket data directly from chain
            const contractAddr = parsed.contractAddress as `0x${string}`;
            const ticketIdNum = BigInt(parsed.onChainTicketId);

            try {
              const [ticketInfo, eventName, imageUri, locationData, datesData] = await Promise.all([
                readContract(config, {
                  address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'getTicketInfo', args: [ticketIdNum],
                }) as Promise<[bigint, string, string, boolean, bigint, bigint]>,
                readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'name' }),
                readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'imageUri' }),
                readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'location' }),
                readContract(config, { address: contractAddr, abi: EVENT_CONTRACT_ABI, functionName: 'dates' }),
              ]);

              const [, , typeName, checkedIn, purchaseDate] = ticketInfo;
              const loc = locationData as any;
              const dates = datesData as any;
              const venueName = loc?.venue ?? loc?.[0] ?? '';
              const showTimestamp = dates?.show ?? dates?.[1];
              const eventDate = showTimestamp && Number(showTimestamp) > 0
                ? new Date(Number(showTimestamp) * 1000).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                : 'TBD';
              const purchaseDateStr = purchaseDate && Number(purchaseDate) > 0
                ? new Date(Number(purchaseDate) * 1000).toLocaleDateString()
                : 'Unknown';

              setTicket({
                id: id,
                eventId: contractAddr,
                title: (eventName as string) || 'Blockchain Event',
                date: eventDate,
                location: venueName,
                image: (imageUri as string) || '',
                redeemed: checkedIn,
                ticketCode: `${contractAddr}:${parsed.onChainTicketId}`,
                lineup: [],
                details: `${typeName || 'Ticket'} — purchased on ${purchaseDateStr}. Contract: ${contractAddr}`,
                organizer: 'Smart Contract',
                contractAddress: contractAddr,
                isBlockchain: true,
              });
              setLoading(false);
              return;
            } catch (err) {
              console.error('Error fetching on-chain ticket:', err);
            }
          }

          // Fallback: try localStorage for old blockchain- prefix tickets
          const stored = localStorage.getItem('purchasedTickets');
          if (stored) {
            const purchasedTickets = JSON.parse(stored);
            const purchased = purchasedTickets.find((t: any) => t.id === id);
            if (purchased) {
              setTicket({
                id: purchased.id,
                eventId: purchased.eventId,
                title: purchased.title,
                date: purchased.date,
                location: purchased.location,
                image: purchased.image || '',
                redeemed: purchased.redeemed || false,
                ticketCode: purchased.ticketCode || `${purchased.contractAddress}:${purchased.txHash}`,
                lineup: [],
                details: `Blockchain ticket purchased on ${new Date(purchased.purchasedAt).toLocaleDateString()}. Contract: ${purchased.contractAddress}${purchased.txHash ? `. Tx: ${purchased.txHash}` : ''}`,
                organizer: 'Smart Contract',
                contractAddress: purchased.contractAddress,
                txHash: purchased.txHash,
                tickets: purchased.tickets,
                time: purchased.time,
                isBlockchain: true,
              });
              setLoading(false);
              return;
            }
          }
          router.push('/stats/tickets');
          return;
        }

        const ticketData = mockTickets.find(t => t.id === id);

        if (!ticketData) {
          router.push('/stats/tickets');
          return;
        }

        setTicket(ticketData);
      } catch (error) {
        console.error('Error in ticket detail page:', error);
        router.push('/stats/tickets');
      } finally {
        setLoading(false);
      }
    };

    getTicketData();
  }, [id, router, isBlockchainTicket]);

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  const handleBackToTickets = () => {
    router.push('/stats/tickets');
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
              {isBlockchainTicket ? '1 / 1' : `${mockTickets.findIndex(t => t.id === id) + 1} / ${mockTickets.length}`}
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

          <div className={styles.feedContent} style={{ overflow: 'hidden' }}>
            <img
              src={ticket.image || '/profileIcon.svg'}
              alt={`${ticket.title} Ticket`}
              className={styles.feedImage}
              style={{ borderRadius: '30px' }}
            />
            <div className={styles.feedContentOverlayTop}>
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

          {ticket.lineup && ticket.lineup.length > 0 && (
          <div className={styles.ticketDetailSection}>
            <h3 className={styles.sectionTitle}>LINEUP</h3>
            <div className={styles.lineupGrid}>
              {ticket.lineup.map((artist: string, index: number) => (
                <div key={index} className={styles.lineupItem}>
                  <div className={styles.lineupAvatar}>
                    <Image
                      src={index % 2 === 0 ? '/rivo-profile-pic.svg' : '/xao-profile.svg'}
                      alt={artist}
                      width={48}
                      height={48}
                    />
                  </div>
                  <span className={styles.lineupName}>{artist}</span>
                </div>
              ))}
            </div>
          </div>
          )}

          {ticket.isBlockchain && ticket.tickets && ticket.tickets.length > 0 && (
          <div className={styles.ticketDetailSection}>
            <h3 className={styles.sectionTitle}>PURCHASED TICKETS</h3>
            {ticket.tickets.map((t: any, index: number) => (
              <div key={index} className={styles.detailRow}>
                <span className={styles.detailText}>{t.type} × {t.count}</span>
              </div>
            ))}
          </div>
          )}

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
                  width={48} 
                  height={48} 
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