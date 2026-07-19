// src/lib/xaomsg/conversationKey.ts
import type { Hex } from 'viem';

const LS_KEY = 'xao-cult-dm-convkeys';

type ConvKeyMap = Record<string, string>; // threadId -> base64 raw 32-byte key

function readMap(): ConvKeyMap {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as ConvKeyMap; }
  catch { return {}; }
}
function writeMap(m: ConvKeyMap): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(m));
}
function b64encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...Array.from(bytes))); }
function b64decode(s: string): Uint8Array { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

export function generateRawConversationKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function saveConversationKeyRaw(threadId: Hex, raw: Uint8Array): void {
  const m = readMap();
  m[threadId.toLowerCase()] = b64encode(raw);
  writeMap(m);
}

export function loadConversationKeyRaw(threadId: Hex): Uint8Array | null {
  const v = readMap()[threadId.toLowerCase()];
  return v ? b64decode(v) : null;
}

export function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}
