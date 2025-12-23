import { base, baseSepolia } from 'wagmi/chains';

export const CHAINS = {
  base: {
    id: base.id,
    name: base.name,
    rpcUrl: 'https://mainnet.base.org',
  },
  baseSepolia: {
    id: baseSepolia.id,
    name: baseSepolia.name,
    rpcUrl: 'https://sepolia.base.org',
  },
};

export const CONTRACT_ADDRESSES = {
  [base.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_MAINNET || '0x',
  },
  [baseSepolia.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET || '0x',
  },
};

export const DEFAULT_CHAIN = baseSepolia.id; // Default to testnet for development
