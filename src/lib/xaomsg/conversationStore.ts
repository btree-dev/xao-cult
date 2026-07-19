// src/lib/xaomsg/conversationStore.ts
import type { Address, Hex } from 'viem';

const LS_KEY = 'xao-cult-dm-conversations';

export interface ConversationRecord {
  threadId: Hex;
  peer: Address;
  lastActivityUnixMs: number;
  lastPreview?: string;
}

type Store = Record<string, ConversationRecord[]>; // owner(lowercased) -> records

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Store; }
  catch { return {}; }
}
function writeStore(s: Store): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function sortDesc(list: ConversationRecord[]): ConversationRecord[] {
  return [...list].sort((a, b) => b.lastActivityUnixMs - a.lastActivityUnixMs);
}

export function loadConversations(owner: Address): ConversationRecord[] {
  return sortDesc(readStore()[owner.toLowerCase()] || []);
}

export function mergeConversations(a: ConversationRecord[], b: ConversationRecord[]): ConversationRecord[] {
  const byThread = new Map<string, ConversationRecord>();
  for (const r of [...a, ...b]) {
    const k = r.threadId.toLowerCase();
    const existing = byThread.get(k);
    if (!existing || r.lastActivityUnixMs > existing.lastActivityUnixMs) byThread.set(k, r);
  }
  return sortDesc(Array.from(byThread.values()));
}

export function upsertConversation(owner: Address, rec: ConversationRecord): ConversationRecord[] {
  const store = readStore();
  const key = owner.toLowerCase();
  const merged = mergeConversations(store[key] || [], [rec]);
  store[key] = merged;
  writeStore(store);
  return merged;
}
