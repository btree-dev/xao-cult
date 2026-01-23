import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import styles from './Navbar.module.css';

interface NavbarProps {
  userProfile?: {
    username?: string;
    avatar?: string;
  };
  showBackButton?: boolean;
  pageTitle?: string;
  showNotificationIcon?: boolean;
  showSearchIcon?: boolean;
  onCalendarClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ userProfile, showBackButton = false, pageTitle = '', showNotificationIcon = false, showSearchIcon = true, onCalendarClick }) => {
  const router = useRouter();

  const handleProfileClick = () => {
    if (userProfile) {
      router.push('/public-information');
    }
  };

  const goBack = () => {
    router.back();
  };

  const goForward = () => {
    router.forward();
  };

  const handleTicketsClick = () => {
    router.push('/tickets');
  };

  const handleFullscreenClick = () => {
    router.push('/TicketAuthenticate/TicketQR');
  };

  const handleNotificationClick = () => {
    router.push('/chat-Section/Notification');
  };

  return (
    <>
      {showBackButton ? (
        <nav className={styles.navbar}>
          <div className={styles.navContainer}>
            <div className={styles.navSection}>
              <button 
                className={styles.navButton} 
                title="Back"
                onClick={goBack}
                aria-label="Go back"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 12H5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19L5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className={styles.centerSection}>
              <h1 className={styles.pageTitle}>{pageTitle}</h1>
            </div>

            <div className={styles.navSection}>
              <button 
                className={styles.navButton} 
                title="Tickets" 
                aria-label="Tickets"
                onClick={handleTicketsClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M2 14v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 8v.01M6 16v.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12h20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button className={styles.navButton} title="Search" aria-label="Search">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
                  <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </nav>
      ) : (
        // Main navbar with all icons
        <nav className={styles.navbar}>
          <div className={styles.navContainer}>
            {/* Left side icons */}
            <div className={styles.navSection}>
              <button
                className={styles.navButton}
                title="Fullscreen"
                aria-label="Fullscreen"
                onClick={handleFullscreenClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 8V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 16V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Center profile avatar */}
            <div className={styles.centerSection}>
              <div className={styles.profileAvatar} onClick={handleProfileClick} role="button" aria-label="User profile">
                {userProfile?.avatar ? (
                  <div 
                  className={styles.profileIcon}
                  onClick={handleProfileClick}
                  style={{ cursor: 'pointer' }}
                >
                  <Image 
                    src={userProfile.avatar} 
                    alt="Profile" 
                    width={40} 
                    height={40}
                    className={styles.avatarImage}
                  />
                  </div>
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            </div>


            <div className={styles.navSection}>
              {/* <button
                className={styles.navButton}
                title="Tickets"
                aria-label="Tickets"
                onClick={handleTicketsClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M2 14v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 8v.01M6 16v.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12h20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button> */}

              <button
                className={styles.navButton}
                title="Calendar"
                aria-label="Calendar"
                onClick={onCalendarClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 1V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 1V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 9H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {showSearchIcon && (
                <button className={styles.navButton} title="Search" aria-label="Search">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
                    <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}

              {showNotificationIcon && (
                <button
                  className={styles.navButton}
                  title="Notifications"
                  aria-label="Notifications"
                  onClick={handleNotificationClick}
                >
                  <Image
                    src="/Chat-Section-Icons/Bell.svg"
                    alt="Notifications"
                    width={24}
                    height={24}
                  />
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      
    </>
  );
};

export default Navbar; 