import { NextPage } from "next";
import Head from "next/head";
import styles from "../../styles/Home.module.css";
import Layout from "../../components/Layout";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
import { useEffect, useState } from "react";

interface FileItem {
  id: string;
  name: string;
  fileName: string;
  size: string;
  uploadDate: string;
}

const TaxDocuments: NextPage = () => {
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
  async function fetchFiles() {
    const res = await fetch("/api/read");
    const data = await res.json();
    setFiles(data);
  }
  fetchFiles();

  const handleFilesUpdated = () => fetchFiles();
  window.addEventListener("files-updated", handleFilesUpdated);

  return () => {
    window.removeEventListener("files-updated", handleFilesUpdated);
  };
}, []);

  const handleDocRead = (fileName: string) => {
    window.open(`/uploads/${fileName}`, "_blank");
  };

  const handleDelete = async (fileName: string) => {
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });

      if (res.ok) {
        // Remove deleted file from state so UI updates in real time
        setFiles((prev) => prev.filter((file) => file.fileName !== fileName));
      } else {
        console.error("Failed to delete file");
      }
    } catch (err) {
      console.error("Error deleting file", err);
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Tax Documents - XAO Cult</title>
          <meta name="description" content="Tax Documents" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <BackNavbar
          pageIcon="/pdfIcon.svg"
          pageTitle="Tax Documents"
          showDownload={true}
        />
        <Scrollbar />

        <main className={styles.mainDashboard}>
          <div className={styles.taxDocumentsContainer}>
            <div className={styles.documentList}>
              {files.map((doc) => (
                <div key={doc.id} className={styles.documentItem}>
                  <div className={styles.documentIcon}>
                    <img src={"/pdfIcon.svg"} width={42} height={42} />
                  </div>
                  <div className={styles.documentInfo} onClick={() => handleDocRead(doc.fileName)}
                    style={{ cursor: "pointer" }}>
                    <h4>{doc.name}</h4>
                    <p>{doc.fileName}</p>
                    <p>
                      {doc.size} {doc.uploadDate}
                    </p>
                  </div>
                  <div className={styles.documentMeta}>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDelete(doc.fileName)}
                    >
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
              <button className={styles.taxformbutton} onClick={() =>
                window.open("https://www.irs.gov/pub/irs-pdf/fw9.pdf", "_blank")}>W-9</button>
              <button className={styles.taxformbutton} onClick={() =>
                window.open("https://www.irs.gov/pub/irs-pdf/fw8ben.pdf", "_blank")}>W-8BEN</button>
              <button className={styles.taxformbutton} onClick={() =>
                window.open("https://www.irs.gov/pub/irs-pdf/fw8bene.pdf", "_blank")}>W-8BEN-E</button>
            </div>
            <h3 className={styles.taxpageDescription}>Global Forms</h3>
            <div className={styles.taxformbuttonContainer}>
              <button className={styles.taxformbutton} onClick={() =>
                window.open("https://www.oecd.org/tax/treaties/", "_blank")}>OECD</button>
              <button className={styles.taxformbutton} onClick={() =>
                window.open("https://www.irs.gov/pub/irs-pdf/fw9.pdhttps://taxsummaries.pwc.com/", "_blank")}>TAXSUMM</button>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default TaxDocuments;
