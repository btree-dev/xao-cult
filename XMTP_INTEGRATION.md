# XMTP Chat Integration Guide

## Overview
Your chat section has been integrated with XMTP (Extensible Message Transport Protocol), enabling end-to-end encrypted, decentralized messaging powered by web3 wallets.

## Features Implemented

✅ **XMTP Client Initialization**
- Automatic initialization on component mount
- Uses MetaMask wallet for authentication
- Supports both development and production networks

✅ **Message Streaming**
- Real-time message reception
- Automatic scrolling to latest messages
- Message history loading (last 50 messages)

✅ **Message Sending**
- Send encrypted messages via XMTP network
- Error handling and loading states
- Support for text content

✅ **User Integration**
- Display sender information with messages
- Profile picture and username support
- Distinguish between sent and received messages

## Setup Instructions

### 1. Environment Requirements
- MetaMask wallet extension installed in browser
- Ethereum wallet with some ETH for gas (on production network)
- Latest version of your browser

### 2. Configure Recipient
Before using the chat, you need to set the recipient inbox ID. Add this to your chat initialization:

```typescript
// In localStorage or your database
localStorage.setItem("chatRecipientInboxId", "recipient-inbox-id");
```

To get a recipient's XMTP inbox ID:
1. They need to have used an XMTP-enabled app at least once
2. You can use XMTP's identity resolution tools
3. See XMTP docs for details: https://docs.xmtp.org/chat-apps/core-messaging/create-conversations

### 3. Network Configuration
The chat is currently set to use the **production** XMTP network. To change it:

In `src/pages/chat-Section/Chat.tsx`, modify the `initializeXMTP` function:
```typescript
const client = await Client.create(signer, {
  env: "production", // Change to "dev" or "local" as needed
  appVersion: "xao-cult/1.0.0",
});
```

### 4. Testing with Local Development

To test with a local XMTP node:
1. Set up local node: https://github.com/xmtp/xmtp-local-node
2. Change `env` to `"local"` in Chat.tsx
3. Access via http://localhost:5050

## File Structure

```
src/
├── lib/
│   └── xmtp.ts                    # XMTP utilities and helpers
├── pages/
│   └── chat-Section/
│       └── Chat.tsx               # Main chat component with XMTP integration
└── styles/
    └── CreateContract.module.css  # Existing styles (unchanged)
```

## How It Works

### 1. Initialization Flow
```
Component Mount
    ↓
Create Web3 Signer (MetaMask)
    ↓
Initialize XMTP Client
    ↓
Create/Find DM Conversation
    ↓
Load Message History
    ↓
Stream New Messages Real-Time
```

### 2. Message Sending Flow
```
User Types Message
    ↓
Clicks Send / Presses Enter
    ↓
handleSend() called
    ↓
Message sent to XMTP Network
    ↓
Message added to local state
    ↓
UI updates automatically
```

### 3. Message Receiving Flow
```
XMTP Network
    ↓
Message Stream Active
    ↓
New message arrives
    ↓
Formatted with metadata
    ↓
Added to state
    ↓
UI updates automatically
    ↓
Auto-scroll to latest
```

## API Reference

### Main Component Props
The Chat component accepts no props and manages all state internally.

### State Variables
- `xmtpClient` - Active XMTP client instance
- `currentConversation` - Active conversation/DM
- `messages` - Array of messages with metadata
- `isLoading` - Loading state
- `error` - Error messages

### Functions

#### `initializeXMTP(signer)`
Initialize XMTP client with a signer
```typescript
await initializeXMTP(signer);
```

#### `initializeConversation(client)`
Create or fetch a conversation
```typescript
const dm = await initializeConversation(client);
```

#### `loadMessages(conversation)`
Load message history
```typescript
await loadMessages(currentConversation);
```

#### `streamMessages(conversation)`
Stream new messages in real-time
```typescript
await streamMessages(currentConversation);
```

#### `handleSend()`
Send a message
```typescript
await handleSend();
```

## Utility Functions (src/lib/xmtp.ts)

### `createSigner()`
Create an XMTP signer from MetaMask
```typescript
const signer = await createSigner();
```

### `initializeXMTPClient(signer, env)`
Initialize XMTP client
```typescript
const client = await initializeXMTPClient(signer, "production");
```

### `formatMessageContent(content)`
Format message for display
```typescript
const text = formatMessageContent(message.content);
```

### `saveRecipientInboxId(inboxId)`
Save recipient inbox ID
```typescript
saveRecipientInboxId("recipient-inbox-id");
```

### `getRecipientInboxId()`
Get saved recipient inbox ID
```typescript
const id = getRecipientInboxId();
```

### `canUserReceiveMessages(address)`
Check if an address can receive XMTP messages
```typescript
const canReceive = await canUserReceiveMessages("0x...");
```

## Error Handling

The component includes error handling for:
- MetaMask not connected
- XMTP client initialization failures
- Conversation creation failures
- Message sending failures
- Network issues

Errors are displayed in the UI with user-friendly messages.

## Security Considerations

✅ **End-to-End Encrypted**
- All messages are encrypted before transmission
- Only recipients can decrypt messages

✅ **Web3 Authentication**
- Uses blockchain wallet signatures
- No centralized authentication required

✅ **User Control**
- Users control their own encryption keys
- Messages stored locally and on decentralized network

## Performance Optimization

- Messages loaded in batches (limit of 50)
- Real-time streaming for new messages
- Auto-scrolling only on new messages
- Error states don't block messaging

## Next Steps

1. **Set Recipient Inbox ID**
   - Get a test recipient's XMTP inbox ID
   - Set it in localStorage or your database
   - Start messaging

2. **Customize UI**
   - Modify message bubble styles in styles/CreateContract.module.css
   - Add typing indicators
   - Add read receipts

3. **Add Features**
   - Message reactions
   - File attachments
   - Group conversations
   - User consent preferences
   - Push notifications

4. **Production Setup**
   - Set up XMTP Gateway Service for paid messaging
   - Configure funding portal
   - Set up proper error tracking
   - Add authentication layer

## Useful Resources

- **XMTP Documentation**: https://docs.xmtp.org/
- **Browser SDK Docs**: https://docs.xmtp.org/chat-apps/sdks/browser
- **Create Signer Guide**: https://docs.xmtp.org/chat-apps/core-messaging/create-a-signer
- **Create Client Guide**: https://docs.xmtp.org/chat-apps/core-messaging/create-a-client
- **Send Messages Guide**: https://docs.xmtp.org/chat-apps/core-messaging/send-messages
- **xmtp.chat Demo**: https://xmtp.chat/

## Troubleshooting

### "MetaMask not found"
- Install MetaMask extension
- Refresh the page

### "Failed to initialize XMTP client"
- Ensure MetaMask is connected to a wallet
- Check network connectivity
- Try switching to a different network in MetaMask

### "No recipient set"
- Set recipient inbox ID: `localStorage.setItem("chatRecipientInboxId", "inbox-id")`
- Ensure recipient has used an XMTP app before

### "Failed to send message"
- Check if conversation is initialized
- Ensure sufficient gas (for first-time setup)
- Verify network connection

### Messages not appearing
- Check browser console for errors
- Ensure both users are on the same XMTP network (dev/production)
- Try refreshing the page

## Support

For issues or questions:
1. Check the XMTP documentation
2. Review error messages in browser console
3. Open an issue in your repository
4. Contact XMTP support at https://community.xmtp.org/

## License

This integration follows your project's existing license terms.
