import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import styles from '../../styles/SelectToken.module.css';
import Layout from '../../components/Layout';
import { useWeb3 } from '../../hooks/useWeb3';
import { getTokensForChain, isSwapSupportedChain, TokenInfo } from '../../lib/web3/tokens';
import { baseSepolia } from 'wagmi/chains';

const SelectToken = () => {
    const router = useRouter();
    const { type } = router.query;
    const { chain } = useWeb3();
    const [search, setSearch] = useState('');

    const tokens = useMemo(() => {
        const id = isSwapSupportedChain(chain?.id) ? chain!.id : baseSepolia.id;
        return getTokensForChain(id);
    }, [chain?.id]);

    const filtered = tokens.filter((t) =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()),
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

    return (
        <Layout>
        <div className={styles.container}>
            <h2 className={styles.title}>Search Token</h2>

            <input
                    className={styles.search}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={search === '' ? 'Search token' : ''}
                />

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
        </Layout>
    );
};

export default SelectToken;
