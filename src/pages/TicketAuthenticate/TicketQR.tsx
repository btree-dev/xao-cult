import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import styles from "../../styles/ticketAuthenticate.module.css";
import Layout from "../../components/Layout";
import Scrollbar from "../../components/Scrollbar";
import { ticketAuthData } from "../../backend/ticketAuthData";
import TicketScan from "./TicketScan";
import TicketAuthentication from "./TicketAuthentication";

export default function TicketQR() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("Me");

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
    <Layout>
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
                disabled
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
                  <Image
                    src="/Ticket-Auth_Icons/QR.svg"
                    alt="QR Code"
                    width={330}
                    height={400}
                    className={styles.qrImage}
                  />
                </div>

                <div className={styles.infoCard}>
                  {ticketAuthData.map((item, index) => (
                    <div key={index}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoItemContent}>
                          <div className={styles.infoIcon}>
                            <img src={item.icon} width={28} height={28} alt={item.label} />
                          </div>
                          <div className={styles.infoTextContent}>
                            <p className={styles.infoLabel}>{item.label}</p>
                            <p className={styles.infoValue}>{item.value}</p>
                          </div>
                        </div>
                      </div>
                      {index < ticketAuthData.length - 1 && (
                        <div className={styles.gradientLine}></div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}