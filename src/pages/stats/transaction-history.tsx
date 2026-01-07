import { useState } from "react";
import styles from "../../styles/TransactionHistory.module.css";
import Image, { StaticImageData } from "next/image";
import Layout from '../../components/Layout';
import StatsNav from '../../components/StatsNav';

import swapIcon from "../../../public/swap-currency.svg";
import transferIcon from "../../../public/transfer-history/transfer.svg";
import ticketIcon from "../../../public/transfer-history/ticket.svg";

type Transaction = {
  id: number;
  type: string;
  icon: StaticImageData;
  amount: string;
  status: "Success" | "Sent";
  date: string;
};

export default function TransactionHistory() {
  const [activeTab, setActiveTab] = useState<"All" | "Swap" | "Transfer">("All");

  const transactions: Transaction[] = [
    { id: 1, type: "Swap", icon: swapIcon, amount: "20 MATIC", status: "Success", date: "15 May" },
    { id: 2, type: "Vip Ticket", icon: ticketIcon, amount: "1 Tickets", status: "Sent", date: "16 May" },
    { id: 3, type: "Transfer", icon: transferIcon, amount: "248.00", status: "Sent", date: "17 May" },
  ];

  const filteredTransactions =
    activeTab === "All"
      ? transactions
      : transactions.filter((t) => t.type.toLowerCase().includes(activeTab.toLowerCase()));

  return (
    <Layout>

    <div className={styles.container}>
      <div className={styles.background} />
      <StatsNav/>
      <h2 className={styles.heading}>Transaction History</h2>

      <div className={styles.tabs}>
        {(["All", "Swap", "Transfer"] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filteredTransactions.map((t) => (
          <div key={t.id} className={styles.card}>
            <div className={styles.cardLeft}>
              <Image src={t.icon} alt={t.type} width={40} height={40} />
              <div>
                <p className={styles.type}>{t.type}</p>
                <p className={styles.amount}>{t.amount}</p>
              </div>
            </div>
            <div className={styles.cardRight}>
              <p className={styles.date}>{t.date}</p>
              <p className={t.status === "Success" ? styles.success : styles.sent}>{t.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
    </Layout>
  );
}
