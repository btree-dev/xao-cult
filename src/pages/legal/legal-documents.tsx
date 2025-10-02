//Legal/legal-documents.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import Navbar from "../../components/Navbar";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/LegalDocument.module.css"; 
import { legalDocs, acceptanceText } from "../../backend/legaldata";
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
export default function LegalDocument() {
  const router = useRouter();

  const handleClick = (id: string) => {
    router.push(`/legal/${id}`);
    
  };
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />

        <Head>
          <title>Tax Documents - XAO Cult</title>
          <meta name="description" content="Legal Documents" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar pageTitle="Legal"/>
            <Scrollbar/>
        <main className={docStyles.legalHomecontainer}>
          <div className={docStyles.docContainer}>
            {legalDocs.map((doc, index) => (
              <div key={index} className={docStyles.docCard} onClick={() => handleClick(doc.id)}  style={{ cursor: "pointer" }}>
                <div className={docStyles.docCardContent}>
                  <div className={docStyles.docIcon}>
                    <img src={doc.icon} width={28} height={28} />
                  </div>
                  <div className={docStyles.docTextContent}>
                    <h3 className={docStyles.docTitle}>{doc.title}</h3>
                    <p className={docStyles.docDescription}>{doc.description}</p>
                  </div>
                
                  <div className={docStyles.docArrow} >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {index < legalDocs.length - 1 && (
                  <div className={docStyles.gradientLine}></div>
                )}
              </div>
            ))}
          </div>
          <div className={docStyles.acceptButtoncontainer}>
            <p className={docStyles.acceptanceText}>{acceptanceText}</p>
            <button className={docStyles.acceptButton}>Accept</button>
          </div>
        </main>
      </div>
    </Layout>
  );
}