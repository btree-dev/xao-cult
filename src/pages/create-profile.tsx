import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabase';
import { useAccount, useSignMessage } from 'wagmi';
import { formatWalletEmail } from '../lib/utils';

const CreateProfile: NextPage = () => {
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('50 Miles');
  const [genre1, setGenre1] = useState('Rock');
  const [genre2, setGenre2] = useState('Punk');
  const [genre3, setGenre3] = useState('Hardcore');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Get the current user when the component mounts
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const getUser = async () => {
      try {
        // Check for Supabase user
        const { data } = await supabase.auth.getUser();
        
        if (data.user) {
          setUser(data.user);
          return;
        }
        
        // If no user is authenticated, redirect to register
        router.push('/register');
      } catch (error) {
        console.error('Error getting user:', error);
        // Redirect to register on error
        router.push('/register');
      }
    };
    
    getUser();
  }, [isConnected, address, router]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Force a user check if one isn't set
    if (!user) {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUser(data.user);
        } else {
          setError('You must be logged in to create a profile');
          setLoading(false);
          return;
        }
      } catch (error) {
        setError('You must be logged in to create a profile');
        setLoading(false);
        return;
      }
    }

    try {
      // Create a profile in the database
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username,
          location,
          radius: radius.split(' ')[0], // Extract the number part
          genres: [genre1, genre2, genre3].filter(Boolean),
          created_at: new Date(),
        });

      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <Head>
        <title>Create Profile - XAO Cult</title>
        <meta
          content="Create your profile - XAO Cult"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <div className={styles.headerContainer}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className={styles.pageTitle}>Create Profile</h1>
        </div>
        
        {!user && (
          <div className={styles.loginPrompt}>
            <p>You must be logged in to create a profile</p>
            <button 
              onClick={() => router.push('/register')} 
              className={styles.bigButton}
            >
              Go to Registration
            </button>
          </div>
        )}
        
        {user && (
          <>
            <div className={styles.profileImageContainer}>
              <div className={styles.profileImage}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 20C20.4183 20 24 16.4183 24 12C24 7.58172 20.4183 4 16 4C11.5817 4 8 7.58172 8 12C8 16.4183 11.5817 20 16 20Z" fill="#FCA974"/>
                </svg>
              </div>
            </div>

            <form onSubmit={handleCreateProfile} className={styles.formContainer}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.formInput}
                  required
                />
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Location</label>
                  <div className={styles.locationInputContainer}>
                    <div className={styles.locationIconWrapper}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 10.8334C11.3807 10.8334 12.5 9.71407 12.5 8.33335C12.5 6.95264 11.3807 5.83335 10 5.83335C8.61929 5.83335 7.5 6.95264 7.5 8.33335C7.5 9.71407 8.61929 10.8334 10 10.8334Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 18.3334C13.3333 15.0001 16.6667 12.0153 16.6667 8.33339C16.6667 4.65148 13.6819 1.66675 10 1.66675C6.31811 1.66675 3.33333 4.65148 3.33333 8.33339C3.33333 12.0153 6.66667 15.0001 10 18.3334Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="City / Zipcode"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={styles.locationInput}
                      required
                    />
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Radius</label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className={styles.selectInput}
                    required
                  >
                    <option value="25 Miles">25 Miles</option>
                    <option value="50 Miles">50 Miles</option>
                    <option value="100 Miles">100 Miles</option>
                    <option value="Anywhere">Anywhere</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Genre 1</label>
                <select
                  value={genre1}
                  onChange={(e) => setGenre1(e.target.value)}
                  className={styles.selectInput}
                  required
                >
                  <option value="Rock">Rock</option>
                  <option value="Pop">Pop</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Classical">Classical</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Genre 2 / Sub Genre</label>
                <select
                  value={genre2}
                  onChange={(e) => setGenre2(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="Punk">Punk</option>
                  <option value="Metal">Metal</option>
                  <option value="Indie">Indie</option>
                  <option value="Alternative">Alternative</option>
                  <option value="Folk">Folk</option>
                  <option value="Blues">Blues</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Genre 3 / Sub / Sub Sub Genre</label>
                <select
                  value={genre3}
                  onChange={(e) => setGenre3(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="Hardcore">Hardcore</option>
                  <option value="Thrash">Thrash</option>
                  <option value="Death Metal">Death Metal</option>
                  <option value="Black Metal">Black Metal</option>
                  <option value="Grindcore">Grindcore</option>
                  <option value="Doom">Doom</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <button 
                  type="button" 
                  className={styles.documentButton}
                  onClick={() => alert('Document upload functionality will be implemented later')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.66675 13.3333L10.0001 10L13.3334 13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 10V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.9917 15.325C17.8044 14.8818 18.4465 14.1807 18.8113 13.3322C19.176 12.4836 19.2466 11.5353 19.0123 10.6389C18.778 9.74252 18.2494 8.94922 17.5104 8.39048C16.7714 7.83175 15.8647 7.53672 14.9333 7.55003H13.95C13.6958 6.52418 13.2069 5.57103 12.5252 4.7813C11.8435 3.99157 10.9877 3.38635 10.0333 3.01688C9.07895 2.6474 8.05026 2.52551 7.04021 2.6601C6.03017 2.7947 5.06847 3.18271 4.23006 3.78918C3.39164 4.39564 2.70298 5.2016 2.22783 6.12818C1.75269 7.05475 1.50626 8.07607 1.51011 9.11253C1.51396 10.149 1.76799 11.1686 2.25025 12.0917" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.66675 13.3333L10.0001 10L13.3334 13.3333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Xao dApp Documents
                </button>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button 
                type="submit" 
                className={styles.bigButton}
                disabled={loading}
              >
                {loading ? 'Creating Profile...' : 'Confirm'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default CreateProfile; 