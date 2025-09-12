// pages/Legal/[id].tsx
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import Navbar from "../../components/Navbar";
import styles from "../../styles/Home.module.css";
// import docStyles from "../../styles/LegalDocument.module.css";
import docStyles from "../../styles/legalDocument.module.css";
import { legalDocs } from "../../backend/legaldata";
import BackNavbar from "../../components/BackNav";

export default function LegalDocDetail() {
  const router = useRouter();
  const { id } = router.query;

  // Find document by id
  const doc = typeof id === "string"
    ? legalDocs.find((d) => d.id === id)
    : null;

  if (!doc) {
    return (
      <Layout>
        <div className={styles.container}>
          <BackNavbar/>
          <main className={docStyles.mainDashboard}>
            <p className="text-white">Sorry, the document could not be found.</p>
          </main>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={docStyles.container}>
        <div className={styles.background} />
        <Head>
          <title>{doc.title} - XAO Cult</title>
          <meta name="description" content={doc.description} />
        </Head>

        <BackNavbar/>

        <main className={docStyles.mainDashboard}>
          <div className={docStyles.legaltermsContainer}>
                  <h2 className={docStyles.docTitle}>{doc.title}</h2>
            {doc.intro && doc.intro.trim() !== "" && (
              <p className={docStyles.docTitle}>{doc.intro}</p>
            )}

            {doc.information && doc.information.length > 0 && (
              <div className={docStyles.infoSection}>
                {doc.information.map((item, idx) => (
                  <div key={idx}>
                    <p className={docStyles.docheading}>{idx + 1}. {item.heading} </p>
                    <p className={docStyles.docheading}>{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={docStyles.acceptButtoncontainer}>
            <button className={styles.confirmButton}>
              Accept
            </button>
            </div>
          
          
        </main>
      </div>
    </Layout>
  );
}
