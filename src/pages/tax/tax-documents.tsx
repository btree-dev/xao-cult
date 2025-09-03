import { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import Image from 'next/image';
import styles from '../../styles/Home.module.css';
import Navbar from '../../components/Navbar';
import StatsNav from '../../components/StatsNav';
import Layout from '../../components/Layout';
import Scrollbar from '../../components/Scrollbar';
const TaxDocuments: NextPage = () => {
  
  const documents = [
    {
      id: 1,
      name: 'From 1099',
      fileName: 'From_1099.pdf',
      size: '2.3 MB',
      uploadDate: 'Upload on 25 May',
      
    },
    {
      id: 2,
      name: 'W-9',
      fileName: 'W-9_form.pdf',
      size: '1.8 MB',
      uploadDate: 'Upload on 24 May',
      
    },
    {
      id: 3,
      name: 'W-8BEN',
      fileName: 'W-8BEN_form.pdf',
      size: '2.1 MB',
      uploadDate: 'Upload on 23 May',
      
    },
    {
      id: 4,
      name: 'W-8BEN-E',
      fileName: 'W-8BEN-E_form.pdf',
      size: '2.5 MB',
      uploadDate: 'Upload on 22 May',
      
    },
   
      {
      id: 5,
      name: 'OECD',
      fileName: 'OECD_form.pdf',
      size: '1.9 MB',
      uploadDate: 'Upload on 21 May',
      
    }
  ];

  return (
    <Layout>
    <div className={styles.container}>
        <div className={styles.background}/>
      <Head>
        <title>Tax Documents - XAO Cult</title>
        <meta name="description" content="Tax Documents" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar showBackButton pageTitle="Tax Documents" />
      <Scrollbar/>

      <main className={styles.mainDashboard}>
        <div className={styles.taxDocumentsContainer}>
          <div className={styles.documentList}>
            {documents.map((doc) => (
              <div key={doc.id} className={styles.documentItem}>
                <div className={styles.documentIcon}>
                    <svg 
                        width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="8" y="4" width="24" height="32" rx="2" fill="#FF4B4B"/>
                        <path d="M13 16H27V18H13V16Z" fill="white"/>
                        <path d="M13 20H27V22H13V20Z" fill="white"/>
                        <path d="M13 24H22V26H13V24Z" fill="white"/>
                        <path d="M13 12H20V14H13V12Z" fill="white"/>
                    </svg>
                </div>
                <div className={styles.documentInfo}>
                  <h4>{doc.name}</h4>
                  <p>{doc.fileName}</p>
                  <p>{doc.size} {doc.uploadDate}</p>
                </div>
                <div className={styles.documentMeta}>
                  
                  <button className={styles.downloadButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.5 12.5V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V12.5"  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5.83337 8.33333L10 12.5L14.1667 8.33333"  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> 
                      <path d="M10 12.5V2.5"  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>  
                  </button>
                  <button className={styles.deleteButton}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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