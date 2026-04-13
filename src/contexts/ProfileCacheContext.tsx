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

  // Fetch profile from Supabase for a given auth user
  const fetchProfile = useCallback(async (userId: string) => {
    if (!address) return;

    setIsLoadingCurrentUser(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[ProfileCache] Error fetching profile:", error.message);
      }

      setCurrentUserProfile({
        username: data?.username || `User-${address.slice(2, 8)}`,
        profilePictureUrl: data?.profile_picture_url,
      });
    } catch (e) {
      console.error("[ProfileCache] Exception in fetchProfile:", e);
      setCurrentUserProfile({
        username: `User-${address.slice(2, 8)}`,
        profilePictureUrl: undefined,
      });
    } finally {
      setIsLoadingCurrentUser(false);
    }
  }, [address]);

  // Listen for Supabase auth state changes to avoid race with Dynamic→Supabase session bridge
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && address) {
        fetchProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setCurrentUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [address, fetchProfile]);

  // Reset profile when wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      setCurrentUserProfile(null);
    }
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
