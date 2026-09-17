// Per-wallet read/seen state for in-app notifications, backed by localStorage.
// Notifications are derived fresh each load, so "unread" = a derived item whose
// stable id the user hasn't marked read yet. State is keyed by wallet so two
// accounts on the same browser don't share read state.

import type { NotificationItem } from './types';

const LS_KEY = 'xao-cult-notif-read';
const SEEN_KEY = 'xao-cult-notif-seen';

type Store = Record<string, string[]>; // walletLower -> read notification ids
type SeenStore = Record<string, Record<string, number>>; // walletLower -> id -> firstSeenMs

function readSeen(): SeenStore {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') as SeenStore; }
  catch { return {}; }
}
function writeSeen(s: SeenStore): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch { /* quota / private mode */ }
}

/** Give each notification a stable display time. Items that carry an intrinsic
 *  event time (doors, event-day, chat, tx) keep it; items with a 0 sentinel
 *  (contract STATUS notifications, which have no on-chain change time here) get a
 *  first-seen time persisted on first appearance — so a contract signed two
 *  weeks ago doesn't keep showing "just now" every time the page is refreshed. */
export function resolveTimestamps(wallet: string | null | undefined, items: NotificationItem[]): NotificationItem[] {
  if (!wallet) return items;
  const store = readSeen();
  const key = wallet.toLowerCase();
  const map = store[key] || {};
  let changed = false;
  const now = Date.now();
  const out = items.map((it) => {
    if (it.timestampMs > 0) return it;
    let ms = map[it.id];
    if (!ms) { ms = now; map[it.id] = ms; changed = true; }
    return { ...it, timestampMs: ms };
  });
  if (changed) { store[key] = map; writeSeen(store); }
  return out;
}

/** Drop first-seen entries for ids no longer present, mirroring pruneReadIds. */
export function pruneSeen(wallet: string, currentIds: string[]): void {
  if (!wallet) return;
  const store = readSeen();
  const key = wallet.toLowerCase();
  const existing = store[key];
  if (!existing) return;
  const present = new Set(currentIds);
  let changed = false;
  for (const id of Object.keys(existing)) {
    if (!present.has(id)) { delete existing[id]; changed = true; }
  }
  if (changed) { store[key] = existing; writeSeen(store); }
}

function read(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Store; }
  catch { return {}; }
}

function write(s: Store): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota / private mode */ }
}

export function getReadIds(wallet?: string | null): Set<string> {
  if (!wallet) return new Set();
  return new Set(read()[wallet.toLowerCase()] || []);
}

/** Mark specific ids read (merged into any already-read). */
export function markRead(wallet: string, ids: string[]): void {
  if (!wallet || ids.length === 0) return;
  const store = read();
  const key = wallet.toLowerCase();
  const merged = new Set([...(store[key] || []), ...ids]);
  store[key] = Array.from(merged);
  write(store);
}

/** Mark every currently-derived id read (the "mark all read" action). */
export function markAllRead(wallet: string, allIds: string[]): void {
  markRead(wallet, allIds);
}

/** Prune read ids that are no longer present among derived ids, so the store
 *  doesn't grow forever as old events age out of the derived window. */
export function pruneReadIds(wallet: string, currentIds: string[]): void {
  if (!wallet) return;
  const store = read();
  const key = wallet.toLowerCase();
  const existing = store[key];
  if (!existing || existing.length === 0) return;
  const present = new Set(currentIds);
  const kept = existing.filter((id) => present.has(id));
  if (kept.length !== existing.length) {
    store[key] = kept;
    write(store);
  }
}
