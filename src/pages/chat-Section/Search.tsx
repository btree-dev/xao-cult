//chat-Section/Search.tsx
import Head from "next/head";
import Layout from "../../components/Layout";
import styles from "../../styles/Home.module.css";
import docStyles from "../../styles/ChatSection.module.css";
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Scrollbar from "../../components/Scrollbar";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { Client, type Identifier } from "@xmtp/browser-sdk";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useGetUserNFTs } from "../../hooks/useContractNFT";

interface ConversationPreview {
  id: string;
  type: "conversation";
  peerAddress?: string;
  peerInboxId: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  conversation: any;
}

interface EventPreview {
  id: string;
  type: "event";
  tokenId: bigint;
  party1: string;
  party2: string;
  terms: string;
  createdAt: Date;
  isSigned: boolean;
}

type ListItem = ConversationPreview | EventPreview;

export default function Search() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [events, setEvents] = useState<EventPreview[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [xmtpClient, setXmtpClient] = useState<Client<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "conversations" | "events">("all");

  // Get user's contract NFTs
  const { tokenIds, isLoading: isLoadingTokenIds } = useGetUserNFTs(address, chainId);

  // Truncate address for display
  const truncateAddress = (addr: string | unknown): string => {
    if (!addr || typeof addr !== "string") return "Unknown";
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Format time for display
  const formatTime = (date: Date | undefined): string => {
    if (!date) return "";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return timeStr;
    } else if (isYesterday) {
      return `Yesterday`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Initialize XMTP and load conversations
  // Uses the wallet address from wagmi (RainbowKit connection) - no need to create separate provider
  useEffect(() => {
    const initXMTP = async () => {
      // Use the connected wallet address from wagmi/RainbowKit
      if (!isConnected || !address) return;

      setIsLoadingConversations(true);
      setError(null);

      try {
        const walletAddress = address.toLowerCase();

        // Create identifier for Client.build using the wagmi-connected wallet
        const identifier: Identifier = {
          identifier: walletAddress,
          identifierKind: "Ethereum",
        };

        const dbPath = `xmtp-${walletAddress}`;

        let client: Client<any> | null = null;

        // Try to restore existing client
        try {
          const builtClient = await Client.build(identifier, {
            env: "dev",
            appVersion: "xao-cult/1.0.0",
            dbPath,
          });

          if (builtClient.inboxId) {
            try {
              await builtClient.conversations.sync();
              client = builtClient;
            } catch (syncErr: any) {
              console.log("Client.build() sync failed:", syncErr.message);
            }
          }
        } catch (buildErr) {
          console.log("Client.build() failed:", buildErr);
        }

        // If build failed, don't try to create a new client here
        // Direct user to Chat page which handles client creation and installation revocation
        if (!client) {
          console.log("No existing XMTP client found. User needs to visit Chat page first.");
          setError("Please visit the Chat page first to set up messaging.");
          setIsLoadingConversations(false);
          return;
        }

        setXmtpClient(client);

        // Load conversations
        await client.conversations.sync();
        const convos = await client.conversations.list();

        const previews: ConversationPreview[] = await Promise.all(
          convos.map(async (convo: any) => {
            let lastMessage = "";
            let lastMessageTime: Date | undefined;

            try {
              const msgs = await convo.messages({ limit: BigInt(5) });
              for (const msg of msgs) {
                if (typeof msg.content === "object" && msg.content !== null) {
                  if ("initiatedByInboxId" in msg.content) continue;
                  if ("membersAdded" in msg.content) continue;
                  if ("membersRemoved" in msg.content) continue;
                }
                if (typeof msg.content === "string") {
                  lastMessage = msg.content;
                } else if (msg.content?.text) {
                  lastMessage = msg.content.text;
                } else if (msg.content?.content) {
                  lastMessage = msg.content.content;
                } else {
                  continue;
                }
                lastMessageTime = msg.sentAtNs ? new Date(Number(msg.sentAtNs) / 1000000) : undefined;
                break;
              }
            } catch (e) {
              console.error("Error loading last message:", e);
            }

            let peerInboxId: string = "Unknown";
            try {
              let rawPeerInboxId = convo.peerInboxId;
              if (typeof rawPeerInboxId === "function") {
                rawPeerInboxId = rawPeerInboxId.call(convo);
              }
              if (rawPeerInboxId && typeof rawPeerInboxId === "object" && "then" in rawPeerInboxId) {
                rawPeerInboxId = await rawPeerInboxId;
              }
              peerInboxId = String(rawPeerInboxId || convo.id || "Unknown");
            } catch (e) {
              peerInboxId = String(convo.id || "Unknown");
            }

            let peerAddress: string | undefined;
            try {
              if (convo.peerAddresses && convo.peerAddresses.length > 0) {
                peerAddress = convo.peerAddresses[0];
              } else if (typeof convo.members === "function") {
                const members = await convo.members();
                const otherMember = members?.find((m: any) => m.inboxId !== client!.inboxId);
                if (otherMember?.accountIdentifiers?.length > 0) {
                  peerAddress = otherMember.accountIdentifiers[0].identifier;
                }
              }
            } catch (e) {
              console.debug("Could not resolve inbox ID to address:", e);
            }

            return {
              id: convo.id || peerInboxId,
              type: "conversation" as const,
              peerAddress,
              peerInboxId,
              lastMessage,
              lastMessageTime,
              conversation: convo,
            };
          })
        );

        // Sort by last message time
        previews.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });

        setConversations(previews);
      } catch (err: any) {
        console.error("Failed to initialize XMTP:", err);
        if (err.message?.includes("installations") || err.message?.includes("10/10")) {
          setError("Too many devices registered. Please visit the Chat page to resolve this.");
        } else {
          setError("Failed to load conversations");
        }
      } finally {
        setIsLoadingConversations(false);
      }
    };

    initXMTP();
  }, [isConnected, address]);

  // Load events when token IDs are available
  useEffect(() => {
    const loadEvents = async () => {
      if (!tokenIds || tokenIds.length === 0) {
        setEvents([]);
        return;
      }

      setIsLoadingEvents(true);

      // For now, we'll just create event previews from token IDs
      // In a real implementation, you'd fetch event contract data for each token
      const eventPreviews: EventPreview[] = tokenIds.map((tokenId, index) => ({
        id: `event-${tokenId.toString()}`,
        type: "event" as const,
        tokenId,
        party1: address || "",
        party2: "",
        terms: `Event #${tokenId.toString()}`,
        createdAt: new Date(),
        isSigned: false,
      }));

      setEvents(eventPreviews);
      setIsLoadingEvents(false);
    };

    loadEvents();
  }, [tokenIds, address]);

  // Filter items based on search query and active tab
  const filteredItems = useMemo(() => {
    let items: ListItem[] = [];

    if (activeTab === "all" || activeTab === "conversations") {
      items = [...items, ...conversations];
    }
    if (activeTab === "all" || activeTab === "events") {
      items = [...items, ...events];
    }

    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      if (item.type === "conversation") {
        return (
          item.peerAddress?.toLowerCase().includes(query) ||
          item.peerInboxId.toLowerCase().includes(query) ||
          item.lastMessage?.toLowerCase().includes(query)
        );
      } else {
        return (
          item.terms.toLowerCase().includes(query) ||
          item.party1.toLowerCase().includes(query) ||
          item.party2.toLowerCase().includes(query) ||
          item.tokenId.toString().includes(query)
        );
      }
    });
  }, [conversations, events, searchQuery, activeTab]);

  const isLoading = isLoadingConversations || isLoadingEvents || isLoadingTokenIds;

  return (
    <Layout>
      <div className={docStyles.searchhomeContainer}>
        <div className={styles.background} />

        <Head>
          <title>Search - XAO Cult</title>
          <meta name="description" content="Search conversations and events" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
          pageTitle="Search"
          rightIcon="/Chat-Section-Icons/Filter.svg"
          onRightIconClick={() => router.push("/chat-Section/Filter")}
        />
        <Scrollbar />
        <main className={docStyles.searchContainer}>
          {/* Search Bar */}
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
              placeholder="Search conversations & events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={docStyles.searchInput}
            />
          </div>

          {/* Tab Filters */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {(["all", "conversations", "events"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "none",
                  background: activeTab === tab
                    ? "linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)"
                    : "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  fontSize: "14px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Connect Wallet Prompt */}
          {!isConnected && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "20px" }}>
              <p style={{ color: "white", textAlign: "center" }}>Connect your wallet to view conversations and events</p>
              <ConnectButton />
            </div>
          )}

          {/* Loading State */}
          {isConnected && isLoading && (
            <div style={{ color: "white", textAlign: "center", padding: "20px" }}>
              Loading...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{ color: "#ff6b6b", textAlign: "center", padding: "20px" }}>
              {error}
            </div>
          )}

          {/* Empty State */}
          {isConnected && !isLoading && filteredItems.length === 0 && !error && (
            <div style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "20px" }}>
              {searchQuery ? "No results found" : "No conversations or events yet"}
            </div>
          )}

          {/* Results List */}
          {filteredItems.length > 0 && (
            <div className={docStyles.searchResultsContainer}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={docStyles.searchResultCard}
                  onClick={() => {
                    if (item.type === "conversation") {
                      router.push("/chat-Section/Chat");
                    } else {
                      router.push(`/contracts/contracts-detail?tokenId=${item.tokenId.toString()}`);
                    }
                  }}
                >
                  {/* Avatar/Icon */}
                  <div
                    className={docStyles.searchResultImage}
                    style={{
                      background: item.type === "conversation"
                        ? "linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)"
                        : "linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.type === "conversation" ? (
                      <span style={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
                        {((item as ConversationPreview).peerAddress || (item as ConversationPreview).peerInboxId || "?")
                          .slice(2, 4)
                          .toUpperCase()}
                      </span>
                    ) : (
                      <Image
                        src="/contracts-Icons/Vector (2).svg"
                        alt="Event"
                        width={24}
                        height={24}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className={docStyles.searchResultContent}>
                    <h3 className={docStyles.searchResultTitle}>
                      {item.type === "conversation"
                        ? truncateAddress((item as ConversationPreview).peerAddress || (item as ConversationPreview).peerInboxId)
                        : `Event #${(item as EventPreview).tokenId.toString()}`}
                    </h3>
                    <p className={docStyles.searchResultEvents}>
                      {item.type === "conversation"
                        ? (item as ConversationPreview).lastMessage || "No messages yet"
                        : (item as EventPreview).isSigned ? "Confirmed" : "Pending"}
                    </p>
                  </div>

                  {/* Time/Status */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <span style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                      {item.type === "conversation"
                        ? formatTime((item as ConversationPreview).lastMessageTime)
                        : formatTime((item as EventPreview).createdAt)}
                    </span>
                    <span style={{
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: item.type === "conversation"
                        ? "rgba(255, 138, 0, 0.2)"
                        : "rgba(0, 201, 255, 0.2)",
                      color: item.type === "conversation" ? "#FF8A00" : "#00C9FF",
                    }}>
                      {item.type === "conversation" ? "Chat" : "Event"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Chat Button */}
          {isConnected && (
            <button
              onClick={() => router.push("/chat-Section/Chat")}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "30px",
                border: "none",
                background: "linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)",
                color: "white",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                marginTop: "16px",
              }}
            >
              Start New Chat
            </button>
          )}
        </main>
      </div>
    </Layout>
  );
}
