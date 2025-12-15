/**
 * Utility function to upload contract metadata to IPFS
 * Using Pinata (free tier available at pinata.cloud)
 * Or return a data URI for testing
 */

interface ContractMetadata {
  party1: string;
  party2: string;
  termsHash: string;
  createdAt: number;
}

export const uploadContractMetadata = async (
  metadata: ContractMetadata,
  useDataUri: boolean = true // Set to false when integrating real IPFS
): Promise<string> => {
  const jsonString = JSON.stringify(metadata);

  if (useDataUri) {
    // For testing/development: return data URI
    const base64 = Buffer.from(jsonString).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  // Production: upload to IPFS via Pinata
  const formData = new FormData();
  const blob = new Blob([jsonString], { type: 'application/json' });
  formData.append('file', blob);

  const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error('Pinata API keys not configured');
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretKey,
    },
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${result.error}`);
  }

  return `ipfs://${result.IpfsHash}`;
};

/**
 * Generate contract terms hash from contract data
 * In production, you'd serialize and hash the full contract terms
 */
export const generateTermsHash = (party1: string, party2: string): string => {
  // Simple hash for demo - in production use keccak256 or similar
  const combined = `${party1}:${party2}:${Date.now()}`;
  return Buffer.from(combined).toString('hex');
};
