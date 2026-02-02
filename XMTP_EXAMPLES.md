/**
 * XMTP Configuration Examples
 * Use these code snippets to customize your XMTP integration
 */

// ============================================================================
// Example 1: Change Network Environment
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx
// Function: initializeXMTP()

// DEVELOPMENT NETWORK (free, resets periodically)
const client = await Client.create(signer, {
  env: "dev",  // Use for testing
  appVersion: "xao-cult/1.0.0",
});

// PRODUCTION NETWORK (real messages, permanent)
const client2 = await Client.create(signer, {
  env: "production",  // Use for real usage
  appVersion: "xao-cult/1.0.0",
});

// LOCAL NETWORK (requires local node running)
const client3 = await Client.create(signer, {
  env: "local",  // Use for local development
  appVersion: "xao-cult/1.0.0",
});

// ============================================================================
// Example 2: Hardcode Recipient Instead of Using Selector
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx
// Function: initializeConversation()

const initializeConversation = async (client: Client<any>) => {
  try {
    // HARDCODED RECIPIENT (instead of from localStorage)
    const testRecipientInboxId = "YOUR_RECIPIENT_INBOX_ID_HERE";
    
    // Or get from environment variable
    const recipientFromEnv = process.env.NEXT_PUBLIC_XMTP_RECIPIENT_ID;
    
    // Or get from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const recipientFromUrl = urlParams.get("recipient");
    
    const finalRecipient = recipientFromEnv || recipientFromUrl || testRecipientInboxId;
    
    if (!finalRecipient) {
      setError("No recipient configured");
      return null;
    }

    const dm = await client.conversations.newDm(finalRecipient);
    setCurrentConversation(dm);
    
    // ... rest of function
  } catch (err) {
    console.error("Failed to initialize conversation:", err);
    setError("Failed to initialize conversation");
    return null;
  }
};

// ============================================================================
// Example 3: Load More Messages (Pagination)
// ============================================================================
// File: src/lib/xmtp.ts - Add new function

export const loadMoreMessages = async (
  conversation: any,
  currentMessages: any[]
): Promise<any[]> => {
  try {
    const newerMessages = await conversation.messages({ 
      limit: 50,  // Load 50 more
      beforeNs: currentMessages[0]?.sentAtNs || 0,  // Before oldest message
    });
    return [...newerMessages, ...currentMessages];
  } catch (error) {
    console.error("Error loading more messages:", error);
    return currentMessages;
  }
};

// ============================================================================
// Example 4: Custom Message Formatting
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx

// Add markdown support to messages
const formatMessageWithMarkdown = (content: string): string => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
    .replace(/~~(.*?)~~/g, '<strike>$1</strike>')      // Strikethrough
    .replace(/`(.*?)`/g, '<code>$1</code>')            // Code
    .replace(/\n/g, '<br />');                         // Line breaks
};

// Add emoji support
const addEmojiSupport = (content: string): string => {
  const emojiMap: { [key: string]: string } = {
    ":)": "😊",
    ":(": "😞",
    ":D": "😄",
    ":P": "😜",
    "<3": "❤️",
  };
  
  let formatted = content;
  Object.entries(emojiMap).forEach(([key, emoji]) => {
    formatted = formatted.replace(new RegExp(key, "g"), emoji);
  });
  return formatted;
};

// ============================================================================
// Example 5: Add Typing Indicators
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx

const [isTyping, setIsTyping] = useState(false);

const handleTyping = async () => {
  setIsTyping(true);
  
  // Clear typing indicator after 3 seconds of inactivity
  setTimeout(() => {
    setIsTyping(false);
  }, 3000);
};

const renderTypingIndicator = () => {
  if (!isTyping) return null;
  
  return (
    <div style={{ padding: "10px", color: "#999", fontSize: "12px" }}>
      Recipient is typing...
    </div>
  );
};

// ============================================================================
// Example 6: Add Message Reactions
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx (Requires @xmtp/content-type-reaction)

// First install: yarn add @xmtp/content-type-reaction

import { ReactionCodec } from "@xmtp/content-type-reaction";
import { ContentTypeReaction } from "@xmtp/content-type-reaction";

// Add to client initialization:
const client = await Client.create(signer, {
  env: "production",
  appVersion: "xao-cult/1.0.0",
  codecs: [new ReactionCodec()],  // Add reaction codec
});

// Send reaction:
const addReaction = async (messageId: string, emoji: string) => {
  const reaction = {
    reference: messageId,
    action: "added",
    content: emoji,
    schema: "unicode",
  };
  
  await currentConversation.send(reaction, {
    contentType: ContentTypeReaction,
  });
};

// ============================================================================
// Example 7: Add File Attachments
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx (Requires @xmtp/content-type-remote-attachment)

// First install: yarn add @xmtp/content-type-remote-attachment

import { AttachmentCodec, RemoteAttachmentCodec } from "@xmtp/content-type-remote-attachment";

// Add to client initialization:
const client = await Client.create(signer, {
  env: "production",
  appVersion: "xao-cult/1.0.0",
  codecs: [new AttachmentCodec(), new RemoteAttachmentCodec()],  // Add codecs
});

// Send file attachment:
const sendFileAttachment = async (file: File) => {
  const fileData = await file.arrayBuffer();
  const attachment = {
    filename: file.name,
    mimeType: file.type,
    data: new Uint8Array(fileData),
  };
  
  await currentConversation.send(attachment, {
    contentType: ContentTypeAttachment,
  });
};

// ============================================================================
// Example 8: Error Recovery & Retry Logic
// ============================================================================
// File: src/lib/xmtp.ts - Add new function

export const sendMessageWithRetry = async (
  conversation: any,
  messageContent: string,
  maxRetries: number = 3
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await conversation.send(messageContent);
      return true;
    } catch (error) {
      console.error(`Send attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
        );
      } else {
        console.error("Message send failed after all retries");
        return false;
      }
    }
  }
  return false;
};

// ============================================================================
// Example 9: User Presence/Online Status
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx

const [isRecipientOnline, setIsRecipientOnline] = useState(false);

useEffect(() => {
  // Check if conversation has recent activity
  const checkPresence = async () => {
    if (!currentConversation) return;
    
    const recentMessages = await currentConversation.messages({ limit: 1 });
    if (recentMessages.length > 0) {
      const lastMessage = recentMessages[0];
      const messageAge = Date.now() - (lastMessage.sentAtNs / 1000000);
      const fiveMinutesMs = 5 * 60 * 1000;
      
      setIsRecipientOnline(messageAge < fiveMinutesMs);
    }
  };
  
  checkPresence();
  const interval = setInterval(checkPresence, 10000);  // Check every 10 seconds
  
  return () => clearInterval(interval);
}, [currentConversation]);

// ============================================================================
// Example 10: Message Search & Filter
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx - Add new function

const searchMessages = (searchTerm: string): MessageWithMetadata[] => {
  return messages.filter(msg => {
    const content = typeof msg.content === 'string' 
      ? msg.content.toLowerCase() 
      : JSON.stringify(msg.content).toLowerCase();
    
    return content.includes(searchTerm.toLowerCase());
  });
};

const filterMessagesByDate = (date: Date): MessageWithMetadata[] => {
  return messages.filter(msg => {
    const messageDate = new Date(msg.sentAtNs / 1000000);
    return messageDate.toDateString() === date.toDateString();
  });
};

// ============================================================================
// Example 11: Consent Preferences
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx (XMTP v3+ feature)

import { ConsentState, ConsentEntityType } from "@xmtp/browser-sdk";

const setConsentPreference = async (
  recipientInboxId: string,
  state: "allowed" | "denied" | "unknown"
) => {
  if (!xmtpClient) return;
  
  await xmtpClient.setConsentStates([
    {
      entityId: recipientInboxId,
      entityType: ConsentEntityType.InboxId,
      state: state === "allowed" 
        ? ConsentState.Allowed 
        : state === "denied"
        ? ConsentState.Denied
        : ConsentState.Unknown,
    },
  ]);
};

// ============================================================================
// Example 12: Integration with Your Backend
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx

const logMessageToBackend = async (message: MessageWithMetadata) => {
  try {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderInboxId: message.senderInboxId,
        content: message.content,
        sentAt: new Date(message.sentAtNs / 1000000),
        conversationId: currentConversation.id,
      }),
    });
  } catch (error) {
    console.error("Failed to log message to backend:", error);
  }
};

// Call this when message is received:
useEffect(() => {
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    logMessageToBackend(lastMessage);
  }
}, [messages]);

// ============================================================================
// Example 13: Performance Monitoring
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx

const [metrics, setMetrics] = useState({
  clientInitTime: 0,
  conversationInitTime: 0,
  messageLoadTime: 0,
  averageSendTime: 0,
});

const measurePerformance = async (label: string, fn: () => Promise<void>) => {
  const start = performance.now();
  await fn();
  const duration = performance.now() - start;
  
  console.log(`${label} took ${duration.toFixed(2)}ms`);
  
  return duration;
};

// ============================================================================
// Example 14: Export Messages
// ============================================================================
// File: src/lib/xmtp.ts - Add new function

export const exportMessagesAsJSON = (messages: MessageWithMetadata[]): string => {
  const exportData = {
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map(msg => ({
      sender: msg.senderName,
      content: msg.content,
      timestamp: new Date(msg.sentAtNs / 1000000).toISOString(),
      isSent: msg.isSent,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
};

export const downloadExport = (messages: MessageWithMetadata[]) => {
  const data = exportMessagesAsJSON(messages);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chat-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// Example 15: Multi-Language Support
// ============================================================================
// File: src/pages/chat-Section/Chat.tsx

const translations = {
  en: {
    loading: "Loading XMTP client...",
    noMessages: "No messages yet. Start a conversation!",
    error: "Error",
    setRecipient: "Set Chat Recipient",
  },
  es: {
    loading: "Cargando cliente XMTP...",
    noMessages: "Sin mensajes aún. ¡Inicia una conversación!",
    error: "Error",
    setRecipient: "Establecer destinatario de chat",
  },
};

const [language, setLanguage] = useState("en");
const t = translations[language as keyof typeof translations];

// ============================================================================
// Notes
// ============================================================================

/**
 * These are just examples! Choose the features that make sense for your app.
 * 
 * Most require additional dependencies to be installed:
 * - Reactions: yarn add @xmtp/content-type-reaction
 * - Attachments: yarn add @xmtp/content-type-remote-attachment
 * - Replies: yarn add @xmtp/content-type-reply
 * - Read Receipts: yarn add @xmtp/content-type-read-receipt
 * 
 * Always test new features thoroughly before deploying to production!
 */
