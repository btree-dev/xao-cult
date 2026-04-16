import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAccount } from "wagmi";

const STORAGE_KEY = "xao-cult-profile-cache";

export interface CachedProfile {
  walletAddress: string;
  username: string;
  profilePictureUrl?: string;
  location?: string;
  radius?: string;
  genres?: string[];
  cachedAt: number;
}

interface ProfileCacheContextType {
  getProfile: (walletAddress: string) => CachedProfile | null;
  setProfile: (profile: CachedProfile) => void;
  currentUserProfile: CachedProfile | null;
  isLoadingCurrentUser: boolean;
}

const ProfileCacheContext = createContext<ProfileCacheContextType | null>(null);

interface ProfileCacheProviderProps {
  children: ReactNode;
}

function loadProfiles(): Map<string, CachedProfile> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, CachedProfile>;
      const validProfiles = new Map<string, CachedProfile>();
      Object.entries(parsed).forEach(([key, profile]) => {
        validProfiles.set(key.toLowerCase(), profile);
      });
      return validProfiles;
    }
  } catch (e) {
    console.error("[ProfileCache] Failed to load from localStorage:", e);
  }
  return new Map();
}

function saveProfiles(profiles: Map<string, CachedProfile>) {
  try {
    const obj: Record<string, CachedProfile> = {};
    profiles.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error("[ProfileCache] Failed to save to localStorage:", e);
  }
}

export function ProfileCacheProvider({ children }: ProfileCacheProviderProps) {
  const { address, isConnected } = useAccount();
  const [profiles, setProfiles] = useState<Map<string, CachedProfile>>(
    new Map()
  );
  const [currentUserProfile, setCurrentUserProfile] =
    useState<CachedProfile | null>(null);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(true);

  // Load cached profiles from localStorage on mount
  useEffect(() => {
    const loaded = loadProfiles();
    setProfiles(loaded);
  }, []);

  // Save to localStorage when profiles change
  useEffect(() => {
    if (profiles.size > 0) {
      saveProfiles(profiles);
    }
  }, [profiles]);

  // Load current user's profile from cache when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const normalized = address.toLowerCase();
      const cached = profiles.get(normalized);
      setCurrentUserProfile(cached || null);
    } else {
      setCurrentUserProfile(null);
    }
    setIsLoadingCurrentUser(false);
  }, [isConnected, address, profiles]);

  const getProfile = useCallback(
    (walletAddress: string): CachedProfile | null => {
      const normalized = walletAddress.toLowerCase();
      return profiles.get(normalized) || null;
    },
    [profiles]
  );

  const setProfile = useCallback((profile: CachedProfile) => {
    const normalized = profile.walletAddress.toLowerCase();
    const updated = {
      ...profile,
      walletAddress: normalized,
      cachedAt: Date.now(),
    };
    setProfiles((prev) => {
      const next = new Map(prev);
      next.set(normalized, updated);
      return next;
    });
  }, []);

  const value: ProfileCacheContextType = {
    getProfile,
    setProfile,
    currentUserProfile,
    isLoadingCurrentUser,
  };

  return (
    <ProfileCacheContext.Provider value={value}>
      {children}
    </ProfileCacheContext.Provider>
  );
}

export function useProfileCache(): ProfileCacheContextType {
  const context = useContext(ProfileCacheContext);
  if (!context) {
    throw new Error("useProfileCache must be used within a ProfileCacheProvider");
  }
  return context;
}
