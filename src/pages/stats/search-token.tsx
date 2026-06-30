import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import styles from '../../styles/SelectToken.module.css';
import Layout from '../../components/Layout';
import { useWeb3 } from '../../hooks/useWeb3';
import { useUniswapTokenList } from '../../hooks/useUniswapTokenList';
import { isSwapSupportedChain, TokenInfo } from '../../lib/web3/tokens';
import { baseSepolia } from 'wagmi/chains';

const SelectToken = () => {
    const router = useRouter();
    const { type } = router.query;
    const { chain } = useWeb3();
    const [search, setSearch] = useState('');

    const chainId = useMemo(
        () => (isSwapSupportedChain(chain?.id) ? chain!.id : baseSepolia.id),
        [chain?.id],
    );
    const { tokens, isLoading, error } = useUniswapTokenList(chainId);

    const q = search.trim().toLowerCase();
    const filtered = tokens.filter((t) =>
        q === '' ||
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase() === q,
    );

    const handleSelect = (token: TokenInfo) => {
        const stored = {
            symbol: token.symbol,
            name: token.name,
            icon: token.icon,
            address: token.address,
            decimals: token.decimals,
        };
        if (type === 'pay') {
            localStorage.setItem('selectedPayToken', JSON.stringify(stored));
        } else if (type === 'get') {
            localStorage.setItem('selectedGetToken', JSON.stringify(stored));
        }
        router.push('/stats/swap-token');
    };

    const handleDismiss = () => {
        router.push('/stats/swap-token');
    };

    return (
        <Layout>
        <div className={styles.container} onClick={handleDismiss}>
            <div className={styles.background} />
            <div className={styles.centeredContent}>
                <div className={styles.card} onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className={styles.closeButton}
                        aria-label="Close"
                        onClick={handleDismiss}
                    >
                        ✕
                    </button>
                    <h2 className={styles.title}>Search Token</h2>

                    <input
                        className={styles.search}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={search === '' ? 'Search token' : ''}
                    />

                    {isLoading && tokens.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#ccc', padding: 16 }}>Loading token list…</div>
                    )}
                    {error && (
                        <div style={{ textAlign: 'center', color: '#ff9900', padding: 8, fontSize: 12 }}>
                            Using curated list (remote fetch failed)
                        </div>
                    )}

                    <div className={styles.tokenList}>
                        {filtered.map((token) => (
                            <div key={token.address} className={styles.tokenRow} onClick={() => handleSelect(token)}>
                                <img src={token.icon} alt={token.symbol} className={styles.icon} />
                                <div>
                                    <div className={styles.symbol}>{token.symbol}</div>
                                    <div className={styles.name}>{token.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        </Layout>
    );
};

export default SelectToken;
