// pages/profile/public-information.tsx
import { useEffect,useState, useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/publicInfo.module.css"
import { useRouter } from 'next/router';
import Scrollbar from "../components/Scrollbar";
import { supabase } from '../lib/supabase';
import Navbar from "../components/Navbar";
const mainGenres = ["Rock", "Pop", "HipHop", "Electronic"];

export default function PublicInfoPage() {
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();
  const [identities, setIdentities] = useState([
{
    username: "ABC",
    walletAddresses: ["0x123...", "0x456...", "0x789..."], 
    selectedWalletAddress: "", 
    didEth: "did:eth:ABC",
    didWeb: "did:web:ABC",
    location: "Lahore",
    radius: "50 Miles",
    selectedGenres: [] as string[],
  },
  {
    username: "Alice",
    walletAddresses: ["0x123...", "0x456...", "0x789..."], 
    selectedWalletAddress: "0x123...", 
    didEth: "did:eth:alice",
    didWeb: "did:web:alice.xyz",
    location: "NY",
    radius: "25 Miles",
    selectedGenres: ["Rock"],
  },
  {
    username: "Bob",
    walletAddresses: ["0x999...", "0x888..."],
    selectedWalletAddress: "0x999...",
    didEth: "did:eth:bob",
    didWeb: "did:web:bob.eth",
    location: "LA",
    radius: "100 Miles",
    selectedGenres: ["Electronic", "Pop"],
  },
  ]);

  const handleWalletSelection = (value: string) => {
  const updated = [...identities];
  updated[currentIndex].selectedWalletAddress = value;
  setIdentities(updated);
};
  const handleSave = () => {
    router.push('/dashboard');
};
  const handleLogoutClick = () => {
  setShowLogoutConfirm(true);
};

const handleLogoutCancel = () => {
  setShowLogoutConfirm(false);
};

const handleSignOut = async () => {
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  router.push('/dashboard');
};
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIdentity = identities[currentIndex];
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePic(URL.createObjectURL(file));
    }
  };

  const updateIdentityField = (field: string, value: string) => {
    const updated = [...identities];
    (updated[currentIndex] as any)[field] = value;
    setIdentities(updated);
  };

  const toggleGenre = (genre: string) => {
    const updated = [...identities];
    const selected = updated[currentIndex].selectedGenres;
    updated[currentIndex].selectedGenres = selected.includes(genre)
      ? selected.filter((g) => g !== genre)
      : [...selected, genre];
    setIdentities(updated);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % identities.length);
  };
  
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + identities.length) % identities.length);
  };

  const handleCopy = async () => {
  if (currentIdentity.selectedWalletAddress) {
    try {
      await navigator.clipboard.writeText(currentIdentity.selectedWalletAddress);
      alert("Wallet address copied!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      alert("Failed to copy wallet address");
    }
  }
};
    const handleDeleteIdentity = () => {
    if (identities.length > 1) {
      const updated = identities.filter((_, index) => index !== currentIndex);
      setIdentities(updated);
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/');
          return;
        }
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error || !profileData) {
          router.push('/');
          return;
        }

      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>Public Information</title>
      </Head>
      <Navbar showBackButton/>
      <Scrollbar/>
      <main className={styles.mainDashboard}>
        <h1 className={styles.pageTitle}>Public Information</h1>
        <form className={styles.formContainer}>
          <div className={styles.profileContent}>
            
            <div className={styles.profileActionsContainer}>
              <button 
                type="button" 
                className={styles.actionIconButton} 
                title="Add Identity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M5 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"></path>
                    <line x1="19" y1="8" x2="19" y2="14"></line>
                    <line x1="16" y1="11" x2="22" y2="11"></line>
                  </svg>

              </button>
              <button 
                type="button" 
                className={styles.actionIconButton} 
                onClick={handleDeleteIdentity}
                disabled={identities.length <= 1}
                title="Delete Identity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Profile image section with arrows */}
            <div className={styles.profileImageSection}>
              <button type="button" className={styles.arrowButton} onClick={handlePrev}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4L6 8L10 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.profileImageWrapper}>
                <div className={styles.profileImageUpload} onClick={() => fileInputRef.current?.click()}>
                  {profilePic ? (
                    <Image
                      src={profilePic}
                      alt="Profile"
                      width={80}
                      height={80}
                      className={styles.profileImagePreview}
                    />
                  ) : (
                    <div className={styles.imageUploadIcon}>+</div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    style={{ display: "none" }}
                  />
                </div>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Edit
                </button>
              </div>

              <button type="button" className={styles.arrowButton} onClick={handleNext}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 4L10 8L6 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
          <p className={styles.identityLabel}>
            Identity {currentIndex + 1} of {identities.length}
          </p>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Username</label>
            <div  className={styles.inputRow}>
              <input
                type="text"
                value={currentIdentity.username}
                onChange={(e) => updateIdentityField("username", e.target.value)}
                placeholder="Enter username"
                className={styles.input}
                required
              />
            </div>
          </div>

<div className={styles.inputGroup}>
  <label className={styles.label}>Wallet Address</label>
      <div className={styles.inputRow}>
      <select
        value={currentIdentity.selectedWalletAddress}
        onChange={(e) => handleWalletSelection(e.target.value)}
        className={styles.selectinput}
      >
        {currentIdentity.walletAddresses.map((address, index) => (
          <option key={index} value={address}>
            {address || `Wallet Address ${index + 1}`}
          </option>
        ))}
      </select>
       <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.copyIcon}
        onClick={handleCopy}
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </div>

  
</div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>DID:eth</label>
            <div className={styles.inputRow}>
            <input
              type="text"
              value={currentIdentity.didEth}
              className={`${styles.input} ${styles.readOnlyInput}`}
              readOnly
            />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>DID:web</label>
            <div className={styles.inputRow}>
            <input
              type="text"
              value={currentIdentity.didWeb}
              className={`${styles.input} ${styles.readOnlyInput}`}
              readOnly
            />
            </div>
          </div>     
          <div className={styles.formRow}>
          <div className={styles.inputGroup} >
            <label className={styles.label}>Location</label>
            <div className={`${styles.inputRow}`}>
              <input
                type="text"
                placeholder="City / Zipcode"
                value={currentIdentity.location}
                onChange={(e) => updateIdentityField("location", e.target.value)}
                className={`${styles.input} ${styles.readOnlyInput}  ${styles.locationInput}`}
                readOnly
              />
            </div>
          </div>
          <div className={styles.inputGroup}>
              <label className={styles.label}>Radius</label>
              <div className={`${styles.inputRow} `}>
              <select
                value={currentIdentity.radius}
                onChange={(e) => updateIdentityField("radius", e.target.value)}
                className={`${styles.selectinput} ${styles.radiusInput}`}
                required
              >
                <option value="25 Miles">25 Miles</option>
                <option value="50 Miles">50 Miles</option>
                <option value="100 Miles">100 Miles</option>
                <option value="Anywhere">Anywhere</option>
              </select>
            </div>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Genre</label>
            <div className={styles.genrePillsContainer}>
              {mainGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={`${styles.genrePill} ${
                    currentIdentity.selectedGenres.includes(genre)
                      ? styles.genrePillSelected
                      : ""
                  }`}
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sectionTitleContainer}>
          <div className={styles.gradientLine}></div>
          <h3 className={styles.pageSubDescription}>Shareable Information</h3>
          <div className={styles.gradientLine}></div>
        </div>
            <div className={styles.formGroup}>
            <button type="button" className={styles.documentButton}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.icon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                <line x1="7" y1="8" x2="13" y2="8"></line>
                <line x1="7" y1="12" x2="13" y2="12"></line>
                <line x1="7" y1="16" x2="10" y2="16"></line>
                <circle cx="17" cy="12" r="2"></circle>
              </svg>
              ID
            </button>
          </div>
          <div className={styles.formGroup}>
                <button 
                  type="button" 
                  className={styles.documentButton}
                  onClick={() => router.push('/tax/tax-documents')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66675 13.3333L10.0001 10L13.3334 13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 10V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.9917 15.325C17.8044 14.8818 18.4465 14.1807 18.8113 13.3322C19.176 12.4836 19.2466 11.5353 19.0123 10.6389C18.778 9.74252 18.2494 8.94922 17.5104 8.39048C16.7714 7.83175 15.8647 7.53672 14.9333 7.55003H13.95C13.6958 6.52418 13.2069 5.57103 12.5252 4.7813C11.8435 3.99157 10.9877 3.38635 10.0333 3.01688C9.07895 2.6474 8.05026 2.52551 7.04021 2.6601C6.03017 2.7947 5.06847 3.18271 4.23006 3.78918C3.39164 4.39564 2.70298 5.2016 2.22783 6.12818C1.75269 7.05475 1.50626 8.07607 1.51011 9.11253C1.51396 10.149 1.76799 11.1686 2.25025 12.0917" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.66675 13.3333L10.0001 10L13.3334 13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Tax Documents
                </button>
              </div>

        <div className={styles.sectionTitleContainer}>
          <div className={styles.gradientLine}></div>
          <h3 className={styles.pageSubDescription}>Private Information</h3>
          <div className={styles.gradientLine}></div>
        </div>
        <div className={styles.formGroup}>
          <button  type="button" className={styles.documentButton}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
                <line x1="6" y1="15" x2="14" y2="15"></line>
              </svg>
            Credit Card
          </button>
          </div>
        <div className={styles.formGroup}>
          <button type="button" className={styles.documentButton}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66675 13.3333L10.0001 10L13.3334 13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 10V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.9917 15.325C17.8044 14.8818 18.4465 14.1807 18.8113 13.3322C19.176 12.4836 19.2466 11.5353 19.0123 10.6389C18.778 9.74252 18.2494 8.94922 17.5104 8.39048C16.7714 7.83175 15.8647 7.53672 14.9333 7.55003H13.95C13.6958 6.52418 13.2069 5.57103 12.5252 4.7813C11.8435 3.99157 10.9877 3.38635 10.0333 3.01688C9.07895 2.6474 8.05026 2.52551 7.04021 2.6601C6.03017 2.7947 5.06847 3.18271 4.23006 3.78918C3.39164 4.39564 2.70298 5.2016 2.22783 6.12818C1.75269 7.05475 1.50626 8.07607 1.51011 9.11253C1.51396 10.149 1.76799 11.1686 2.25025 12.0917" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.66675 13.3333L10.0001 10L13.3334 13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
            Xao dApp Documents
          </button>
        </div>
        <div className={styles.formGroup}>
          <button type="button" className={styles.documentButton}>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 
                        10 10 10 10-4.477 10-10S17.523 2 
                        12 2zm6.93 6h-2.197c-.172-1.405-.52-2.723-1.01-3.803A8.031 
                        8.031 0 0118.93 8zM12 4c.772 0 
                        2.13 1.63 2.518 4H9.482C9.87 
                        5.63 11.228 4 12 4zM8.277 4.197C7.787 
                        5.277 7.44 6.595 7.268 8H5.07a8.031 
                        8.031 0 013.207-3.803zM4 12c0-.692.07-1.363.197-2h2.092c-.08.646-.122 
                        1.31-.122 2s.042 1.354.122 
                        2H4.197A7.963 7.963 0 014 12zm1.07 
                        4h2.197c.172 1.405.52 2.723 1.01 
                        3.803A8.031 8.031 0 015.07 16zM12 
                        20c-.772 0-2.13-1.63-2.518-4h5.036C14.13 
                        18.37 12.772 20 12 20zm3.723-.197c.49-1.08.838-2.398 
                        1.01-3.803h2.197a8.031 8.031 0 01-3.207 
                        3.803zM17.731 14c.08-.646.122-1.31.122-2s-.042-1.354-.122-2h2.092c.127.637.197 
                        1.308.197 2s-.07 1.363-.197 2h-2.092z"/>
              </svg>
            XaoDao
          </button>
        </div>
        <div>
          <button type="button" className={styles.documentButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Seed
          </button>
        </div>
        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>PassKey Signin</label>
          <input
            type="checkbox"
            className={styles.toggleSwitch}
          />
        </div>
        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>Email Signin</label>
          <input
            type="checkbox"
            className={styles.toggleSwitch}
          />
        </div>
        <p className={styles.lastUpdated}>  Profile last Updated on 5 May 2025</p>

          <div className={styles.formGroup}>
            <button type="button" onClick={handleSave}   className={styles.confirmButton}>
              Save
            </button>
          </div>
          <div className={styles.formGroup}>
            <button type="button" className={styles.bigButton} onClick={handleLogoutClick}>
              Log Out
            </button>
          </div>
          {showLogoutConfirm && (
        <div className={styles.logoutConfirmOverlay}>
          <div className={styles.logoutConfirmBox}>
            <h3>Sign Out</h3>
            <p>Are you sure you want to sign out?</p>
            <div className={styles.logoutButtons}>
              <button onClick={handleLogoutCancel} className={styles.logoutcancelButton}>Cancel</button>
              <button onClick={handleSignOut} className={styles.logoutconfirmButton}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
        </form>
      </main>
    </div>
  );
}