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
    ShowContractFactory: process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET || '0x2946780962EA1AA50Dd632b51Ef837ED82C76C41',
  },
  [sepolia.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET || '0x',
    ShowContractFactory: process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET || '0x2946780962EA1AA50Dd632b51Ef837ED82C76C41',
  },
};

// Protocol addresses
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x8DAFaBcEb8B05629cf1591A32f5fd8A1c0a75e95';
// Circle's official USDC. Base Sepolia must match what the ShowContracts are
// deployed with (scripts/createShowContract.js in xao.contracts.v2 uses this
// address) — otherwise the balance check / approve target the wrong token and
// buying fails even when the wallet holds USDC. This is only a fallback: the buy
// flow reads the exact token from the contract's usdc() getter.
export const USDC_ADDRESS_TESTNET = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const DEFAULT_CHAIN = baseSepolia.id; // Default to testnet for development
