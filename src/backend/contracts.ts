export const BASE_MAINNET_ID = 8453;
export const BASE_SEPOLIA_ID = 84532;

export type MintArgs = [string, string, string];

export interface PreparedMint {
  args: MintArgs;
}

export function validateBaseChain(chainId?: number): string | undefined {
  if (chainId !== BASE_MAINNET_ID && chainId !== BASE_SEPOLIA_ID) {
    return "Please switch to Base Sepolia testnet or Base mainnet";
  }
  return undefined;
}

export async function buildMintArgsFromTerms(
  party1: string,
  party2: string,
  terms: string
): Promise<PreparedMint> {
  if (!party1 || !party2) {
    throw new Error("Please fill in both parties");
  }
  if (!terms) {
    throw new Error("Contract terms cannot be empty");
  }
  const args: MintArgs = [party1, party2, terms];
  return { args };
}
