import { NextPage } from 'next';
import Head from 'next/head';
import styles from '../../styles/Home.module.css';
import Navbar from '../../components/Navbar';
import StatsNav from '../../components/StatsNav';
import Layout from '../../components/Layout';
import { taxDocs } from '../../backend/taxdata';
import BackNavbar from '../../components/BackNav';
import Scrollbar from '../../components/Scrollbar';

const TaxDocuments: NextPage = () => {
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Tax Documents - XAO Cult</title>
          <meta name="description" content="Tax Documents" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar  pageIcon="/pdfIcon.svg" pageTitle="Tax Documents" showDownload={true}/>
        <Scrollbar />
        <main className={styles.mainDashboard}>
          <div className={styles.taxDocumentsContainer}>
            <div className={styles.documentList}>
              {taxDocs.map((doc) => (
                <div key={doc.id} className={styles.documentItem}>
                  <div className={styles.documentIcon}>
                    <img src={'/pdfIcon.svg'} width={42} height={42}/> 
                  </div>
                  <div className={styles.documentInfo}>
                    <h4>{doc.name}</h4>
                    <p>{doc.fileName}</p>
                    <p>
                      {doc.size} {doc.uploadDate}
                    </p>
                  </div>
                  <div className={styles.documentMeta}>
                    <button className={styles.downloadButton}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <g transform="scale(0.9) translate(1.4,1.4)">
                            {/* Folder shape */}
                            <path
                              d="M3 7h5l2 2h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
                              stroke="white"
                              strokeWidth="2"
                              fill="none"
                              strokeLinejoin="round"
                            />

                            {/* Upload arrow */}
                            <line
                              x1="12"
                              y1="16"
                              x2="12"
                              y2="10"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <polyline
                              points="9 13 12 10 15 13"
                              stroke="white"
                              strokeWidth="2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        </svg>
                    </button>
                    <button className={styles.deleteButton}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 6H5H21"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.documentCategories}>
            <h3 className={styles.taxpageDescription}>USA Tax Form</h3>
            <div className={styles.taxformbuttonContainer}>
            
              <button className={styles.taxformbutton}>W-9</button>
              <button className={styles.taxformbutton}>W-8BEN</button>
              <button className={styles.taxformbutton}>W-8BEN-E</button>
              </div>
              <h3 className={styles.taxpageDescription}>Global Forms</h3>
              <div className={styles.taxformbuttonContainer}>
              <button className={styles.taxformbutton}>OECD</button>
              <button className={styles.taxformbutton}>TAXSUMM</button>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default TaxDocuments;
