//chat-Section/Notification.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css";
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
import { useState, useEffect } from "react";
import { useXMTPClient } from "../../contexts/XMTPContext";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: string;
  peerAddress: string;
  notificationType: 'message' | 'contract-proposal' | 'contact-card';
  contractAddress?: string;
  party1?: string;
  party2?: string;
}

export default function Notification() {
  const router = useRouter();
  const { client, clearUnread } = useXMTPClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Clear unread badge when viewing notifications
  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  // Load real notifications from XMTP conversations
  useEffect(() => {
    const loadNotifications = async () => {
      if (!client) {
        console.log("[Notification] No XMTP client yet, waiting...");
        return; // Don't set loading=false — wait for client to arrive
      }

      try {
        console.log("[Notification] Loading conversations...");
        await client.conversations.sync();
        const conversations = await client.conversations.list();
        console.log(`[Notification] Found ${conversations.length} conversations`);

        const items: NotificationItem[] = [];
        const myInboxId = client.inboxId;
        console.log(`[Notification] My inboxId: ${myInboxId}`);

        for (const conv of conversations) {
          try {
            await conv.sync();
            const messages = await conv.messages({ limit: BigInt(10) });
            console.log(`[Notification] Conv ${conv.id}: ${messages.length} messages`);

            // Resolve peer address
            let peerAddress = '';
            try {
              if ((conv as any).peerAddresses && (conv as any).peerAddresses.length > 0) {
                peerAddress = (conv as any).peerAddresses[0];
              } else if (typeof (conv as any).members === "function") {
                const members = await (conv as any).members();
                const otherMember = members?.find((m: any) => m.inboxId !== myInboxId);
                if (otherMember?.accountIdentifiers?.length > 0) {
                  peerAddress = otherMember.accountIdentifiers[0].identifier;
                }
              }
            } catch {
              peerAddress = '';
            }
            console.log(`[Notification] Conv peer: ${peerAddress}`);

            // Get recent messages (include all — sent and received)
            const recentMessages = messages.slice(-5);
            console.log(`[Notification] Processing ${recentMessages.length} recent messages`);

            for (const msg of recentMessages) {
              console.log(`[Notification] Message from ${msg.senderInboxId}, content type: ${typeof msg.content}, content:`,
                typeof msg.content === 'string' ? msg.content.slice(0, 100) : msg.content);
            }

            // Filter to messages from others only
            const incomingMessages = messages
              .filter((msg: any) => msg.senderInboxId !== myInboxId)
              .slice(0, 3);

            console.log(`[Notification] ${incomingMessages.length} incoming messages after filter`);

            for (const msg of incomingMessages) {
              let raw = msg.content as any;
              let title = "New message";
              let description = "";
              let icon = "/Chat-Section-Icons/Mail.svg";
              let notificationType: NotificationItem['notificationType'] = 'message';
              let contractAddress = '';
              let party1 = '';
              let party2 = '';

              // Parse JSON string content
              let content = raw;
              if (typeof raw === "string") {
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed && typeof parsed === "object") {
                    content = parsed;
                  }
                } catch {
                  content = raw;
                }
              }

              // Determine notification type
              if (typeof content === "object" && content !== null) {
                const type = content.type || '';

                // Skip system messages
                if ("initiatedByInboxId" in content || "membersAdded" in content || "membersRemoved" in content) {
                  continue;
                }

                if (type === "contract-proposal" || type === "contract_proposal") {
                  title = "Contract Proposal";
                  notificationType = 'contract-proposal';
                  const eventName = content.data?.promotion?.value || content.terms?.promotion?.value || '';
                  description = eventName
                    ? `Revision #${content.revisionNumber || 1} — ${eventName}`
                    : `Revision #${content.revisionNumber || 1} received`;
                  icon = "/Chat-Section-Icons/File_Document.svg";
                  contractAddress = content.data?.contractAddress || content.contractAddress || '';
                  party1 = content.data?.party1 || content.proposedBy || '';
                  party2 = content.data?.party2 || peerAddress || '';
                } else if (type === "contact-card" || type === "contact_card") {
                  title = "Contact Shared";
                  notificationType = 'contact-card';
                  description = content.name || content.username || "Contact card received";
                  icon = "/Chat-Section-Icons/Bell.svg";
                } else {
                  continue; // Skip unknown object types
                }
              } else if (typeof content === "string" && content.trim()) {
                description = content.length > 80 ? content.slice(0, 80) + "..." : content;
              } else {
                continue; // Skip empty/unreadable messages
              }

              // Format time ago
              const sentMs = msg.sentAtNs ? Number(msg.sentAtNs) / 1_000_000 : Date.now();
              const diffMs = Date.now() - sentMs;
              const diffMin = Math.floor(diffMs / 60000);
              const diffHr = Math.floor(diffMs / 3600000);
              const diffDay = Math.floor(diffMs / 86400000);
              let time = "Now";
              if (diffDay > 0) time = `${diffDay}d`;
              else if (diffHr > 0) time = `${diffHr}h`;
              else if (diffMin > 0) time = `${diffMin}m`;

              // Use a stable unique ID
              const notifId = `${conv.id}-${msg.id || sentMs}`;

              items.push({
                id: notifId,
                title,
                description,
                time,
                icon,
                peerAddress,
                notificationType,
                contractAddress,
                party1,
                party2,
              });
            }
          } catch (err) {
            console.warn("[Notification] Error loading conversation:", err);
          }
        }

        // Sort most recent first
        items.sort((a, b) => {
          const timeToMs = (t: string) => {
            if (t === "Now") return 0;
            const num = parseInt(t);
            if (t.endsWith("m")) return num;
            if (t.endsWith("h")) return num * 60;
            if (t.endsWith("d")) return num * 1440;
            return 9999;
          };
          return timeToMs(a.time) - timeToMs(b.time);
        });

        console.log(`[Notification] Loaded ${items.length} notifications`);
        setNotifications(items);
      } catch (err) {
        console.error("[Notification] Failed to load:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [client]);

  // Click: navigate to relevant page and remove the notification
  const handleClick = (notification: NotificationItem) => {
    console.log("[Notification] Clicked:", notification);

    // Remove this notification from the list
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

    if (notification.notificationType === 'contract-proposal' && notification.contractAddress) {
      router.push({
        pathname: '/contracts/contracts-detail',
        query: {
          id: notification.contractAddress,
          source: 'negotiation',
          party1: notification.party1 || '',
          party2: notification.party2 || '',
        },
      });
    } else if (notification.peerAddress) {
      router.push({
        pathname: '/contracts/create-contract',
        query: { peer: notification.peerAddress },
      });
    } else {
      router.push('/chat-Section/Search');
    }
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
        <BackNavbar pageTitle="Notifications"/>
        <Scrollbar/>
        <main className={docStyles.notificationcontainer}>
          {!client || loading ? (
            <div style={{ color: "white", textAlign: "center", padding: "40px 0" }}>
              {!client ? "Connecting to chat..." : "Loading notifications..."}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "40px 0" }}>
              No notifications
            </div>
          ) : (
            notifications.map((doc) => (
              <div key={doc.id} className={docStyles.notificationrow}>
                <div className={docStyles.notificationCard} onClick={() => handleClick(doc)} style={{ cursor: "pointer" }}>
                  <div className={docStyles.CardContent}>
                    <div className={docStyles.cardIcon}>
                      <img src={doc.icon} width={24} height={24} alt="" />
                    </div>
                    <div className={docStyles.cardTextContent}>
                      <h3 className={docStyles.cardTitle}>{doc.title}</h3>
                      <p className={docStyles.cardDescription}>{doc.description}</p>
                    </div>
                    <div className={docStyles.cardTime}>{doc.time}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </Layout>
  );
}
