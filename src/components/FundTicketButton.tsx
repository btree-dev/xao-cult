import React, { useCallback, useState } from 'react';
import {
  ONRAMP_ENABLED,
  CDP_PROJECT_ID,
  buildOnrampUrl,
  openOnrampPopup,
  networkForChainId,
} from '../lib/coinbase/onramp';

interface FundTicketButtonProps {
  walletAddress?: `0x${string}`;
  amountUsd: number;
  chainId?: number;
  className?: string;
  onPopupClose?: () => void;
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
    const fundingUrl = buildOnrampUrl({
      projectId: CDP_PROJECT_ID,
      address: walletAddress,
      amountUsd,
      network: networkForChainId(chainId),
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
