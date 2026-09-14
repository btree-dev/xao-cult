// src/lib/xaomsg/debugBuild.ts
//
// Debug-only build tag for local key-negotiation/decrypt troubleshooting.
// A per-tab random ID or `Date.now()` captured at module-evaluation time
// would vary by *when* a browser tab happened to (re-)evaluate this module,
// not by *what code* it's actually running — two tabs on the identical
// latest revision would still print different values, which is useless for
// spotting a stale tab. A literal, manually-bumped string instead stays
// identical across every browser genuinely running this exact revision of
// the debug logging, and changes the moment it's bumped — so if two
// browsers' consoles show different XAOMSG_DEBUG_BUILD values, at least one
// of them is running stale JS (missed HMR update, or just needs a hard
// refresh) and nothing else in their logs should be trusted as
// apples-to-apples until that's fixed.
//
// Bump this whenever the instrumented call sites change (waku.ts,
// useXaoThread.ts, useXaoDm.ts, useXaoEvent.ts).
export const XAOMSG_DEBUG_BUILD = 'xaomsg-debug-2026-09-14-01';

// --- Runtime debug-log gate ---
//
// The verbose instrumentation added while chasing key-negotiation/decrypt
// bugs (numbered waku#/thread#/dm#/event# checkpoints, plus raw key
// material and message plaintext/ciphertext at the encrypt/decrypt
// boundary) is too useful to delete outright, but too noisy — and too
// sensitive, since it prints secrets straight to the console — to leave
// running unconditionally. It's gated behind a `localStorage` flag instead:
// off by default, flip it on only while actively debugging.
const DEBUG_LS_KEY = 'xao-waku-debug';

export function isWakuDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEBUG_LS_KEY) === '1';
  } catch {
    return false;
  }
}

function setWakuDebugEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.localStorage.setItem(DEBUG_LS_KEY, '1');
    else window.localStorage.removeItem(DEBUG_LS_KEY);
  } catch {
    // best-effort — nothing to fall back to if storage itself is unusable
  }
}

/** Gated console.log — no-ops unless waku debug logging is enabled. */
export function wakuDebugLog(...args: unknown[]): void {
  if (isWakuDebugEnabled()) console.log(...args);
}
/** Gated console.warn — no-ops unless waku debug logging is enabled. */
export function wakuDebugWarn(...args: unknown[]): void {
  if (isWakuDebugEnabled()) console.warn(...args);
}
/** Gated console.error — no-ops unless waku debug logging is enabled. */
export function wakuDebugError(...args: unknown[]): void {
  if (isWakuDebugEnabled()) console.error(...args);
}

declare global {
  interface Window {
    xaoWakuDebug?: { enable: () => void; disable: () => void; isEnabled: () => boolean };
  }
}

// Console-friendly toggle — `xaoWakuDebug.enable()` / `.disable()` from
// devtools, no code change or rebuild needed. Persists in localStorage (a
// reload is required anyway: most checkpoints fire during initial
// connect/key-negotiation, before there'd be a chance to flip it mid-session).
if (typeof window !== 'undefined') {
  window.xaoWakuDebug = {
    enable: () => {
      setWakuDebugEnabled(true);
      console.log('[xaomsg] waku debug logging ENABLED — reload the page to see waku#/thread#/dm#/event# checkpoint logs.');
    },
    disable: () => {
      setWakuDebugEnabled(false);
      console.log('[xaomsg] waku debug logging disabled.');
    },
    isEnabled: isWakuDebugEnabled,
  };
}
