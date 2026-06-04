import { useEffect, useMemo, useState } from 'react';
import { getAddress } from 'viem';
import { getTokensForChain, TokenInfo } from '../lib/web3/tokens';

// Uniswap default token list (Token List standard).
// https://tokens.uniswap.org
const REMOTE_URL = 'https://tokens.uniswap.org';
const CACHE_KEY = 'uniswapTokenList:v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RemoteToken {
  chainId: number;
  address: string;
  name: string;
  decimals: number;
  symbol: string;
  logoURI?: string;
}

interface RemoteList {
  tokens: RemoteToken[];
}

interface CacheEntry {
  fetchedAt: number;
  list: RemoteList;
}

let inMemoryCache: CacheEntry | null = null;
let inflight: Promise<RemoteList> | null = null;

function readCache(): CacheEntry | null {
  if (inMemoryCache && Date.now() - inMemoryCache.fetchedAt < CACHE_TTL_MS) {
    return inMemoryCache;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    inMemoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(list: RemoteList) {
  const entry: CacheEntry = { fetchedAt: Date.now(), list };
  inMemoryCache = entry;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Quota exceeded — fall back to in-memory only.
  }
}

async function fetchRemote(): Promise<RemoteList> {
  const cached = readCache();
  if (cached) return cached.list;
  if (inflight) return inflight;
  inflight = fetch(REMOTE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Token list fetch failed (${r.status})`);
      return r.json() as Promise<RemoteList>;
    })
    .then((list) => {
      writeCache(list);
      return list;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function toTokenInfo(t: RemoteToken): TokenInfo | null {
  try {
    return {
      address: getAddress(t.address) as `0x${string}`,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      icon: t.logoURI || '/currency-symbols/eth.svg',
    };
  } catch {
    return null;
  }
}

function dedupeBySymbol(tokens: TokenInfo[]): TokenInfo[] {
  const seen = new Map<string, TokenInfo>();
  for (const t of tokens) {
    const key = t.address.toLowerCase();
    if (!seen.has(key)) seen.set(key, t);
  }
  return Array.from(seen.values());
}

export function useUniswapTokenList(chainId: number | undefined) {
  const fallback = useMemo(() => getTokensForChain(chainId), [chainId]);
  const [remote, setRemote] = useState<TokenInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chainId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchRemote()
      .then((list) => {
        if (cancelled) return;
        const filtered = list.tokens
          .filter((t) => t.chainId === chainId)
          .map(toTokenInfo)
          .filter((t): t is TokenInfo => t !== null);
        setRemote(filtered);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load token list');
        setRemote(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chainId]);

  // Always union with the curated list so testnets and well-known tokens still
  // appear even if the remote list doesn't include them.
  const tokens = useMemo(() => {
    if (!remote) return fallback;
    return dedupeBySymbol([...fallback, ...remote]);
  }, [remote, fallback]);

  return { tokens, isLoading, error };
}
