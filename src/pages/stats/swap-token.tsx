import type { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { base, baseSepolia } from 'wagmi/chains';
import { useSwitchChain } from 'wagmi';
import styles from '../../styles/Swap.module.css';
import Layout from '../../components/Layout';
import StatsNav from '../../components/StatsNav';
import { useWeb3 } from '../../hooks/useWeb3';
import { useTokenList } from '../../hooks/useTokenList';
import { useSwapQuote } from '../../hooks/useSwapQuote';
import { useUniswapSwap } from '../../hooks/useUniswapSwap';
import {
  findTokenBySymbol,
  getTokensForChain,
  isSwapSupportedChain,
  SwapChainId,
  TokenInfo,
} from '../../lib/web3/tokens';

const DEFAULT_PAY = 'USDC';
const DEFAULT_GET = 'WETH';

function readStoredToken(key: string): TokenInfo | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.address !== 'string' ||
      typeof parsed?.symbol !== 'string' ||
      typeof parsed?.decimals !== 'number'
    ) {
      return undefined;
    }
    return {
      address: parsed.address as `0x${string}`,
      symbol: parsed.symbol,
      name: parsed.name ?? parsed.symbol,
      decimals: parsed.decimals,
      icon: parsed.icon ?? '/currency-symbols/eth.svg',
    };
  } catch {
    return undefined;
  }
}

const Swap: NextPage = () => {
  const router = useRouter();
  const { address, chain, isConnected } = useWeb3();
  const { switchChain, isPending: switchPending } = useSwitchChain();

  const activeChainId = chain?.id;
  const swapChainId: SwapChainId | undefined = isSwapSupportedChain(activeChainId)
    ? activeChainId
    : undefined;

  // Token picker / "My Assets" follow the active swap chain. Fall back to
  // Base Sepolia tokens for the picker UI before a wallet connects.
  const pickerChainId: SwapChainId = swapChainId ?? baseSepolia.id;

  const [payToken, setPayToken] = useState<TokenInfo | undefined>();
  const [getToken, setGetToken] = useState<TokenInfo | undefined>();
  const [payAmount, setPayAmount] = useState('1');

  useEffect(() => {
    const initialPay = findTokenBySymbol(pickerChainId, DEFAULT_PAY)
      || getTokensForChain(pickerChainId)[0];
    const initialGet = findTokenBySymbol(pickerChainId, DEFAULT_GET)
      || getTokensForChain(pickerChainId)[1]
      || initialPay;
    setPayToken(readStoredToken('selectedPayToken') || initialPay);
    setGetToken(readStoredToken('selectedGetToken') || initialGet);
  }, [pickerChainId]);

  const { balances } = useTokenList(address, pickerChainId);

  const { quote, isLoading: quoteLoading, error: quoteError } = useSwapQuote({
    chainId: pickerChainId,
    tokenIn: payToken,
    tokenOut: getToken,
    amountInRaw: payAmount,
  });

  const { swap, state: swapState, error: swapError, txHash } = useUniswapSwap();

  const canSwap =
    isConnected &&
    !!swapChainId &&
    !!quote &&
    quote.amountOut > BigInt(0) &&
    swapState !== 'approving' &&
    swapState !== 'signing' &&
    swapState !== 'swapping';

  const handleOpenTokenSearch = (type: 'pay' | 'get') => {
    router.push(`/stats/search-token?type=${type}`);
  };

  const handleFlip = () => {
    const newPay = getToken;
    const newGet = payToken;
    setPayToken(newPay);
    setGetToken(newGet);
    if (newPay) localStorage.setItem('selectedPayToken', JSON.stringify({ symbol: newPay.symbol }));
    if (newGet) localStorage.setItem('selectedGetToken', JSON.stringify({ symbol: newGet.symbol }));
  };

  const handleSwap = async () => {
    if (!payToken || !getToken || !quote || !swapChainId) return;
    try {
      await swap({
        chainId: swapChainId,
        tokenIn: payToken,
        tokenOut: getToken,
        amountIn: quote.amountIn,
        amountOutQuoted: quote.amountOut,
        feeTier: quote.feeTier,
      });
      router.push('/stats/transaction-history');
    } catch {
      // surface via swapError
    }
  };

  const swapButtonLabel = (() => {
    if (!isConnected) return 'Connect Wallet';
    if (!swapChainId) return switchPending ? 'Switching…' : 'Switch to Base Sepolia';
    if (swapState === 'approving') return 'Approving…';
    if (swapState === 'signing') return 'Sign in wallet…';
    if (swapState === 'swapping') return 'Swapping…';
    if (quoteLoading) return 'Quoting…';
    if (quoteError) return quoteError;
    return 'Swap Now';
  })();

  const onMainButton = () => {
    if (!swapChainId) {
      switchChain({ chainId: baseSepolia.id });
      return;
    }
    handleSwap();
  };

  const handleSwitchTo = (targetChainId: SwapChainId) => {
    if (targetChainId === activeChainId) return;
    switchChain({ chainId: targetChainId });
  };

  const currentPriceText = quote && payToken && getToken
    ? `1 ${payToken.symbol} = ${quote.pricePerInput.toLocaleString('en-US', {
        maximumFractionDigits: 8,
      })} ${getToken.symbol}`
    : '—';

  const networkLabel = swapChainId === base.id
    ? 'Base mainnet'
    : swapChainId === baseSepolia.id
      ? 'Base Sepolia'
      : null;

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.background} />
        <StatsNav />
        <Head>
          <title>Swap Tokens</title>
        </Head>
        <div className={styles.centeredContent}>
          <div className={styles.swapCard}>
            <h1 className={styles.title}>Swap Tokens</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: -4, marginBottom: 12 }}>
              {([
                { id: baseSepolia.id as SwapChainId, label: 'Base Sepolia' },
                { id: base.id as SwapChainId, label: 'Base' },
              ]).map((opt) => {
                const selected = activeChainId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSwitchTo(opt.id)}
                    disabled={switchPending}
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      borderRadius: 16,
                      border: selected ? '1px solid #ff9900' : '1px solid #444',
                      background: selected ? 'linear-gradient(to right, #ff9900, #e100ff)' : 'transparent',
                      color: '#fff',
                      cursor: switchPending ? 'wait' : 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {!networkLabel && isConnected && (
              <div style={{ textAlign: 'center', color: '#ff9900', fontSize: 12, marginBottom: 8 }}>
                Wallet on unsupported chain — pick one above
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>You pay</label>
              <div className={styles.inputRow}>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className={styles.input}
                  inputMode="decimal"
                />
                <div className={styles.tokenSelectButton} onClick={() => handleOpenTokenSearch('pay')}>
                  {payToken && (
                    <>
                      <img src={payToken.icon} alt={payToken.symbol} className={styles.tokenIcon} />
                      <span>{payToken.symbol}</span>
                    </>
                  )}
                  <span className={styles.dropdownArrow}>▼</span>
                </div>
              </div>
            </div>

            <div className={styles.swapDivider}>
              <img
                src="/swap-currency.svg"
                alt="Swap"
                className={styles.swapSvg}
                onClick={handleFlip}
                style={{ cursor: 'pointer' }}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>You get</label>
              <div className={styles.inputRow}>
                <input
                  type="text"
                  value={quote ? quote.formattedOut : ''}
                  disabled
                  className={styles.input}
                  placeholder="0.00"
                />
                <div className={styles.tokenSelectButton} onClick={() => handleOpenTokenSearch('get')}>
                  {getToken && (
                    <>
                      <img src={getToken.icon} alt={getToken.symbol} className={styles.tokenIcon} />
                      <span>{getToken.symbol}</span>
                    </>
                  )}
                  <span className={styles.dropdownArrow}>▼</span>
                </div>
              </div>
            </div>

            <div className={styles.priceInfo}>
              <span className={styles.priceLabel}>Current Price:</span>
              <span className={styles.priceValue}>{currentPriceText}</span>
            </div>

            <button
              className={styles.swapButton}
              onClick={onMainButton}
              disabled={!canSwap && !!swapChainId && isConnected}
              style={!canSwap && !!swapChainId && isConnected ? { opacity: 0.6 } : undefined}
            >
              {swapButtonLabel}
            </button>

            {swapError && (
              <div style={{ color: '#ff6b6b', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                {swapError}
              </div>
            )}
            {swapState === 'success' && txHash && (
              <div style={{ color: '#00ff99', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                Swap confirmed
              </div>
            )}

            <h2 className={styles.assetsTitle}>My Assets</h2>
            {balances.map((b, i) => (
              <div key={b.token.address}>
                <div className={styles.assetRow}>
                  <span>{b.token.symbol}</span>
                  <span>{b.formatted}</span>
                </div>
                {i < balances.length - 1 && <div className={styles.separator} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Swap;
