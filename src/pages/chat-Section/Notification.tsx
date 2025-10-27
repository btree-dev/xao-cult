//chat-Section/Notification.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import Navbar from "../../components/Navbar";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css"; 
import { notificationDocs } from "../../backend/notificationdata";
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";

export default function Notification() {
  const router = useRouter();

  const handleClick = (id: string) => {
    router.push(`/chat-Section/notification`);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />

        <Head>
          <title>Notifications - XAO Cult</title>
          <meta name="description" content="Notification Center" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar pageTitle="Notifications"/>
        <Scrollbar/>
        <main className={docStyles.notificationcontainer}>
          {notificationDocs.map((doc, index) => (
            <div key={index} className={docStyles.notificationrow}>
              <div className={docStyles.notificationCard} onClick={() => handleClick(doc.id)} style={{ cursor: "pointer" }}>
                <div className={docStyles.CardContent}>
                  <div className={`${docStyles.cardIcon} ${docStyles[doc.id]}`}>
                    <img src={doc.icon} width={24} height={24} />
                  </div>
                  <div className={docStyles.cardTextContent}>
                    <h3 className={docStyles.cardTitle}>{doc.title}</h3>
                    <p className={docStyles.cardDescription}>{doc.description}</p>
                  </div>
                  <div className={docStyles.cardTime}>{doc.time}</div>
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    </Layout>
  );
}
