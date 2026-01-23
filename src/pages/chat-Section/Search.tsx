//chat-Section/Filter.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import Navbar from "../../components/Navbar";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css"; 
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
import Image from "next/image";
import { useState, useMemo } from "react";
import { searchData } from "../../backend/Chat-Services/Search";

export default function Search() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    return searchData.filter((item) =>
      item.name.toLowerCase().startsWith(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <Layout>
      <div className={docStyles.searchhomeContainer}>
        <div className={styles.background} />

        <Head>
          <title>Search - XAO Cult</title>
          <meta name="description" content="Notification Center" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
        pageTitle="Search"
        rightIcon="/Chat-Section-Icons/Filter.svg"
        onRightIconClick={() => router.push('/chat-Section/Filter')}
      />
        <Scrollbar/>
        <main className={docStyles.searchContainer}>
          <div className={docStyles.searchBarContainer}>
            <Image
              src="/Chat-Section-Icons/Search_Magnifying_Glass.svg"
              alt="Search"
              width={20}
              height={20}
              className={docStyles.searchIcon}
            />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={docStyles.searchInput}
            />
          </div>

          {filteredResults.length > 0 && (
            <div className={docStyles.searchResultsContainer}>
              {filteredResults.map((result, index) => (
                <div
                  key={index}
                  className={docStyles.searchResultCard}
                  onClick={() => router.push(`/events/${result.name}`)}
                >
                  <div className={docStyles.searchResultImage}>
                    <Image
                      src={result.image || `/Chat-Section-Icons/event-placeholder.svg`}
                      alt={result.name}
                      width={60}
                      height={60}
                      className={docStyles.resultImage}
                    />
                  </div>
                  <div className={docStyles.searchResultContent}>
                    <h3 className={docStyles.searchResultTitle}>{result.name}</h3>
                    <p className={docStyles.searchResultEvents}>
                      {result.events} {result.events === 1 ? 'event' : 'events'}
                    </p>
                  </div>
                  <div
                    className={docStyles.searchResultAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/chat-Section/Chat');
                    }}
                  >
                    <Image
                      src="/Chat-Section-Icons/Message Icon 1.svg"
                      alt="Notify"
                      width={46}
                      height={46}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
