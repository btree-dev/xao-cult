export const ONRAMP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FIAT_ONRAMP === 'true';
export const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;

export type OnrampNetwork = 'base' | 'base-sepolia';

export function networkForChainId(chainId?: number): OnrampNetwork {
  return chainId === 8453 ? 'base' : 'base-sepolia';
}

export function buildOnrampUrl(params: {
  projectId: string;
  address: `0x${string}`;
  amountUsd: number;
  network: OnrampNetwork;
}): string {
  const destinationWallets = [
    {
      address: params.address,
      blockchains: [params.network],
      assets: ['USDC'],
    },
  ];

  const url = new URL('https://pay.coinbase.com/buy/select-asset');
  url.searchParams.set('appId', params.projectId);
  url.searchParams.set('destinationWallets', JSON.stringify(destinationWallets));
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
