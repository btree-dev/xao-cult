import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { QRCodeSVG } from "qrcode.react";
import styles from "../../styles/ticketAuthenticate.module.css";
import Layout from "../../components/Layout";
import Scrollbar from "../../components/Scrollbar";
import TicketScan from "./TicketScan";
import TicketAuthentication from "./TicketAuthentication";
import { useProfileCache } from "../../contexts/ProfileCacheContext";
import { useWeb3 } from "../../hooks/useWeb3";
import { buildProfileQrUrl } from "../../lib/profileQr";

export default function TicketQR() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("Me");
  const { address } = useWeb3();
  const { currentUserProfile } = useProfileCache();
  const username = currentUserProfile?.username;

  // The QR encodes an app URL so any camera opens XAO straight into a DM with
  // this user; it re-generates whenever the address or username changes. Built
  // from the current origin so it points at whatever domain the app runs on.
  const qrUrl = useMemo(() => {
    if (typeof window === "undefined" || !address) return "";
    return buildProfileQrUrl(window.location.origin, address, username);
  }, [address, username]);

  const shortWallet = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  useEffect(() => {
    // Check if there's a tab query parameter
    if (router.query.tab === "Scan") {
      setActiveTab("Scan");
    } else if (router.query.tab === "Authenticate") {
      setActiveTab("Authenticate");
    } else if (router.query.tab === "Me") {
      setActiveTab("Me");
    }
  }, [router.query.tab]);

  return(
    <Layout hideNav={activeTab === "Scan" || activeTab === "Authenticate"}>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Ticket Authenticate</title>
        </Head>
        <Scrollbar/>

        <main className={styles.mainDashboard}>
          <div>
            <div className={styles.buttonContainer}>
              <button
                className={`${styles.button} ${activeTab === "Scan" ? styles.buttonSelected : ""}`}
                onClick={() => setActiveTab("Scan")}
              >
                Scan
              </button>
              <button
                className={`${styles.button} ${activeTab === "Authenticate" ? styles.buttonSelected : ""}`}
                onClick={() => setActiveTab("Authenticate")}
              >
                Authenticate
              </button>
              <button
                className={`${styles.button} ${activeTab === "Me" ? styles.buttonSelected : ""}`}
                onClick={() => setActiveTab("Me")}
              >
                Me
              </button>
            </div>

            {activeTab === "Scan" && <TicketScan />}

            {activeTab === "Authenticate" && <TicketAuthentication />}

            {activeTab === "Me" && (
              <>
                <div className={styles.qrImageContainer}>
                  {qrUrl ? (
                    // White quiet-zone card keeps the QR high-contrast so any
                    // camera scans it reliably regardless of the dark theme.
                    <div style={{ background: "#fff", padding: 16, borderRadius: 20, display: "inline-block" }}>
                      <QRCodeSVG value={qrUrl} size={280} level="M" marginSize={0} />
                    </div>
                  ) : (
                    <p style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "40px 0" }}>
                      Connect your wallet to show your QR code.
                    </p>
                  )}
                </div>

                <div className={styles.infoCard}>
                  {/* Real profile fields. The other identity fields (DID,
                      ActivityPub URL, Xao URL) are hidden until we have real data
                      to populate them — see backend/ticketAuthData.ts. */}
                  <div className={styles.infoItem}>
                    <div className={styles.infoItemContent}>
                      <div className={styles.infoIcon}>
                        <img src="/Ticket-Auth_Icons/User_01.svg" width={28} height={28} alt="Username" />
                      </div>
                      <div className={styles.infoTextContent}>
                        <p className={styles.infoLabel}>Username</p>
                        <p className={styles.infoValue}>{username || "Not set"}</p>
                      </div>
                    </div>
                  </div>
                  <div className={styles.gradientLine}></div>
                  <div className={styles.infoItem}>
                    <div className={styles.infoItemContent}>
                      <div className={styles.infoIcon}>
                        <img src="/Ticket-Auth_Icons/Frame.svg" width={28} height={28} alt="Wallet" />
                      </div>
                      <div className={styles.infoTextContent}>
                        <p className={styles.infoLabel}>Wallet</p>
                        <p className={styles.infoValue}>{shortWallet || "Not connected"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}