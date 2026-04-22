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
    ContractNFT:             process.env.NEXT_PUBLIC_CONTRACT_NFT_MAINNET            || '0x',
    ShowContractFactory:     process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_MAINNET   || '0x',
    ShowContractImpl:        process.env.NEXT_PUBLIC_SHOW_CONTRACT_IMPL_MAINNET      || '0x',
    XAOTicketDeployer:       process.env.NEXT_PUBLIC_XAO_TICKET_DEPLOYER_MAINNET     || '0x',
    ArbitrationAgent:        process.env.NEXT_PUBLIC_ARBITRATION_AGENT_MAINNET       || '0x',
    XAOWalletFactory:        process.env.NEXT_PUBLIC_XAO_WALLET_FACTORY_MAINNET      || '0x',
    PaymentScheduleKeeper:   process.env.NEXT_PUBLIC_PAYMENT_SCHEDULE_KEEPER_MAINNET || '0x',
    EventContractFactory:    process.env.NEXT_PUBLIC_EVENT_CONTRACT_FACTORY_MAINNET  || '0x',
    XAONFT:                  process.env.NEXT_PUBLIC_XAO_NFT_MAINNET                 || '0x',
  },
  [baseSepolia.id]: {
    ContractNFT:             process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET            || '0x',
    // Clone-based suite (deployed 2026-04-22): factory creates EIP-1167 proxies
    // of the implementation that forward all calls to it, keeping factory
    // bytecode under EIP-170's 24,576-byte limit.
    ShowContractFactory:     process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET   || '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3',
    ShowContractImpl:        process.env.NEXT_PUBLIC_SHOW_CONTRACT_IMPL_TESTNET      || '0x6e340723a0AF5F52ad50f0554576b62ceA4151cE',
    XAOTicketDeployer:       process.env.NEXT_PUBLIC_XAO_TICKET_DEPLOYER_TESTNET     || '0x9aA1E64bf604aa9A679322D1d57f861fAB4cC58f',
    ArbitrationAgent:        process.env.NEXT_PUBLIC_ARBITRATION_AGENT_TESTNET       || '0x14844952683Cc79Dfa7F56ddAc532744105604D5',
    XAOWalletFactory:        process.env.NEXT_PUBLIC_XAO_WALLET_FACTORY_TESTNET      || '0xf6A0f98126bab7Fb626117345170A8ad8a8c2b7b',
    PaymentScheduleKeeper:   process.env.NEXT_PUBLIC_PAYMENT_SCHEDULE_KEEPER_TESTNET || '0x3CbbcE8d6B1AaE19cf71eE7bA6d7e41F59ED771f',
    EventContractFactory:    process.env.NEXT_PUBLIC_EVENT_CONTRACT_FACTORY_TESTNET  || '0x529343370ecee1fC9bd7D5a19d28FFaf6287a4aD',
    XAONFT:                  process.env.NEXT_PUBLIC_XAO_NFT_TESTNET                 || '0xca3607B6DA142210e36696e20AeA6c50C514F0c6',
  },
  [sepolia.id]: {
    ContractNFT:             process.env.NEXT_PUBLIC_CONTRACT_NFT_TESTNET            || '0x',
    ShowContractFactory:     process.env.NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET   || '0xab0153ae9c73edE6A7382Fb0CB66957E78f2BBf3',
    ShowContractImpl:        process.env.NEXT_PUBLIC_SHOW_CONTRACT_IMPL_TESTNET      || '0x6e340723a0AF5F52ad50f0554576b62ceA4151cE',
    XAOTicketDeployer:       process.env.NEXT_PUBLIC_XAO_TICKET_DEPLOYER_TESTNET     || '0x9aA1E64bf604aa9A679322D1d57f861fAB4cC58f',
    ArbitrationAgent:        process.env.NEXT_PUBLIC_ARBITRATION_AGENT_TESTNET       || '0x14844952683Cc79Dfa7F56ddAc532744105604D5',
    XAOWalletFactory:        process.env.NEXT_PUBLIC_XAO_WALLET_FACTORY_TESTNET      || '0xf6A0f98126bab7Fb626117345170A8ad8a8c2b7b',
    PaymentScheduleKeeper:   process.env.NEXT_PUBLIC_PAYMENT_SCHEDULE_KEEPER_TESTNET || '0x3CbbcE8d6B1AaE19cf71eE7bA6d7e41F59ED771f',
    EventContractFactory:    process.env.NEXT_PUBLIC_EVENT_CONTRACT_FACTORY_TESTNET  || '0x529343370ecee1fC9bd7D5a19d28FFaf6287a4aD',
    XAONFT:                  process.env.NEXT_PUBLIC_XAO_NFT_TESTNET                 || '0xca3607B6DA142210e36696e20AeA6c50C514F0c6',
  },
};

// Protocol addresses
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x8DAFaBcEb8B05629cf1591A32f5fd8A1c0a75e95';
// USDC on Base Sepolia (circle faucet token)
export const USDC_ADDRESS_TESTNET = '0x06B18F78b695d2C2e7dbCcAe94819a785234Eeae';
export const USDC_ADDRESS_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const DEFAULT_CHAIN = baseSepolia.id; // Default to testnet for development
