import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import styles from "../../styles/ticketAuthenticate.module.css";
import Layout from "../../components/Layout";
import Scrollbar from "../../components/Scrollbar";

export default function Access() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<"success" | "error">("success");

  useEffect(() => {
    if (router.query.status === "error") {
      setAuthStatus("error");
    } else {
      setAuthStatus("success");
    }
  }, [router.query]);

  const isSuccess = authStatus === "success";
  const reason = router.query.reason as string | undefined;
  const ticketType = router.query.ticketType ? decodeURIComponent(router.query.ticketType as string) : '';

  const getErrorMessage = () => {
    switch (reason) {
      case 'invalid_format': return 'Invalid QR code format';
      case 'wallet_not_connected': return 'Wallet not connected';
      case 'invalid_contract': return 'Invalid contract address';
      case 'no_tickets': return 'No tickets found on contract';
      case 'already_redeemed': return 'All tickets already redeemed';
      case 'not_organizer': return 'Only organizers can check in';
      case 'checkin_failed': return 'Check-in transaction failed';
      default: return 'failed';
    }
  };

  return (
    
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>{isSuccess ? "Authentication Successful" : "Authentication Failed"}</title>
        </Head>
        <Scrollbar />

        <main className={styles.mainDashboard}>
          <div className={styles.accessContent}>
            <div className={styles.successIconContainer}>
              <div className={isSuccess ? styles.successIconCircle : styles.errorIconCircle}>
                <div className={styles.checkmarkSquare}>
                  {isSuccess ? (
                    <svg
                      width="79.33"
                      height="79.33"
                      viewBox="0 0 79.33 79.33"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.checkmarkIcon}
                    >
                      <path
                        d="M20 40L35 55L60 25"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="79.33"
                      height="79.33"
                      viewBox="0 0 79.33 79.33"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.checkmarkIcon}
                    >
                      <path
                        d="M25 25L55 55M55 25L25 55"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.accessMessageContainer}>
              <h1 className={styles.accessTitle}>
                {isSuccess ? "Authenticate" : "Authentication"}
              </h1>
              <h2 className={styles.accessSubtitle}>
                {isSuccess ? (ticketType ? `${ticketType} — successful` : "successful") : getErrorMessage()}
              </h2>
            </div>

            <button
              className={styles.authenticateButton}
              onClick={() => router.push('/TicketAuthenticate/TicketQR?tab=Scan')}
            >
              Done
            </button>
          </div>
        </main>
      </div>
  
  );
}
