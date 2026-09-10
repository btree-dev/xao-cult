export const ONRAMP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FIAT_ONRAMP === 'true';
export const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;

export type OnrampNetwork = 'base' | 'base-sepolia';

export function networkForChainId(chainId?: number): OnrampNetwork {
  return chainId === 8453 ? 'base' : 'base-sepolia';
}

/** Coinbase Onramp funds real assets and only supports mainnet networks — a
 *  session token for base-sepolia is rejected ("address is not valid for
 *  blockchain [base-sepolia]"). Gate the card UI on this so testnet shows a
 *  clear message instead of a failed request. */
export function isOnrampSupportedChain(chainId?: number): boolean {
  return chainId === 8453; // Base mainnet
}

/** Mint a Coinbase Onramp session token via our server route (required for CDP
 *  projects with "secure initialization" enabled — the wallet address is baked
 *  into the token server-side; the browser never sees the CDP API key). Throws
 *  with a user-friendly message on failure. */
export async function fetchOnrampSessionToken(
  address: `0x${string}`,
  network: OnrampNetwork,
): Promise<string> {
  const res = await fetch('/api/onramp-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, network }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.sessionToken) {
    // Log the full server payload (includes cdpStatus/cdpError in dev) so the
    // real Coinbase reason is visible in the browser console, not just a 502.
    console.error('[onramp] session token request failed:', res.status, data);
    throw new Error(data.error || 'Could not start card payment. Please try again.');
  }
  return data.sessionToken as string;
}

/** Build the Onramp URL from a server-minted session token. The token already
 *  carries the destination wallet + asset, so no appId/destinationWallets here. */
export function buildOnrampUrl(params: {
  sessionToken: string;
  amountUsd: number;
  network: OnrampNetwork;
}): string {
  const url = new URL('https://pay.coinbase.com/buy/select-asset');
  url.searchParams.set('sessionToken', params.sessionToken);
  url.searchParams.set('defaultAsset', 'USDC');
  url.searchParams.set('defaultNetwork', params.network);
  if (params.amountUsd > 0) {
    url.searchParams.set('presetFiatAmount', params.amountUsd.toFixed(2));
    url.searchParams.set('fiatCurrency', 'USD');
  }
  return url.toString();
}

export function openOnrampPopup(url: string, onClose?: () => void): Window | null {
  const width = 460;
  const height = 730;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(
    url,
    'coinbase-onramp',
    `width=${width},height=${height},left=${left},top=${top},popup=yes,scrollbars=yes`,
  );
  if (!popup || popup.closed) {
    window.open(url, '_blank');
    return null;
  }
  if (onClose) {
    const interval = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(interval);
        onClose();
      }
    }, 500);
  }
  return popup;
}
