import { useRouter } from 'next/router';
import styles from '../styles/FloatingNav.module.css';
import { useXMTPClient } from '../contexts/XMTPContext';

const FloatingNav = () => {
  const router = useRouter();
  const { unreadCount, clearUnread } = useXMTPClient();

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
      routes: homeRoutes,
      icon: '/floating-nav/home.svg',
      iconSelected: '/floating-nav/home-selected.svg',
    },
    {
      id: 'swap',
      title: 'Swap',
      routes: ['/dashboard'], 
      icon: '/floating-nav/swap.svg',
      iconSelected: '/floating-nav/swap-selected.svg',
    },
    {
      id: 'chat',
      title: 'Chat',
      routes: ['/chat-Section/Search'],
      icon: '/floating-nav/chat.svg',
      iconSelected: '/floating-nav/chat-selected.svg',
    },
    {
      id: 'stats',
      title: 'Stats',
      routes: ['/stats/tickets?tab=unredeemed'], 
      icon: '/floating-nav/stats.svg',
      iconSelected: '/floating-nav/stats-selected.svg',
    },
  ];

  const isActive = (routes: string[]): boolean => {
    return routes.some((route) => router.pathname === route);
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.id === 'chat') {
      clearUnread();
    }
    router.push(item.routes[0]);
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
          {item.id === 'chat' && unreadCount > 0 && (
            <span className={styles.badge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default FloatingNav;