import { useRouter } from 'next/router';
import styles from '../styles/FloatingNav.module.css';

const FloatingNav = () => {
  const router = useRouter();

  const homeRoutes = [
    '/contracts/current-contract',
    '/contracts/create-contract',
    '/contracts/Negotiation',
    '/contracts/past-contracts',
    '/contracts/arbitrate',
    '/contracts/contracts-detail'
  ];

  const navItems = [
    {
      id: 'home',
      title: 'Home',
      target: homeRoutes[0],
      routes: homeRoutes,
      icon: '/floating-nav/home.svg',
      iconSelected: '/floating-nav/home-selected.svg',
    },
    {
      id: 'swap',
      title: 'Dashboard',
      target: '/dashboard',
      routes: ['/dashboard'],
      icon: '/floating-nav/swap.svg',
      iconSelected: '/floating-nav/swap-selected.svg',
    },
    {
      id: 'chat',
      title: 'Chat',
      target: '/chat-Section/Search',
      routes: ['/chat-Section/Search'],
      icon: '/floating-nav/chat.svg',
      iconSelected: '/floating-nav/chat-selected.svg',
    },
    {
      id: 'stats',
      title: 'Stats',
      target: '/stats/tickets?tab=unredeemed',
      routes: ['/stats', '/stats/tickets', '/stats/tickets/[id]', '/stats/transaction-history'],
      icon: '/floating-nav/stats.svg',
      iconSelected: '/floating-nav/stats-selected.svg',
    },
  ];

  const isActive = (routes: string[]): boolean => {
    return routes.some((route) => router.pathname === route);
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    router.push(item.target);
  };

  return (
    <div className={styles.floatingNav}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavClick(item)}
          title={item.title}
          className={isActive(item.routes) ? styles.activeButton : ''}
          style={{ position: 'relative' }}
        >
          <img
            src={isActive(item.routes) ? item.iconSelected : item.icon}
            alt={item.title}
          />
        </button>
      ))}
    </div>
  );
};

export default FloatingNav;