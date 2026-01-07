import React from 'react';
import styles from '../styles/ShareModal.module.css';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  eventUrl: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, eventTitle, eventUrl }) => {
  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${eventUrl}` : eventUrl;
  const shareText = `Check out ${eventTitle} on XAO Cult!`;

  const shareLinks = [
    {
      name: 'Twitter',
      icon: '/share-icons/twitter.svg',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: '#1DA1F2'
    },
    {
      name: 'Facebook',
      icon: '/share-icons/facebook.svg',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: '#1877F2'
    },
    {
      name: 'WhatsApp',
      icon: '/share-icons/whatsapp.svg',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      color: '#25D366'
    },
    {
      name: 'Telegram',
      icon: '/share-icons/telegram.svg',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      color: '#0088cc'
    },
    {
      name: 'LinkedIn',
      icon: '/share-icons/linkedin.svg',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: '#0A66C2'
    },
    {
      name: 'Reddit',
      icon: '/share-icons/reddit.svg',
      url: `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
      color: '#FF4500'
    }
  ];

  const handleShare = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Share Event</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.shareGrid}>
          {shareLinks.map((platform) => (
            <button
              key={platform.name}
              className={styles.shareButton}
              onClick={(e) => handleShare(platform.url, e)}
              style={{ borderColor: platform.color }}
            >
              <div className={styles.shareIcon} style={{ background: platform.color }}>
                {platform.name.charAt(0)}
              </div>
              <span className={styles.shareName}>{platform.name}</span>
            </button>
          ))}
        </div>

        <div className={styles.copyLinkSection}>
          <input
            type="text"
            value={shareUrl}
            readOnly
            className={styles.linkInput}
          />
          <button className={styles.copyButton} onClick={handleCopyLink}>
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
