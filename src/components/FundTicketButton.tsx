import React, { useCallback, useState } from 'react';

interface FundTicketButtonProps {
  walletAddress?: `0x${string}`;
  amountUsd: number;
  chainId?: number;
  className?: string;
  onPopupClose?: () => void;
}

const ONRAMP_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FIAT_ONRAMP === 'true';
const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;

function buildOnrampUrl(params: {
  projectId: string;
  address: `0x${string}`;
  amountUsd: number;
  network: 'base' | 'base-sepolia';
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

function openOnrampPopup(url: string, onClose?: () => void) {
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
    return;
  }
  if (onClose) {
    const interval = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(interval);
        onClose();
      }
    }, 500);
  }
}

export const FundTicketButton: React.FC<FundTicketButtonProps> = ({
  walletAddress,
  amountUsd,
  chainId,
  className,
  onPopupClose,
}) => {
  const [opening, setOpening] = useState(false);

  const handleClick = useCallback(() => {
    if (!walletAddress || !CDP_PROJECT_ID) return;
    const network: 'base' | 'base-sepolia' = chainId === 8453 ? 'base' : 'base-sepolia';
    const fundingUrl = buildOnrampUrl({
      projectId: CDP_PROJECT_ID,
      address: walletAddress,
      amountUsd,
      network,
    });
    setOpening(true);
    openOnrampPopup(fundingUrl, () => {
      setOpening(false);
      onPopupClose?.();
    });
  }, [walletAddress, amountUsd, chainId, onPopupClose]);

  if (!ONRAMP_ENABLED) return null;
  if (!CDP_PROJECT_ID) {
    if (typeof window !== 'undefined') {
      console.warn('[FundTicketButton] NEXT_PUBLIC_CDP_PROJECT_ID not set — onramp disabled');
    }
    return null;
  }
  if (!walletAddress) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={opening}
      className={className}
      style={{
        background: 'transparent',
        border: '2px solid',
        borderImage: 'linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%) 1',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: '30px',
        cursor: opening ? 'wait' : 'pointer',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      {opening ? 'Opening Coinbase…' : 'Buy USDC with card'}
    </button>
  );
};

export default FundTicketButton;
