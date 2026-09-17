// In-app notification model. Everything is DERIVED client-side from data the
// app already holds (on-chain contracts/tickets, Waku chat, tx history) — there
// is no server or push transport in this MVP (client decision): notifications
// are computed when the user opens the app and rendered in the bell-icon center.

export type NotifCategory = 'contract' | 'ticket' | 'chat' | 'transaction';

export interface NotificationItem {
  /** Deterministic, stable per underlying event — the SAME event must always
   *  produce the SAME id, so read/seen state (localStorage) survives re-derives
   *  and the item isn't shown as "new" twice. */
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  /** When the event is/became relevant (ms). Drives sort order (newest first). */
  timestampMs: number;
  /** In-app deep link to the exact screen this notification is about. */
  href: string;
  /** Optional icon path (public/). */
  icon?: string;
}

/** Normalized per-contract facts the derive step needs. All times are unix
 *  SECONDS (as returned on-chain); derive converts. Schedules are optional —
 *  when a field is absent (not read / not set) its notifications simply don't
 *  emit, so the engine degrades gracefully. */
export interface ContractNotifInput {
  contractAddress: string;
  party1: string;
  party2: string;
  eventName: string;
  status: number;            // ShowContract Status enum
  showDate: number;          // eventStartDate, unix seconds
  loadInTime?: number;       // unix seconds
  doorsTime?: number;        // unix seconds
  setTime?: number;          // unix seconds
  /** My side's deposit due entries (unix seconds). "guarantee" reminders. */
  myDepositsDue?: number[];
  /** My side's payout entries (unix seconds). */
  myPayoutsDue?: number[];
}

export interface TicketNotifInput {
  contractAddress: string;
  tokenId: string;
  eventName: string;
  showDate: number;   // unix seconds
  doorsTime?: number; // unix seconds
}

export interface ChatNotifInput {
  threadId: string;
  peer: string;
  lastActivityMs: number;
  preview?: string;
}

export interface TxNotifInput {
  hash: string;
  kind: 'received' | 'sent' | 'swap' | 'payment';
  timestampMs: number;
  summary: string;
}

export interface DeriveInput {
  nowMs: number;
  contracts: ContractNotifInput[];
  tickets: TicketNotifInput[];
  chat: ChatNotifInput[];
  transactions: TxNotifInput[];
}
