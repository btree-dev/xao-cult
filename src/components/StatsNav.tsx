import { useRouter } from 'next/router';
import styles from '../styles/StatsNav.module.css';

type Url = string | { pathname: string; query?: Record<string, string> };

const StatsNav = () => {
  const router = useRouter();
  const { pathname, query, asPath } = router;

  const navItems: Array<{
    id: 'unredeemed' | 'redeemed' | 'swap' | 'transactions';
    title: string;
    route: Url;        
    href?: string;     
    icon: string;
    iconSelected: string;
  }> = [
    {
      id: 'unredeemed',
      title: 'Unredeemed Tickets',
      route: { pathname: '/stats/tickets', query: { tab: 'unredeemed' } },
      href: '/stats/tickets?tab=unredeemed',
      icon: '/stats-nav/unredeemed-tickets.svg',
      iconSelected: '/stats-nav/unredeemed-tickets-selected.svg',
    },
    {
      id: 'redeemed',
      title: 'Redeemed Tickets',
      route: { pathname: '/stats/tickets', query: { tab: 'redeemed' } },
      href: '/stats/tickets?tab=redeemed',
      icon: '/stats-nav/redeemed-tickets.svg',
      iconSelected: '/stats-nav/redeemed-tickets-selected.svg',
    },
    {
      id: 'swap',
      title: 'Swap Token',
      route: '/stats/swap-token',
      icon: '/stats-nav/swap-token.svg',
      iconSelected: '/stats-nav/swap-token-selected.svg',
    },
    {
      id: 'transactions',
      title: 'Transaction History',
      route: '/stats/transaction-history',
      icon: '/stats-nav/transaction-history.svg',
      iconSelected: '/stats-nav/transaction-history-selected.svg',
    },
  ];

  const isActive = (id: string, href?: string) => {
    if (id === 'unredeemed') {
      return (
        query.tab === 'unredeemed' ||
        pathname === '/stats/unredeemed-tickets' ||
        asPath.includes('/stats/unredeemed-tickets')
      );
    }
    if (id === 'redeemed') {
      return (
        query.tab === 'redeemed' ||
        pathname === '/stats/redeemed-tickets' ||
        asPath.includes('/stats/redeemed-tickets')
      );
    }
    return typeof href === 'string' ? pathname === href : pathname === (href || '');
  };

  const go = (route: Url) => {
    if (typeof route === 'string') {
      router.push(route);
    } else {
      router.push(route);
    }
  };

  return (
    <div className={styles.statsNav}>
      {navItems.map((item) => {
        const active = isActive(item.id, item.href ?? (typeof item.route === 'string' ? item.route : item.href));
        return (
          <button
            key={item.id}
            onClick={() => go(item.route)}
            className={active ? styles.activeButton : ''}
            title={item.title}
            aria-current={active ? 'page' : undefined}
          >
            <img
              src={active ? item.iconSelected : item.icon}
              alt={item.title}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StatsNav;
