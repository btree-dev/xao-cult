//chat-Section/Notification.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";

// Notifications were tied to the old messaging transport; Waku has no
// server-side notification stream to replace them with yet (out of scope
// this pass — see the design's locked "no notification polish" decision,
// docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md §12).
export default function Notification() {
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Notifications - XAO Cult</title>
          <meta name="description" content="Notification Center" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar pageTitle="Notifications" />
        <Scrollbar />
        <main className={docStyles.notificationcontainer}>
          <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px 0" }}>
            No notifications
          </div>
        </main>
      </div>
    </Layout>
  );
}
