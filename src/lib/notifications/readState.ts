// Per-wallet read/seen state for in-app notifications, backed by localStorage.
// Notifications are derived fresh each load, so "unread" = a derived item whose
// stable id the user hasn't marked read yet. State is keyed by wallet so two
// accounts on the same browser don't share read state.

const LS_KEY = 'xao-cult-notif-read';

type Store = Record<string, string[]>; // walletLower -> read notification ids

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
