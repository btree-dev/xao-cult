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
      console.log("[ProfileCache] fetchCurrentUserProfile called, isConnected:", isConnected, "address:", address);

      if (!isConnected || !address) {
        console.log("[ProfileCache] Not connected or no address, clearing profile");
        setCurrentUserProfile(null);
        return;
      }

      setIsLoadingCurrentUser(true);

      try {
        // First, get the current Supabase auth user
        console.log("[ProfileCache] Calling supabase.auth.getUser()...");
        const { data: authData, error: authError } = await supabase.auth.getUser();

        console.log("[ProfileCache] Auth result - user:", authData?.user?.id, "email:", authData?.user?.email, "error:", authError);

        if (authError) {
          console.error("[ProfileCache] Auth error:", authError);
        }

        if (!authData?.user) {
          console.log("[ProfileCache] No Supabase auth user found, using wallet address fallback");
          setCurrentUserProfile({
            username: `User-${address.slice(2, 8)}`,
            profilePictureUrl: undefined,
          });
          setIsLoadingCurrentUser(false);
          return;
        }

        const user = authData.user;
        console.log("[ProfileCache] Supabase user found, id:", user.id, "querying profiles table...");

        // Query profiles table by user ID (same as dashboard - using select('*'))
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log("[ProfileCache] Profile query result - data:", data, "error:", error);

        if (error) {
          console.error("[ProfileCache] Error fetching profile - code:", error.code, "message:", error.message, "details:", error.details, "hint:", error.hint);
          if (error.code !== "PGRST116") {
            // PGRST116 = no rows found, other errors are real errors
          }
        }

        if (data) {
          console.log("[ProfileCache] ✓ Found user profile! username:", data.username, "picture:", data.profile_picture_url);
          setCurrentUserProfile({
            username: data.username || `User-${address.slice(2, 8)}`,
            profilePictureUrl: data.profile_picture_url,
          });
        } else {
          // No profile found, use default
          console.log("[ProfileCache] No profile row found for user id:", user.id, "using fallback");
          setCurrentUserProfile({
            username: `User-${address.slice(2, 8)}`,
            profilePictureUrl: undefined,
          });
        }
      } catch (e) {
        console.error("[ProfileCache] Exception in fetchCurrentUserProfile:", e);
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
