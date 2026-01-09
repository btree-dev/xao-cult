import React, { useEffect, useRef, useState } from "react";
import styles from "../../styles/CreateContract.module.css";

const ContractChat: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([...messages, message]);
      setMessage("");
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        <div className={styles.RecievedMessage}>
          Hey! Let&apos;s discuss the contract terms.
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
          <input
            type="text"
            placeholder="Message"
            className={styles.input}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          />
          <span className={styles.chatInputIcons}>
            <img src="/contracts-Icons/Frame.svg" alt="Frame" width={28} height={28} />
            <img
              src="/contracts-Icons/Group 7.svg"
              alt="Group7"
              width={28}
              height={28}
            />
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
    </div>
  );
};

export default ContractChat;
