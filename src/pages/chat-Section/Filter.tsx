//chat-Section/Filter.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import Navbar from "../../components/Navbar";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css"; 
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
import { Filters } from "../../backend/Chat-Services/filters"; 

export default function Filter() {
  const router = useRouter();

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />

        <Head>
          <title>Filter - XAO Cult</title>
          <meta name="description" content="Notification Center" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
        pageTitle="Search"
        leftIcon="/Chat-Section-Icons/Bell.svg"
        rightIcon="/Chat-Section-Icons/Filter.svg"
      />
        <Scrollbar/>
        <main className={docStyles.notificationcontainer}>
          <div className={docStyles.filterdocContainer}>
            <h2 className={docStyles.filterMainHeading}>Filter</h2>
            {Filters.map((filter, idx) => {
              const [key, values] = Object.entries(filter)[0];
              return (
                <div key={key} className={docStyles.filterSection}>
                  <h3 className={docStyles.filterTitle}>{key}</h3>
                  <ul className={docStyles.filterList}>
                    {values.map((val: string) => (
                      <li key={val} className={docStyles.filterItem}>
                        <label className={docStyles.checkboxLabel}>
                          <input type="checkbox" className={docStyles.filterCheckbox} />
                          <span className={docStyles.checkboxText}>{val}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <button
            className={docStyles.searchButton}
            onClick={() => router.push('/chat-Section/Search')}
          >
            Search
          </button>
        </main>
      </div>
    </Layout>
  );
}
