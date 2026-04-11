import { base, baseSepolia, sepolia } from 'wagmi/chains';

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
  sepolia: {
    id: sepolia.id,
    name: sepolia.name,
    rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  },
};

export const CONTRACT_ADDRESSES = {
  [base.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_MAINNET || '0x',
    ShowContractFactory: process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_MAINNET || '0x',
  },
  [baseSepolia.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET || '0x',
    ShowContractFactory: process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET || '0x56b1AbF4A672c2f3D8A9bA380E07C32b5AaeeaB2',
  },
  [sepolia.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET || '0x',
    ShowContractFactory: process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET || '0x56b1AbF4A672c2f3D8A9bA380E07C32b5AaeeaB2',
  },
};

// Protocol addresses
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x8DAFaBcEb8B05629cf1591A32f5fd8A1c0a75e95';
// USDC on Base Sepolia (circle faucet token)
export const USDC_ADDRESS_TESTNET = '0x06B18F78b695d2C2e7dbCcAe94819a785234Eeae';
export const USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const DEFAULT_CHAIN = baseSepolia.id; // Default to testnet for development
