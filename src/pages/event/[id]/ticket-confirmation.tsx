// pages/event/[id]/ticket-confirmation.tsx
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import styles from "../../../styles/Home.module.css";
import Navbar from "../../../components/Navbar";

const TicketConfirmation: NextPage = () => {
  const router = useRouter();
  const { id:eventId, event, date, image, time, location, tickets } = router.query;

  if (!router.isReady) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Parse tickets array passed from confirm.tsx
  const parsedTickets =
    typeof tickets === "string" ? JSON.parse(tickets) : [];

    const handleSeeInAsset = () => {
    sessionStorage.removeItem(`purchaseState-${eventId}`);
    router.push('/stats/tickets?tab=unredeemed');
  };

  return (
    <div className={styles.confirmationContainer}>
      <div className={styles.background} />
      <Head>
        <title>Purchase Receipt - XAO Cult</title>
        <meta content="Purchase Receipt - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar showBackButton={true} pageTitle="Purchase Confirmation" />

      <div className={styles.confirmCardWrapper}>
        <div
          className={styles.confirmCard}
          style={{
            backgroundImage: `url('${image}')`,
          }}
        >
          <div className={styles.confirmOverlay}>
            {/* ✅ Success Heading */}
            <div className={styles.confirmationHeaderTitle}>
              <h1>Ticket Confirmed</h1>
            </div>

            {/* ✅ Success Icon + Text */}
            <div className={styles.confirmDetailRow}>
              <div className={styles.successIcon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="url(#ticketGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient
                      id="ticketGradient"
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
                  <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <span className={styles.detailValue}>
                You successfully purchased your Ticket!
              </span>
            </div>

            {/* ✅ Loop through all purchased ticket types */}
            {parsedTickets.map((t: any, index: number) => (
              <div
                key={index}
                className={styles.confirmDetailRow}
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
                <span className={styles.detailValue}>
                  {t.type} × {t.count}
                </span>
              </div>
            ))}

            {/* ✅ Event Info */}
            <div className={styles.confirmDetailRow}>
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
                      id="eventGradient"
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
                    stroke="url(#eventGradient)"
                    strokeWidth="3"
                  />
                  <path
                    d="M16 2v4M8 2v4M3 10h18"
                    stroke="url(#eventGradient)"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <span className={styles.detailValue}>
                Event: {date} at {time}
              </span>
            </div>

            {/* ✅ CTA */}
            <div className={styles.confirmButtonContainer}>
              <button className={styles.confirmButton} onClick={handleSeeInAsset}>See in Assets</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketConfirmation;
