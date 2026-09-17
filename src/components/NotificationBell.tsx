import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useNotifications } from '../hooks/useNotifications';

/** Bell button + unread badge. Kept as its own component so the (RPC-heavy)
 *  useNotifications hook only runs on pages that actually show the bell (the
 *  dashboard), not on every page that renders the shared Navbar. */
const NotificationBell: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const label = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <button
      className={className}
      title="Notifications"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      onClick={() => router.push('/chat-Section/Notification')}
      style={{ position: 'relative' }}
    >
      <Image src="/Chat-Section-Icons/Bell.svg" alt="Notifications" width={24} height={24} />
      {unreadCount > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px',
            borderRadius: 9, background: 'linear-gradient(135deg, #FF5F6D 0%, #A557FF 100%)',
            color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: '18px', textAlign: 'center',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.6)',
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
