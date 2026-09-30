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
  // Preserve profile cache across sign-outs
  const profileCache = localStorage.getItem('xao-cult-profile-cache');
  localStorage.clear();
  if (profileCache) {
    localStorage.setItem('xao-cult-profile-cache', profileCache);
  }
  sessionStorage.clear();
  router.push("/");
};

// Permanently delete the profile: wipe EVERYTHING for this app on this device —
// profile cache, chat keys/session, drafts, notifications — plus the wallet
// (Dynamic) session, then send the user back to login. Unlike handleSignOut this
// does NOT preserve the profile cache. On-chain data (contracts, tickets, the
// on-chain username) cannot be deleted and is untouched.
export const handleDeleteProfile = async (router: any, logOut?: () => Promise<void>) => {
  try {
    if (logOut) await logOut();
  } catch (e) {
    console.warn('[delete-profile] wallet logout failed (continuing to wipe local data):', e);
  }
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn('[delete-profile] storage clear failed:', e);
  }
  router.replace('/');
};
