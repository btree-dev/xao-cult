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
}

const Navbar: React.FC<NavbarProps> = ({ userProfile, showBackButton = false, pageTitle = '' }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  const handleProfileClick = () => {
    if (userProfile) {
      setShowLogoutConfirm(true);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowLogoutConfirm(false);
    router.push('/');
  };

  const goBack = () => {
    router.back();
  };

  const goForward = () => {
    router.forward();
  };

  return (
    <>
      {showBackButton ? (
        // Event details style navbar with back button
        <nav className={styles.navbar}>
          <div className={styles.navContainer}>
            <div className={styles.navSection}>
              <button 
                className={styles.navButton} 
                title="Back"
                onClick={goBack}
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
              <button className={styles.navButton} title="Search">
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
              <button className={styles.navButton} title="Fullscreen">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 8V5C21 4.46957 20.7893 3.96086 20.4142 3.58579C20.0391 3.21071 19.5304 3 19 3H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 16V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button className={styles.navButton} title="Location">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="white" strokeWidth="2"/>
                  <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="white" strokeWidth="2"/>
                </svg>
              </button>
            </div>

            {/* Center profile avatar */}
            <div className={styles.centerSection}>
              <div className={styles.profileAvatar} onClick={handleProfileClick}>
                {userProfile?.avatar ? (
                  <Image 
                    src={userProfile.avatar} 
                    alt="Profile" 
                    width={40} 
                    height={40}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* Right side icons */}
            <div className={styles.navSection}>
              <button className={styles.navButton} title="Calendar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 1V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 1V5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 9H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button className={styles.navButton} title="Search">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
                  <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className={styles.logoutConfirmOverlay}>
          <div className={styles.logoutConfirmBox}>
            <h3>Sign Out</h3>
            <p>Are you sure you want to sign out?</p>
            <div className={styles.logoutButtons}>
              <button onClick={handleLogoutCancel} className={styles.cancelButton}>Cancel</button>
              <button onClick={handleSignOut} className={styles.confirmButton}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar; 