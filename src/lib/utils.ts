/**
 * Formats a wallet address as a valid email format for authentication
 * @param walletAddress Ethereum wallet address
 * @returns A valid email format using the wallet address
 */
export const formatWalletEmail = (walletAddress: string | undefined): string => {
  if (!walletAddress) return '';
  
  // Create a valid email format with shorter address part
  // Using first 8 characters of the address to keep it shorter and valid
  const shortAddress = walletAddress.toLowerCase().substring(2, 10);
  return `wallet_${shortAddress}@example.com`;
};

/**
 * Extracts a wallet address from a wallet-formatted email
 * @param email Email in wallet format
 * @returns The original wallet address, or null if not in wallet format
 */
export const extractWalletAddress = (email: string): string | null => {
  if (!email.endsWith('@example.com') || !email.startsWith('wallet_')) {
    return null;
  }
  
  // We can't fully recover the original address since we only store part of it
  // This function is mainly for identification purposes
  const addressPart = email.substring(7, email.indexOf('@'));
  return `0x${addressPart}`;
}; 