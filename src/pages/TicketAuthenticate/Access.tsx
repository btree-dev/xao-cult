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
    // Get the status from the query parameter
    if (router.query.status === "error") {
      setAuthStatus("error");
    } else {
      setAuthStatus("success");
    }
  }, [router.query]);

  const isSuccess = authStatus === "success";

  return (
    <Layout>
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
                {isSuccess ? "successful" : "failed"}
              </h2>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
