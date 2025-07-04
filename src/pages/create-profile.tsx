import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabase';
import { useAccount, useSignMessage } from 'wagmi';
import { formatWalletEmail } from '../lib/utils';

// Genre hierarchy data structure
const genreHierarchy = {
  'Rock': {
    subgenres: ['Metal', 'Punk', 'Alternative', 'Indie', 'Classic Rock', 'Prog Rock'],
    'Metal': ['Thrash', 'Death Metal', 'Black Metal', 'Doom', 'Heavy Metal', 'Power Metal'],
    'Punk': ['Hardcore', 'Pop Punk', 'Post-Punk', 'Crust Punk', 'Anarcho-Punk'],
    'Alternative': ['Grunge', 'Post-Rock', 'Shoegaze', 'Emo', 'Math Rock'],
    'Indie': ['Indie Pop', 'Indie Folk', 'Dream Pop', 'Lo-Fi'],
    'Classic Rock': ['Psychedelic Rock', 'Southern Rock', 'Garage Rock', 'Surf Rock'],
    'Prog Rock': ['Symphonic Rock', 'Art Rock', 'Space Rock', 'Krautrock']
  },
  'Pop': {
    subgenres: ['Synth Pop', 'Dance Pop', 'Electropop', 'K-Pop', 'J-Pop', 'American Pop'],
    'Synth Pop': ['Chillwave', 'Future Pop', 'Synthwave', 'Hyperpop'],
    'Dance Pop': ['Disco', 'Eurodance', 'Bubblegum Pop', 'Teen Pop'],
    'Electropop': ['Indietronica', 'Electroclash', 'Glitch Pop'],
    'K-Pop': ['K-Rock', 'K-Hip Hop', 'K-Ballad'],
    'J-Pop': ['J-Rock', 'City Pop', 'Shibuya-kei'],
    'American Pop': ['Country Pop', 'Pop Rock', 'Power Pop']
  },
  'Hip Hop': {
    subgenres: ['Trap', 'Boom Bap', 'Conscious', 'Gangsta', 'Alternative Hip Hop', 'Drill'],
    'Trap': ['Mumble Rap', 'Cloud Rap', 'Phonk', 'Drill'],
    'Boom Bap': ['Jazz Rap', 'East Coast', 'Golden Age'],
    'Conscious': ['Political Hip Hop', 'Spiritual Hip Hop', 'Lyrical Hip Hop'],
    'Gangsta': ['G-Funk', 'Mafioso', 'West Coast', 'Horrorcore'],
    'Alternative Hip Hop': ['Abstract Hip Hop', 'Experimental Hip Hop', 'Trip Hop'],
    'Drill': ['UK Drill', 'Chicago Drill', 'Brooklyn Drill']
  },
  'Electronic': {
    subgenres: ['Techno', 'House', 'Drum & Bass', 'Ambient', 'Dubstep', 'Trance'],
    'Techno': ['Detroit Techno', 'Minimal', 'Hard Techno', 'Acid Techno'],
    'House': ['Deep House', 'Tech House', 'Progressive House', 'Acid House', 'Chicago House'],
    'Drum & Bass': ['Jungle', 'Liquid', 'Neurofunk', 'Jump Up'],
    'Ambient': ['Dark Ambient', 'Drone', 'Space Music', 'New Age'],
    'Dubstep': ['Brostep', 'Future Garage', 'Riddim', 'Deep Dubstep'],
    'Trance': ['Psytrance', 'Goa Trance', 'Uplifting Trance', 'Tech Trance']
  },
  'Jazz': {
    subgenres: ['Bebop', 'Smooth Jazz', 'Fusion', 'Free Jazz', 'Modal Jazz', 'Cool Jazz'],
    'Bebop': ['Hard Bop', 'Post-Bop', 'Neo-Bop'],
    'Smooth Jazz': ['Jazz Funk', 'Crossover Jazz', 'Nu Jazz'],
    'Fusion': ['Jazz Rock', 'Jazz Funk', 'World Fusion'],
    'Free Jazz': ['Avant-garde Jazz', 'Spiritual Jazz', 'Experimental Jazz'],
    'Modal Jazz': ['Cool Jazz', 'Third Stream', 'Chamber Jazz'],
    'Cool Jazz': ['West Coast Jazz', 'ECM Style', 'Contemporary Jazz']
  },
  'Classical': {
    subgenres: ['Baroque', 'Romantic', 'Contemporary', 'Minimalist', 'Opera', 'Chamber Music'],
    'Baroque': ['Early Baroque', 'High Baroque', 'Late Baroque'],
    'Romantic': ['Early Romantic', 'Late Romantic', 'Nationalist'],
    'Contemporary': ['Modernist', 'Post-Modernist', 'Experimental'],
    'Minimalist': ['Holy Minimalism', 'Post-Minimalism', 'Totalism'],
    'Opera': ['Grand Opera', 'Comic Opera', 'Operetta', 'Modern Opera'],
    'Chamber Music': ['String Quartet', 'Piano Trio', 'Wind Ensemble']
  }
};

// Main genre list for the pill buttons
const mainGenres = [
  'Punk', 'Metal', 'Classical', 'Hip Hop', 'Electronic', 'Jazz', 'Rock', 'Pop'
];

const CreateProfile: NextPage = () => {
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('50 Miles');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureURL, setProfilePictureURL] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const [availableSubgenres, setAvailableSubgenres] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const genreDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Get the current user when the component mounts
  const [user, setUser] = useState<any>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target as Node)) {
        setIsGenreDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Update available subgenres when selected genres change
  useEffect(() => {
    if (selectedGenres.length > 0) {
      const subgenres = selectedGenres.flatMap(genre => {
        const mainGenreKey = Object.keys(genreHierarchy).find(key => 
          key === genre || genreHierarchy[key as keyof typeof genreHierarchy]?.subgenres?.includes(genre)
        );
        
        if (mainGenreKey) {
          return genreHierarchy[mainGenreKey as keyof typeof genreHierarchy]?.subgenres || [];
        }
        return [];
      });
      
      // Remove duplicates and already selected genres
      const uniqueSubgenres = Array.from(new Set(subgenres)).filter(sg => !selectedGenres.includes(sg));
      setAvailableSubgenres(uniqueSubgenres);
    } else {
      setAvailableSubgenres([]);
    }
  }, [selectedGenres]);

  useEffect(() => {
    const getUser = async () => {
      try {
        // Check for Supabase user
        const { data } = await supabase.auth.getUser();
        
        if (data.user) {
          setUser(data.user);
          
          // Check if user already has a profile
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profileData && !error) {
            // Set editing mode
            setIsEditingProfile(true);
            
            // Pre-fill form with existing data
            setUsername(profileData.username || '');
            setLocation(profileData.location || '');
            setRadius(profileData.radius ? `${profileData.radius} Miles` : '50 Miles');
            
            // Set profile picture URL if it exists
            if (profileData.profile_picture_url) {
              setProfilePictureURL(profileData.profile_picture_url);
            }
            
            // Handle genres if they exist
            if (profileData.genres && profileData.genres.length > 0) {
              setSelectedGenres(profileData.genres);
            }
          }
          
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

  // Check if username exists with debounce
  useEffect(() => {
    if (!username) {
      setUsernameError(null);
      setUsernameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameCheckLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username);

        if (error) {
          console.error('Error checking username:', error);
          setUsernameError(null);
          setUsernameAvailable(null);
        } else if (data && data.length === 0) {
          // No match found, username is available
          setUsernameAvailable(true);
          setUsernameError(null);
        } else {
          // Username exists
          setUsernameAvailable(false);
          setUsernameError('Username already taken');
        }
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setUsernameCheckLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
      setProfilePictureURL(URL.createObjectURL(file));
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };
  
  const toggleGenreDropdown = () => {
    setIsGenreDropdownOpen(!isGenreDropdownOpen);
  };
  
  const selectSubgenre = (subgenre: string) => {
    if (!selectedGenres.includes(subgenre)) {
      setSelectedGenres(prev => [...prev, subgenre]);
    }
    setIsGenreDropdownOpen(false);
  };

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
      // Check if a profile already exists for this user
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      let profilePictureUrl = null;

      // Upload profile picture if one is selected
      if (profilePicture) {
        try {
          const fileExt = profilePicture.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          const filePath = `profile-pictures/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('profile-pictures')
            .upload(filePath, profilePicture);

          if (uploadError) {
            console.error('Error uploading profile picture:', uploadError);
            // Continue without the profile picture
          } else {
            // Get the public URL
            const { data: urlData } = await supabase.storage
              .from('profile-pictures')
              .getPublicUrl(filePath);

            profilePictureUrl = urlData.publicUrl;
          }
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          // Continue without the profile picture
        }
      }

      // Create profile data object with required fields
      const profileData: any = {
        username,
        location,
        radius: radius.split(' ')[0], // Extract the number part
        genres: selectedGenres,
      };

      // Only add profile_picture_url if we successfully uploaded an image
      if (profilePictureUrl) {
        profileData.profile_picture_url = profilePictureUrl;
      }

      let error;

      if (existingProfile) {
        // Update existing profile
        const response = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);
        
        error = response.error;
      } else {
        // Create new profile
        const response = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            created_at: new Date(),
            ...profileData
          });
        
        error = response.error;
      }

      if (error) {
        // Check if this is a duplicate username error
        if (error.message && error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
          setError('Username already taken. Please choose a different username.');
        } else {
          throw error;
        }
      } else {
        router.push('/dashboard');
      }
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
        <title>{`${isEditingProfile ? 'Edit' : 'Create'} Profile - XAO Cult`}</title>
        <meta
          content={isEditingProfile ? 'Edit your profile - XAO Cult' : 'Create your profile - XAO Cult'}
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
          <h1 className={styles.pageTitle}>{isEditingProfile ? 'Edit Profile' : 'Create Profile'}</h1>
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
              <div 
                className={styles.profileImageUpload} 
                onClick={handleProfilePictureClick}
              >
                {profilePictureURL ? (
                  <Image 
                    src={profilePictureURL} 
                    alt="Profile" 
                    width={80} 
                    height={80} 
                    className={styles.profileImagePreview}
                  />
                ) : (
                  <div className={styles.imageUploadIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 15L16 10L5 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
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
                  className={`${styles.formInput} ${usernameError ? styles.inputError : ''} ${usernameAvailable ? styles.inputSuccess : ''}`}
                  required
                />
                {usernameCheckLoading && <div className={styles.inputFeedback}>Checking...</div>}
                {usernameError && <div className={styles.inputError}>{usernameError}</div>}
                {usernameAvailable && <div className={styles.inputSuccess}>Username available</div>}
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
                  <div className={styles.selectWrapper}>
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
                    <svg className={styles.selectArrow} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
                      className={`${styles.genrePill} ${selectedGenres.includes(genre) ? styles.genrePillSelected : ''}`}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <div 
                  className={`${styles.customDropdown} ${isGenreDropdownOpen ? styles.open : ''}`}
                  ref={genreDropdownRef}
                >
                  <div 
                    className={styles.customDropdownSelected}
                    onClick={toggleGenreDropdown}
                  >
                    <span>{selectedGenre || 'Select Subgenre'}</span>
                    <svg className={`${styles.selectArrow} ${isGenreDropdownOpen ? styles.rotated : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 6L8 10L12 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className={styles.customDropdownOptions}>
                    {availableSubgenres.length > 0 ? (
                      availableSubgenres.map((subgenre) => (
                        <div 
                          key={subgenre} 
                          className={`${styles.customDropdownOption} ${selectedGenres.includes(subgenre) ? styles.selected : ''}`}
                          onClick={() => selectSubgenre(subgenre)}
                        >
                          {subgenre}
                        </div>
                      ))
                    ) : (
                      <div className={styles.customDropdownOption}>
                        {selectedGenres.length > 0 ? 'No additional subgenres available' : 'Select a genre first'}
                      </div>
                    )}
                  </div>
                </div>
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
                className={styles.confirmButton}
                disabled={loading || Boolean(username && usernameAvailable === false)}
              >
                {loading ? (isEditingProfile ? 'Updating Profile...' : 'Creating Profile...') : 'Confirm'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
};

export default CreateProfile; 