import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from '../../styles/SelectToken.module.css';
import Layout from '../../components/Layout';

const tokens = [
    { symbol: 'ADA', name: 'Cardano', icon: '/currency-symbols/ada.svg' },
    { symbol: 'BTC', name: 'Bitcoin', icon: '/currency-symbols/btc.svg' },
    { symbol: 'ETH', name: 'Ethereum', icon: '/currency-symbols/eth.svg' },
    { symbol: 'XRP', name: 'Ripple', icon: '/currency-symbols/xrp.svg' },
];

const SelectToken = () => {
    const router = useRouter();
    const { type } = router.query;
    const [search, setSearch] = useState('');

    const filtered = tokens.filter(t =>
        t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (token: any) => {
        if (type === 'pay') {
            localStorage.setItem('selectedPayToken', JSON.stringify(token));
        } else if (type === 'get') {
            localStorage.setItem('selectedGetToken', JSON.stringify(token));
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
                    <div key={token.symbol} className={styles.tokenRow} onClick={() => handleSelect(token)}>
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
