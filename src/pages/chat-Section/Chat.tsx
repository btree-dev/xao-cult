import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { supabase } from "../../lib/supabase";
import { ChatComponent } from "../../components/Chat";

// Truncate address for display
const truncateAddress = (address: string | unknown): string => {
  if (!address || typeof address !== "string") return "Unknown";
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const Chat: React.FC = () => {
  const router = useRouter();
  const { peer: peerParam } = router.query;

  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);

  // Get peer address from URL
  const peerAddress = peerParam ? decodeURIComponent(String(peerParam)) : null;

  // Get user profile for navbar
  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setUserName(data.username || "User");
          setUserImage(data.profile_picture_url || "/Chat-Section-Icons/Image 1.svg");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    getUser();
  }, []);

  const handleBack = () => {
    router.push("/chat-Section/Search");
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Chat - XAO Cult</title>
          <meta name="description" content="Chat" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
          userName={peerAddress ? truncateAddress(peerAddress) : userName}
          userImage={userImage}
          onBackClick={handleBack}
        />

        <ChatComponent peerAddress={peerAddress} onBack={handleBack} embedded={false} />
      </div>
    </Layout>
  );
};

export default Chat;
