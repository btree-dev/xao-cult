# Messaging (Waku) — Product Status Summary

**Date:** 2026-07-02
**Audience:** Product / non-technical
**Subject:** Replacing our current chat (XMTP) with the new Waku messaging system

---

## The one-paragraph version

We're moving our in-app messaging off the current system (XMTP) and onto a new,
more decentralized system called **Waku**. The Waku version has been started and
has a solid working foundation — it can do private text chat with a smoother
sign-in. However, it does **not yet do the most important part of our workflow:
sending, viewing, and negotiating an actual event contract** between an artist
and a venue. It also currently requires **both people to be online at the same
time**. That means Waku is **on track but not yet ready to fully take over** — it
covers basic chat, not contract negotiation.

---

## ⚠️ Important limitation to be aware of right now

> **Both parties must be online at the same time for messaging to work today.**
> If one person sends a message while the other is offline, that message is
> **lost** — it is not delivered when they come back. Reliable, store-and-forward
> delivery (like normal messaging apps) is planned but not yet built.

---

## What Waku can do today

- ✅ **Private text chat** between the parties on an event contract.
- ✅ **A smoother sign-in** — the user confirms once per day, then messages
  freely without repeated wallet prompts.
- ✅ **Messages are encrypted** and each is verifiably tied to the sender who
  wrote it.
- ✅ **No transaction fees** for messaging — sending is free.

## What Waku cannot do yet

- ❌ **Send an event contract to the other party** — this, our core use case, is
  not built. Chat is text-only.
- ❌ **View, modify, or counter-offer on contract terms** in the chat — shows a
  "coming soon" placeholder instead.
- ❌ **Deliver messages when the other person is offline** — both parties must be
  online at the same time, or the message is lost. *(See the limitation box above.)*
- ❌ **Keep chat history** — conversations disappear if the page is refreshed;
  nothing is saved yet.
- ❌ **Start a conversation before a contract exists** — a chat only exists once
  an event contract has been created.
- ❌ **Browse a list of conversations** — chat is reachable only from within a
  specific contract.
- ⚠️ **Strong privacy** — messages are encrypted, but not yet to the level we'd
  want for production; a stronger method is planned.

---

## How to read this

Think of the Waku replacement as **partway up the hill**:

| Capability needed to fully replace our chat | Waku status |
|---|---|
| Private text chat | ✅ Done |
| Smooth, low-friction sign-in | ✅ Done (better than before) |
| **Send an event contract** | ❌ Not yet |
| **Negotiate / modify contract terms** | ❌ Not yet |
| **Works when the other party is offline** | ❌ Not yet — both must be online together |
| Saved conversation history | ❌ Not yet |
| Browse all conversations | ❌ Not yet |
| Production-grade privacy | ⚠️ Partial |

---

## The headline for product

> **Waku today = private text chat with a better sign-in, and only while both
> people are online at the same time.** The feature that actually drives our
> business — **sending and negotiating a contract between an artist and a
> venue** — is not yet implemented in Waku. The technical foundation is sound and
> well-tested, but several substantial pieces remain before Waku can fully
> replace our current messaging.

## What "done" still requires

To make Waku a complete replacement, the remaining work (in planned phases) is:

1. **Contract sending & negotiation** in chat — the biggest gap.
2. **Offline / delayed message delivery** — so both parties no longer need to be
   online simultaneously.
3. **Saved message history.**
4. **Stronger encryption / privacy.**
5. **A conversations list**, and the ability to start a chat before a contract
   exists.
