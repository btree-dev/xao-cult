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
    EventContractFactory: process.env.NEXT_PUBLIC_EVENT_CONTRACT_FACTORY_MAINNET || '0xce1960114318676834252fe78447c27501161149',
  },
  [baseSepolia.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET || '0x',
    EventContractFactory: process.env.NEXT_PUBLIC_EVENT_CONTRACT_FACTORY_TESTNET || '0xce1960114318676834252fe78447c27501161149',
  },
  [sepolia.id]: {
    ContractNFT: process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET || '0x',
    EventContractFactory: process.env.NEXT_PUBLIC_EVENT_CONTRACT_FACTORY_TESTNET || '0xce1960114318676834252fe78447c27501161149',
  },
};

export const DEFAULT_CHAIN = baseSepolia.id; // Default to testnet for development
