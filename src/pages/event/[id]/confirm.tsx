// pages/event/[id]/confirm.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Home.module.css";
import { useBuyTickets } from "../../../hooks/useBuyTickets";
import { useWeb3 } from "../../../hooks/useWeb3";
import { waitForTransactionReceipt, readContract } from "@wagmi/core";
import { config } from "../../../wagmi";
import { EVENT_CONTRACT_ABI } from "../../../lib/web3/eventcontract";

import Navbar from "../../../components/Navbar";

const PurchaseConfirmation: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [selectedTickets, setSelectedTickets] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string>("");
  const router = useRouter();
  const { id, tickets, eventTitle, eventImage, eventLocation, eventDate, eventTime } = router.query;
  
  // Web3 hooks
  const { address, isConnected } = useWeb3();
  const { buyTickets, isPending, isWaiting, isSuccess, error: txError } = useBuyTickets();
  
  // Check if ID is a contract address
  const isContractAddress = typeof id === 'string' && id.startsWith('0x');
  const contractAddress = isContractAddress ? (id as `0x${string}`) : undefined;

  useEffect(() => {
    if (tickets) {
      try {
        const parsed = JSON.parse(tickets as string);
        setSelectedTickets(parsed);
      } catch (e) {
        console.error("Error parsing tickets:", e);
      }
    }
  }, [tickets]);

  useEffect(() => {
    if (!id || !eventTitle) return;
    setEvent({
      id,
      title: eventTitle as string,
      date: (eventDate as string) || 'TBD',
      time: (eventTime as string) || 'TBD',
      location: (eventLocation as string) || 'No venue specified',
      image: (eventImage as string) || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80',
      ticketPrice: 0,
    });
    setLoading(false);
  }, [id, eventTitle, eventImage, eventLocation, eventDate, eventTime]);
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10 ? day % 10 : 0)];
    return `${day}${suffix} ${month}`;
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

 
  const handleConfirm = async () => {
    // If it's a blockchain contract, call buyTickets
    if (isContractAddress && contractAddress) {
      if (!isConnected) {
        setPurchaseError("Please connect your wallet to purchase tickets");
        return;
      }

      setIsPurchasing(true);
      setPurchaseError("");

      try {
        // Read all ticket types from on-chain contract (prices in wei)
        const ticketTypes = await readContract(config, {
          address: contractAddress,
          abi: EVENT_CONTRACT_ABI,
          functionName: 'getTicketTypes',
        }) as any[];

        const txHashes: string[] = [];

        // Buy each selected ticket type separately with its correct on-chain price
        for (const ticket of selectedTickets) {
          const typeId = ticket.typeId ?? 0;
          const quantity = ticket.count;
          const onChainPrice = ticketTypes[typeId]?.price || ticketTypes[typeId]?.[3] || BigInt(0);
          const totalWei = BigInt(onChainPrice) * BigInt(quantity);

          console.log(`Purchasing ticket type ${typeId} (${ticket.type}):`, {
            typeId,
            quantity,
            onChainPrice: onChainPrice.toString(),
            totalWei: totalWei.toString(),
          });

          const txHash = await buyTickets(contractAddress, typeId, quantity, totalWei);

          if (txHash) {
            await waitForTransactionReceipt(config, { hash: txHash });
            txHashes.push(txHash);
          }
        }

        router.push({
          pathname: `/event/${id}/ticket-confirmation`,
          query: {
            event: event.title,
            date: event.date,
            time: event.time,
            image: event.image,
            location: event.location,
            tickets: JSON.stringify(selectedTickets),
            contractAddress: contractAddress,
            txHash: txHashes[txHashes.length - 1] || '',
          },
        });
      } catch (err) {
        console.error('Purchase failed:', err);
        setPurchaseError(err instanceof Error ? err.message : "Failed to purchase tickets");
        setIsPurchasing(false);
      }
    } else {
      router.push({
        pathname: `/event/${id}/ticket-confirmation`,
        query: {
          event: event.title,
          date: event.date,
          time: event.time,
          image: event.image,
          location: event.location,
          tickets: JSON.stringify(selectedTickets),
        },
      });
    }
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

  // Calculate total dynamically
  const totalAmount = selectedTickets.reduce(
    (sum, t) => sum + t.count * t.price,
    0
  );

  return (
    <div className={styles.confirmationContainer}>
      <div className={styles.background} />
      <Head>
        <title>Purchase Confirmation - XAO Cult</title>
        <meta content="Purchase Confirmation - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle={"Confirm Purchase"} />

      <div className={styles.confirmCardWrapper}>
        <div
          className={styles.confirmCard}
          style={{
            backgroundImage: `url('${event.image}')`,
          }}
        >
          <div className={styles.confirmOverlay}>
    
            <div className={styles.confirmationHeaderTitle} style={{ textAlign: 'center', width: '100%' }}>
              <h1>{event.title}</h1>
            </div>


            <div className={styles.confirmContentWrapper}>
              {selectedTickets.map((t, index) => (
                <div
                  key={index}
                  className={styles.confirmDetailRow}
                >
                  <div className={styles.detailIcon}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient
                          id={`ticketGradient-${index}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#FF8A00" />
                          <stop offset="50%" stopColor="#FF5F6D" />
                          <stop offset="100%" stopColor="#A557FF" />
                        </linearGradient>
                      </defs>
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        stroke={`url(#ticketGradient-${index})`}
                        strokeWidth="3"
                      />
                      <path
                        d="M16 2v4M8 2v4M3 10h18"
                        stroke={`url(#ticketGradient-${index})`}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  <span className={styles.ticketTypeName}>
                    Ticket(s): {t.type} × {t.count}
                  </span>
                </div>
              ))}

              {/* Total Summary */}
              <div className={styles.confirmDetailRow}>
                <div className={styles.detailIcon}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="url(#dollarGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <defs>
                      <linearGradient
                        id="dollarGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#FF8A00" />
                        <stop offset="50%" stopColor="#FF5F6D" />
                        <stop offset="100%" stopColor="#A557FF" />
                      </linearGradient>
                    </defs>
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className={styles.summaryLabel}>Total:</span>
                <span className={styles.summaryValue}>
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Confirm Button */}
            <div className={styles.confirmButtonContainer}>
              {purchaseError && (
                <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>
                  {purchaseError}
                </div>
              )}
              <button 
                className={styles.confirmButton} 
                onClick={handleConfirm}
                disabled={isPurchasing || isPending || isWaiting}
              >
                {isPurchasing || isPending || isWaiting ? 'Processing...' : 'Confirm Purchase'}
              </button>
              {isContractAddress && !isConnected && (
                <p style={{ color: 'yellow', marginTop: '10px', textAlign: 'center', fontSize: '14px' }}>
                  Please connect your wallet to purchase tickets
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseConfirmation;
