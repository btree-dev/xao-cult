import React, { useEffect, useRef, useState } from "react";
import BackNavbar from "../../components/BackNav";
import Layout from "../../components/Layout";
import Head from "next/head";
import styles from "../../styles/CreateContract.module.css";
import { supabase } from "../../lib/supabase";


const Chat: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [userName, setUserName] = useState("User");
  const [userImage, setUserImage] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        let profileData = null;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            profileData = data;
            setUserName(profileData.username || "User");
            setUserImage(profileData.profile_picture_url || '/Chat-Section-Icons/Image 1.svg');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } catch (error) {
        console.error('Error in chat:', error);
      }
    };

    getUser();
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([...messages, message]);
      setMessage("");
      // Keep focus on input to prevent keyboard from closing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <Head>
          <title>Notification Chat - XAO Cult</title>
          <meta name="description" content="Chat" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <BackNavbar
          userName={userName}
          userImage={userImage}
          rightIcon="/Chat-Section-Icons/Search_Magnifying_Glass.svg"
        />
        
        <main className={styles.chatMain}>
        <div className={styles.messagesContainer}>
            <div className={styles.RecievedMessage}>
              I commented on Figma, I want to add some fancy icons. Do you have any icon set?
            </div>
            {messages.map((msg, idx) => (
              <div key={idx} className={styles.sentMessage}>
                {msg}
              </div>
            ))}
            <div ref={messagesEndRef} />
            
        </div>
        
          <div className={styles.messageInputContainer}>
            <div className={styles.messageInput}>
              <img
                src="/Chat-Section-Icons/Frame.svg"
                alt="Frame"
                width={24}
                height={24}
                style={{ cursor: "pointer" }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Message"
                className={styles.input}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <span className={styles.chatInputIcons}>
              <img
                src="/contracts-Icons/Group 6.svg"
                alt="Group6"
                width={28}
                height={28}
                style={{ cursor: "pointer" }}
                onClick={handleSend}
              />
            </span>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Chat;