// pages/event/[id]/confirm.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Home.module.css";

import Navbar from "../../../components/Navbar";

const PurchaseConfirmation: NextPage = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [selectedTickets, setSelectedTickets] = useState<any[]>([]);
  const router = useRouter();
  const { id, tickets } = router.query;

  // Parse tickets from query
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

  // Fetch event from API
  useEffect(() => {
     if (!id) return;
    setLoading(true);
    try {
      let mockEvent;
      if (id === "rivo-event-1") {
        mockEvent = {
          id,
          title: "Rivo Open Air",
          date: "5th December",
          time: "06:30PM",
          location: "Wembley Stadium, London",
          image:
            "https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?q=80&w=2070&auto=format&fit=crop",
          ticketPrice: 50.0,
        };
      } else if (id === "xao-event-1") {
        mockEvent = {
          id,
          title: "XAO Festival",
          date: "15th December",
          time: "08:00PM",
          location: "O2 Arena, London",
          image:
            "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80",
          ticketPrice: 65.0,
        };
      } else if (id === "edm-event-1") {
        mockEvent = {
          id,
          title: "Electric Dreams",
          date: "20th January",
          time: "09:00PM",
          location: "Alexandra Palace, London",
          image:
            "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1740&q=80",
          ticketPrice: 45.0,
        };
      } else {
        mockEvent = {
          id,
          title: "Rivo Open Air",
          date: "5th December",
          time: "06:30PM",
          location: "Wembley Stadium, London",
          image:
            "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1740&q=80",
          ticketPrice: 50.0,
        };
            }
    setEvent(mockEvent);
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  // Confirm purchase
  const handleConfirm = () => {

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

      <div className={styles.Card}>
        <div
          className={styles.bookingDetailsCard}
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            bottom: 0,
             backgroundImage: `url('${event.image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "20px",
              zIndex: 2,
              gap: "12px",
            }}
          >
            {/* Event Title */}
            <div className={styles.confirmationHeaderTitle}>
              <h1>{event.title}</h1>
            </div>

            {/* Ticket Breakdown + Total in same container */}
            <div
              className={styles.confirmationContent}
              style={{
                background: "transparent",
                width: "100%",
                maxWidth: "400px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {selectedTickets.map((t, index) => (
                <div
                  key={index}
                  className={styles.detailRow}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
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
              <div
                className={styles.detailRow}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
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
            <div
              className={styles.confirmButtonContainer}
              style={{ position: "relative", bottom: "auto" }}
            >
              <button className={styles.confirmButton} onClick={handleConfirm}>
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseConfirmation;
