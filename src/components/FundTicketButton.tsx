import React, { useCallback, useState } from 'react';
import {
  ONRAMP_ENABLED,
  buildOnrampUrl,
  openOnrampPopup,
  networkForChainId,
  fetchOnrampSessionToken,
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
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (!walletAddress) return;
    setOpening(true);
    setError(null);
    try {
      const network = networkForChainId(chainId);
      const sessionToken = await fetchOnrampSessionToken(walletAddress, network);
      const fundingUrl = buildOnrampUrl({ sessionToken, amountUsd, network });
      openOnrampPopup(fundingUrl, () => {
        setOpening(false);
        onPopupClose?.();
      });
    } catch (err) {
      setOpening(false);
      setError(err instanceof Error ? err.message : 'Could not start card payment.');
    }
  }, [walletAddress, amountUsd, chainId, onPopupClose]);

  if (!ONRAMP_ENABLED) return null;
  if (!walletAddress) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
      {error && <span style={{ color: '#ff8080', fontSize: 12, textAlign: 'center' }}>{error}</span>}
    </div>
  );
};

export default FundTicketButton;
