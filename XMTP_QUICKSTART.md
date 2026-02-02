# XMTP Chat Integration - Quick Start Guide

## What Was Added

Your chat section now has full XMTP (Extensible Message Transport Protocol) integration, enabling end-to-end encrypted messaging powered by blockchain wallets.

## New Files

1. **src/lib/xmtp.ts** - XMTP utility functions and helpers
2. **src/components/RecipientSelector.tsx** - Component to set chat recipient
3. **XMTP_INTEGRATION.md** - Full integration documentation
4. **Updated: src/pages/chat-Section/Chat.tsx** - Main chat component with XMTP

## Key Features

✅ **End-to-End Encrypted Messaging** - All messages encrypted before transmission
✅ **Web3 Authentication** - Uses MetaMask wallet signatures
✅ **Real-Time Message Streaming** - Messages appear instantly
✅ **Message History** - Auto-loads last 50 messages
✅ **User Profiles** - Displays sender information with messages
✅ **Error Handling** - User-friendly error messages
✅ **Loading States** - Clear loading indicators

## Installation Steps

### 1. Dependencies Already Installed
The XMTP Browser SDK has been installed. Verify it's in your package.json:
```bash
yarn list @xmtp/browser-sdk
```

### 2. Test the Chat

#### Step 1: Start Your App
```bash
yarn dev
```

#### Step 2: Connect MetaMask
- Go to http://localhost:3000 (or your dev URL)
- Navigate to the chat section
- MetaMask will prompt you to connect

#### Step 3: Set Recipient
- Click "Set Chat Recipient" button
- Enter a test recipient's XMTP inbox ID
  - To get a test inbox ID, see "Getting Test Inbox IDs" below

#### Step 4: Start Chatting
- Type a message and press Enter or click Send
- Message will be encrypted and sent to the recipient
- Both users will see messages in real-time

## Getting Test Inbox IDs

### Option 1: Use xmtp.chat (Official Test App)
1. Visit https://xmtp.chat
2. Connect with your MetaMask
3. Your inbox ID will be displayed
4. Share it with your test partner

### Option 2: Extract from This App
When your chat initializes:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `console.log(document.querySelector('[data-inbox-id]')?.innerHTML)`
4. Share this ID with others

### Option 3: Use Web3 Tools
You can programmatically get an inbox ID:
```typescript
import { Client } from "@xmtp/browser-sdk";

const inboxIds = await Client.inboxStateFromInboxIds(["0x...address"], "production");
```

## Common Tasks

### Change Network (Dev vs Production)

In `src/pages/chat-Section/Chat.tsx`, find the `initializeXMTP` function:

**For Development Network (free, resets often):**
```typescript
const client = await Client.create(signer, {
  env: "dev",  // Changed from "production"
  appVersion: "xao-cult/1.0.0",
});
```

**For Production Network (real messages):**
```typescript
const client = await Client.create(signer, {
  env: "production",  // Default
  appVersion: "xao-cult/1.0.0",
});
```

### Disable the Recipient Selector

If you want to hardcode a recipient instead of using the selector:

In `src/pages/chat-Section/Chat.tsx`, modify `initializeConversation`:

```typescript
const initializeConversation = async (client: Client<any>) => {
  try {
    // CHANGE THIS LINE:
    const testRecipientInboxId = "your-hardcoded-inbox-id"; // Instead of localStorage
    
    if (!testRecipientInboxId) {
      console.log("No recipient set.");
      return null;
    }
    // ... rest of function
```

### Add Custom Message Formatting

To add emojis, links, or other formatting to messages, modify the message display in Chat.tsx:

```typescript
{messages.map((msg, idx) => (
  <div key={idx} className={msg.isSent ? styles.sentMessage : styles.RecievedMessage}>
    <div style={{ fontSize: "12px", color: "#999", marginBottom: "4px" }}>
      {msg.senderName}
    </div>
    {/* ADD CUSTOM FORMATTING HERE */}
    {typeof msg.content === 'string' 
      ? msg.content.replace(/\n/g, '<br />') 
      : JSON.stringify(msg.content)}
  </div>
))}
```

## Testing Checklist

- [ ] MetaMask connects successfully
- [ ] Chat loads without errors
- [ ] Can set a recipient inbox ID
- [ ] Can type and send a message
- [ ] Sent message appears in chat
- [ ] Recipient receives message in real-time
- [ ] Message history loads on reconnect
- [ ] Scrolls to newest message automatically
- [ ] Error messages display properly

## Troubleshooting

### Issue: "MetaMask not found"
**Solution:** 
- Install MetaMask extension
- Refresh the browser
- Check if MetaMask is enabled in browser settings

### Issue: "Failed to initialize XMTP client"
**Solution:**
- Ensure MetaMask is connected to a wallet
- Check internet connection
- Try a different browser
- Check browser console for detailed error

### Issue: "No recipient set"
**Solution:**
- Click "Set Chat Recipient" button
- Get a valid XMTP inbox ID (see "Getting Test Inbox IDs")
- Make sure recipient has used XMTP before

### Issue: Messages not sending
**Solution:**
- Verify conversation is initialized (no "No recipient set" message)
- Check browser console for errors
- Ensure sufficient wallet balance (may need ETH for gas)
- Try refreshing the page

### Issue: Messages not appearing in real-time
**Solution:**
- Check both users are on the same network (dev vs production)
- Try refreshing the page
- Check internet connection
- Look for errors in browser DevTools

## Code Examples

### Send a Message Programmatically

```typescript
import { Client } from "@xmtp/browser-sdk";

// After initializing client and conversation
await conversation.send("Hello XMTP!");
```

### Load Message History

```typescript
const messages = await conversation.messages({
  limit: 100n,  // Get last 100 messages
});
```

### Stream Messages in Real-Time

```typescript
const stream = await conversation.streamMessages();
for await (const message of stream) {
  console.log("New message:", message.content);
}
```

### Check if User Can Receive Messages

```typescript
const canReceive = await Client.canMessage([
  {
    identifier: "0x...",
    identifierKind: "Ethereum",
  },
]);
```

## Next Steps

### Immediate Improvements
1. **Add Typing Indicators** - Show when other person is typing
2. **Message Reactions** - Add emoji reactions to messages
3. **File Sharing** - Share images and documents
4. **Read Receipts** - Show when messages are read

### Medium-Term Features
1. **Group Chats** - Multiple participants
2. **Voice/Video** - Integrate with WebRTC
3. **Message Search** - Search through history
4. **User Profiles** - Click to view full profiles

### Production Setup
1. **XMTP Gateway Service** - For non-web3-native users
2. **Message Fees** - Set up funding for message costs
3. **Analytics** - Track message metrics
4. **Backup/Recovery** - User message backup system

## Security Notes

🔒 **Encryption**: All messages encrypted end-to-end
🔒 **Authentication**: Uses wallet signatures (no passwords)
🔒 **Privacy**: Messages stored on decentralized network
🔒 **Control**: Users control their own encryption keys

## Important Links

- **XMTP Docs**: https://docs.xmtp.org/
- **Browser SDK**: https://docs.xmtp.org/chat-apps/sdks/browser
- **Official Chat**: https://xmtp.chat/
- **Community Forum**: https://community.xmtp.org/
- **GitHub**: https://github.com/xmtp/

## Support

### Getting Help
1. Check XMTP documentation
2. Review browser console errors
3. Ask in XMTP community forums
4. Open issue in your repository

### Reporting Issues
Include:
- Browser name and version
- MetaMask version
- Error message from console
- Steps to reproduce

## Configuration Reference

### Client Options

```typescript
{
  env: "production",              // "local", "dev", or "production"
  appVersion: "xao-cult/1.0.0",  // Your app version string
  // Optional: override API endpoints
  // apiUrl: "https://...",
  // historySyncUrl: "https://...",
}
```

### Message Limits

- Maximum message size: 1 MB
- Default history load: 50 messages
- Rate limits: 20,000 reads, 3,000 writes per 5 min

## License

Follow your project's existing license terms.

---

**Happy Messaging! 🚀**
