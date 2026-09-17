import type {
  DeriveInput, NotificationItem, ContractNotifInput, TicketNotifInput,
} from './types';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// How long a time-based notification stays visible after its moment passed, so
// the list shows what JUST happened without accumulating ancient events.
const SHOW_AFTER = DAY;
// Chat/tx recency — older than this isn't surfaced as a notification.
const CHAT_WINDOW = 30 * DAY;
const TX_WINDOW = 30 * DAY;

const ICONS = {
  bell: '/Chat-Section-Icons/Bell.svg',
  mail: '/Chat-Section-Icons/Mail.svg',
  card: '/Chat-Section-Icons/Credit_Card_01.svg',
  doc: '/Chat-Section-Icons/File_Document.svg',
};

const sec = (s: number) => s * 1000;
const isWithin = (nowMs: number, momentMs: number, after = SHOW_AFTER) =>
  nowMs >= momentMs && nowMs - momentMs <= after;

/** Local wall-clock time for `hour` on the calendar day of a unix-seconds ts —
 *  uses the runtime timezone so "8am morning of" is the viewer's 8am. */
function localDayAt(showDateSec: number, hour: number): number {
  const d = new Date(sec(showDateSec));
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

const contractHref = (addr: string) =>
  `/contracts/contracts-detail?id=${addr}&source=notification`;

// ShowContract Status enum: 0 Draft,1 Proposed,2 Counter-Proposed,3 Approved,
// 4 Active,5 Completed,6 Cancelled,7 Disputed.
function contractStatusNotif(
  c: ContractNotifInput, nowMs: number, myAddress: string,
): NotificationItem | null {
  const iAmParty2 = c.party2.toLowerCase() === myAddress.toLowerCase();
  const base = { category: 'contract' as const, timestampMs: nowMs, href: contractHref(c.contractAddress), icon: ICONS.bell };
  switch (c.status) {
    case 1: // Proposed — the counterparty sent it to me
      return iAmParty2
        ? { ...base, id: `${c.contractAddress}-status-1`, title: 'New contract received', body: `${c.eventName} — review and respond.` }
        : null;
    case 2: // Counter-proposed — an edit came back
      return { ...base, id: `${c.contractAddress}-status-2`, title: 'Contract edit received', body: `${c.eventName} — the other party proposed changes.` };
    case 3: // Approved — both signed
      return { ...base, id: `${c.contractAddress}-status-3`, title: 'Contract signed', body: `${c.eventName} is fully signed.` };
    case 4: // Active — event is live
      return { ...base, id: `${c.contractAddress}-status-4`, title: 'Event is live', body: `${c.eventName} is now active.` };
    case 6: // Cancelled
      return { ...base, id: `${c.contractAddress}-status-6`, title: 'Event canceled', body: `${c.eventName} has been canceled.`, icon: ICONS.doc };
    default:
      return null;
  }
}

function contractTimeNotifs(c: ContractNotifInput, nowMs: number): NotificationItem[] {
  const out: NotificationItem[] = [];
  const href = contractHref(c.contractAddress);
  const name = c.eventName;

  // NOTE: deposit-deadline / pay-in / payout notifications are intentionally
  // skipped for now — the on-chain deposit mechanic (auto-pull vs. pay-by-
  // deadline reminder) is still unconfirmed with the client. The rules live in
  // git history and can be re-enabled once that's settled.

  // Event day — 8am local on the show date.
  if (c.showDate > 0) {
    const eightAm = localDayAt(c.showDate, 8);
    if (isWithin(nowMs, eightAm)) {
      out.push({ id: `${c.contractAddress}-eventday`, category: 'contract', title: 'Event day', body: `${name} is today.`, timestampMs: eightAm, href, icon: ICONS.bell });
    }
  }

  // Load-in (exact).
  if (c.loadInTime && isWithin(nowMs, sec(c.loadInTime))) {
    out.push({ id: `${c.contractAddress}-loadin`, category: 'contract', title: 'Load-in time', body: `${name}: load-in has started.`, timestampMs: sec(c.loadInTime), href, icon: ICONS.bell });
  }

  // Doors (exact).
  if (c.doorsTime && isWithin(nowMs, sec(c.doorsTime))) {
    out.push({ id: `${c.contractAddress}-doors`, category: 'contract', title: 'Doors are open', body: `${name}: doors are open.`, timestampMs: sec(c.doorsTime), href, icon: ICONS.bell });
  }

  // Set time — 15 minutes before.
  if (c.setTime) {
    const setMs = sec(c.setTime);
    const warnMs = setMs - 15 * MIN;
    if (nowMs >= warnMs && nowMs - setMs <= SHOW_AFTER) {
      const soon = nowMs < setMs;
      out.push({ id: `${c.contractAddress}-settime`, category: 'contract', title: soon ? 'Set time in 15 minutes' : 'Set time', body: `${name}: ${soon ? 'the set starts in about 15 minutes.' : 'set time has started.'}`, timestampMs: warnMs, href, icon: ICONS.bell });
    }
  }

  return out;
}

function ticketNotifs(t: TicketNotifInput, nowMs: number): NotificationItem[] {
  const out: NotificationItem[] = [];
  const href = `/stats/tickets/${t.contractAddress}?source=notification`;
  if (t.showDate > 0) {
    const eightAm = localDayAt(t.showDate, 8);
    if (isWithin(nowMs, eightAm)) {
      out.push({ id: `ticket-${t.contractAddress}-${t.tokenId}-today`, category: 'ticket', title: 'Your show is today', body: `${t.eventName} is today — see you there!`, timestampMs: eightAm, href, icon: ICONS.bell });
    }
  }
  if (t.doorsTime && isWithin(nowMs, sec(t.doorsTime))) {
    out.push({ id: `ticket-${t.contractAddress}-${t.tokenId}-doors`, category: 'ticket', title: 'Doors are open', body: `${t.eventName}: doors are open.`, timestampMs: sec(t.doorsTime), href, icon: ICONS.bell });
  }
  return out;
}

/** Pure: turn the aggregated data snapshot into the notification list, newest
 *  first. Deterministic for a given input (ids are stable), so read-state holds. */
export function deriveNotifications(input: DeriveInput, myAddress: string): NotificationItem[] {
  const { nowMs } = input;
  const items: NotificationItem[] = [];

  for (const c of input.contracts) {
    const s = contractStatusNotif(c, nowMs, myAddress);
    if (s) items.push(s);
    items.push(...contractTimeNotifs(c, nowMs));
  }
  for (const t of input.tickets) items.push(...ticketNotifs(t, nowMs));

  for (const ch of input.chat) {
    if (nowMs - ch.lastActivityMs > CHAT_WINDOW) continue;
    items.push({
      id: `chat-${ch.threadId}-${ch.lastActivityMs}`,
      category: 'chat',
      title: 'New message',
      body: ch.preview || 'You have a new message.',
      timestampMs: ch.lastActivityMs,
      href: `/chat-Section/Chat?peer=${ch.peer}`,
      icon: ICONS.mail,
    });
  }

  for (const tx of input.transactions) {
    if (nowMs - tx.timestampMs > TX_WINDOW) continue;
    const title = tx.kind === 'received' ? 'Tokens received'
      : tx.kind === 'sent' ? 'Tokens sent'
      : tx.kind === 'swap' ? 'Tokens swapped'
      : 'Payment complete';
    items.push({ id: `tx-${tx.hash}`, category: 'transaction', title, body: tx.summary, timestampMs: tx.timestampMs, href: '/stats/transaction-history', icon: ICONS.card });
  }

  // Dedupe by id (stable ids can legitimately collide across sources) and sort
  // newest first.
  const byId = new Map<string, NotificationItem>();
  for (const it of items) if (!byId.has(it.id)) byId.set(it.id, it);
  return Array.from(byId.values()).sort((a, b) => b.timestampMs - a.timestampMs);
}
