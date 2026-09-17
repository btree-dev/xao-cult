//chat-Section/Notification.tsx
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
import { useNotifications } from "../../hooks/useNotifications";
import type { NotificationItem } from "../../lib/notifications/types";

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) {
    const abs = -diff;
    const h = Math.round(abs / 3_600_000);
    if (abs < 3_600_000) return `in ${Math.max(1, Math.round(abs / 60_000))}m`;
    if (abs < 86_400_000) return `in ${h}h`;
    return `in ${Math.round(abs / 86_400_000)}d`;
  }
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

// Notifications are derived in-app from the connected wallet's on-chain
// contracts/tickets, Waku chat and tx history (no server/push in this MVP).
export default function Notification() {
  const router = useRouter();
  const { items, readIds, unreadCount, markAllRead, markRead } = useNotifications();

  const open = (n: NotificationItem) => {
    markRead(n.id);
    router.push(n.href);
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
        <BackNavbar pageTitle="Notifications" />
        <Scrollbar />
        <main className={docStyles.notificationcontainer}>
          {items.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                style={{
                  background: "none", border: "none", color: unreadCount === 0 ? "rgba(255,255,255,0.35)" : "#FF8A00",
                  cursor: unreadCount === 0 ? "default" : "pointer", fontSize: 13, textDecoration: "underline",
                }}
              >
                Mark all as read
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px 0" }}>
              No notifications
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((n) => {
                const unread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => open(n)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
                      width: "100%", padding: "12px 14px", borderRadius: 18,
                      background: unread ? "rgba(165, 87, 255, 0.14)" : "rgba(255,255,255,0.05)",
                      border: unread ? "1px solid rgba(165,87,255,0.45)" : "1px solid rgba(255,255,255,0.08)",
                      color: "#fff", cursor: "pointer",
                    }}
                  >
                    <span style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                      <Image src={n.icon || "/Chat-Section-Icons/Bell.svg"} alt="" width={22} height={22} />
                      {unread && (
                        <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: 4, background: "#FF5F6D" }} />
                      )}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, whiteSpace: "nowrap" }}>{relativeTime(n.timestampMs)}</span>
                      </span>
                      <span style={{ display: "block", color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.4, marginTop: 2 }}>
                        {n.body}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
