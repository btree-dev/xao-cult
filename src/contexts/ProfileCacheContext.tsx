import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAccount } from "wagmi";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "xao-cult-profile-cache";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedProfile {
  walletAddress: string;
  username: string;
  profilePictureUrl?: string;
  cachedAt: number;
}

interface CurrentUserProfile {
  username: string;
  profilePictureUrl?: string;
}

interface ProfileCacheContextType {
  getProfile: (walletAddress: string) => CachedProfile | null;
  setProfile: (profile: CachedProfile) => void;
  currentUserProfile: CurrentUserProfile | null;
  isLoadingCurrentUser: boolean;
}

const ProfileCacheContext = createContext<ProfileCacheContextType | null>(null);

interface ProfileCacheProviderProps {
  children: ReactNode;
}

export function ProfileCacheProvider({ children }: ProfileCacheProviderProps) {
  const { address, isConnected } = useAccount();
  const [profiles, setProfiles] = useState<Map<string, CachedProfile>>(
    new Map()
  );
  const [currentUserProfile, setCurrentUserProfile] =
    useState<CurrentUserProfile | null>(null);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(false);

  // Load cached profiles from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, CachedProfile>;
        const now = Date.now();
        const validProfiles = new Map<string, CachedProfile>();

        // Filter out expired profiles
        Object.entries(parsed).forEach(([key, profile]) => {
          if (now - profile.cachedAt < CACHE_EXPIRY_MS) {
            validProfiles.set(key.toLowerCase(), profile);
          }
        });

        setProfiles(validProfiles);
      }
    } catch (e) {
      console.error("[ProfileCache] Failed to load from localStorage:", e);
    }
  }, []);

  // Save to localStorage when profiles change
  useEffect(() => {
    if (profiles.size > 0) {
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
  }, [profiles]);

  // Fetch current user's profile from Supabase when wallet connects
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      if (!isConnected || !address) {
        setCurrentUserProfile(null);
        return;
      }

      setIsLoadingCurrentUser(true);

      try {
        // Query profiles table by wallet address
        const { data, error } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .contains("wallet_addresses", [address.toLowerCase()])
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows found
          console.error("[ProfileCache] Error fetching profile:", error);
        }

        if (data) {
          setCurrentUserProfile({
            username: data.username || `User-${address.slice(2, 8)}`,
            profilePictureUrl: data.avatar_url,
          });
        } else {
          // No profile found, use default
          setCurrentUserProfile({
            username: `User-${address.slice(2, 8)}`,
            profilePictureUrl: undefined,
          });
        }
      } catch (e) {
        console.error("[ProfileCache] Failed to fetch current user:", e);
        // Set default profile on error
        setCurrentUserProfile({
          username: `User-${address.slice(2, 8)}`,
          profilePictureUrl: undefined,
        });
      } finally {
        setIsLoadingCurrentUser(false);
      }
    };

    fetchCurrentUserProfile();
  }, [isConnected, address]);

  const getProfile = useCallback(
    (walletAddress: string): CachedProfile | null => {
      const normalized = walletAddress.toLowerCase();
      const profile = profiles.get(normalized);

      if (!profile) return null;

      // Check if expired
      if (Date.now() - profile.cachedAt > CACHE_EXPIRY_MS) {
        // Remove expired profile
        setProfiles((prev) => {
          const next = new Map(prev);
          next.delete(normalized);
          return next;
        });
        return null;
      }

      return profile;
    },
    [profiles]
  );

  const setProfile = useCallback((profile: CachedProfile) => {
    const normalized = profile.walletAddress.toLowerCase();
    setProfiles((prev) => {
      const next = new Map(prev);
      next.set(normalized, {
        ...profile,
        walletAddress: normalized,
        cachedAt: Date.now(),
      });
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
