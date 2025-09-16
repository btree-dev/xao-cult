// pages/Legal/[id].tsx
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/legalDocument.module.css";
import { legalDocs } from "../../backend/legaldata";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";

export default function LegalDocDetail() {
  const router = useRouter();
  const { id } = router.query;

  // Find document by id
  const doc =
    typeof id === "string" ? legalDocs.find((d) => d.id === id) : null;

  if (!doc) {
    return (
      <Layout>
        <div className={styles.container}>
          <BackNavbar />
          <main className={docStyles.mainDashboard}>
            <p className="text-white">
              Sorry, the document could not be found.
            </p>
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

        <BackNavbar />
        <Scrollbar />

        <main className={docStyles.mainDashboard}>
          <div className={docStyles.legaltermsContainer}>
            <h2 className={docStyles.docTitle}>{doc.title}</h2>

            {doc.information && doc.information.length > 0 && (
              <div className={docStyles.infoSection}>
                {doc.information.map((section, idx) => (
                  <div key={idx} className="mb-6">
                    <p className={docStyles.docheading}>{section.heading}</p>

                    {Array.isArray(section.content) &&
                      section.content.map((contentItem, cIdx) => {
                        if (contentItem.type === "paragraph") {
                          return (
                            <p key={cIdx} className="text-white mb-4">
                              {contentItem.text}
                            </p>
                          );
                        }
                        if (contentItem.type === "list" && Array.isArray(contentItem.items)) {
                          return (
                            <ul key={cIdx} className="list-disc ml-6 mb-4">
                              {contentItem.items.map((point, pIdx) => (
                                <li key={pIdx} className="text-white mb-2">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        if (contentItem.type === "link") {
                          return (
                            <p key={cIdx} className="text-white mb-4">
                              <a
                                href={contentItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 underline hover:text-blue-500"
                              >
                                {contentItem.label}
                              </a>
                            </p>
                          );
                        }
                        return null;
                      })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={docStyles.acceptButtoncontainer}>
            <button className={styles.confirmButton}>Accept</button>
          </div>
        </main>
      </div>
    </Layout>
  );
}
