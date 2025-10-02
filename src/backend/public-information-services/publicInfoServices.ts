import { supabase } from "../../lib/supabase";

export const handleWalletSelection = (
  value: string,
  identities: any[],
  currentIndex: number,
  setIdentities: (val: any[]) => void
) => {
  const updated = [...identities];
  updated[currentIndex].selectedWalletAddress = value;
  setIdentities(updated);
};


export const updateIdentityField = (
  field: string,
  value: string,
  identities: any[],
  currentIndex: number,
  setIdentities: (val: any[]) => void
) => {
  const updated = [...identities];
  (updated[currentIndex] as any)[field] = value;
  setIdentities(updated);
};


export const toggleGenre = (
  genre: string,
  identities: any[],
  currentIndex: number,
  setIdentities: (val: any[]) => void
) => {
  const updated = [...identities];
  const selected = updated[currentIndex].selectedGenres;
  updated[currentIndex].selectedGenres = selected.includes(genre)
    ? selected.filter((g: string) => g !== genre)
    : [...selected, genre];
  setIdentities(updated);
};


export const handleNext = (setCurrentIndex: any, identities: any[]) => {
  setCurrentIndex((prev: number) => (prev + 1) % identities.length);
};

export const handlePrev = (setCurrentIndex: any, identities: any[]) => {
  setCurrentIndex((prev: number) => (prev - 1 + identities.length) % identities.length);
};


export const handleCopy = async (currentIdentity: any) => {
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


export const handleDeleteIdentity = (
  identities: any[],
  currentIndex: number,
  setIdentities: (val: any[]) => void,
  setCurrentIndex: (val: any) => void
) => {
  if (identities.length > 1) {
    const updated = identities.filter((_, index) => index !== currentIndex);
    setIdentities(updated);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  }
};


export const handleSignOut = async (router: any) => {
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  router.push("/dashboard");
};
