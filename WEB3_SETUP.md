# NFT Contract Setup Guide

## Overview
Your XAO Cult application now includes Web3 functionality to mint contract agreements as NFTs on Base testnet (Base Sepolia) and mainnet.

## New Folder Structure

```
src/
├── lib/web3/
│   ├── chains.ts          # Chain configs (Base, Base Sepolia)
│   └── contracts.ts       # Contract ABI
├── hooks/
│   ├── useWeb3.ts         # Basic wallet connection hook
│   ├── useMintContractNFT.ts  # NFT minting hook
│   └── useContractNFT.ts  # Contract read hooks
├── components/
│   └── UserNFTs.tsx       # Display user's contract NFTs
└── styles/
    └── UserNFTs.module.css
```

## Setup Steps

### 1. Deploy Smart Contract

The contract is located at `contracts/ContractNFT.sol`. Deploy it using:

**Hardhat:**
```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
```

**Remix IDE:**
- Go to https://remix.ethereum.org
- Create new file: `ContractNFT.sol`
- Copy contents from `contracts/ContractNFT.sol`
- Compile and deploy to Base Sepolia testnet

After deployment, update environment variables with contract address.

### 2. Set Environment Variables

Create `.env.local`:

```bash
# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract Addresses (deploy first, then add here)
NEXT_PUBLIC_CONTRACT_NFT_TESTNET=0x... # Base Sepolia contract address
NEXT_PUBLIC_CONTRACT_NFT_MAINNET=0x...  # Base mainnet contract address
```

### 3. Test Network Setup

Ensure you have testnet ETH:

**Base Sepolia Faucet:**
- https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Or use Alchemy/Infura faucets

**Base Sepolia Network (Add to MetaMask):**
- RPC: https://sepolia.base.org
- Chain ID: 84532
- Currency: ETH
- Block Explorer: https://sepolia.basescan.org/

### 4. Update Dashboard

Import `UserNFTs` component in your dashboard page:

```tsx
import { UserNFTs } from "../../components/UserNFTs";

// In your dashboard component:
<UserNFTs />
```

## How It Works

### Creating & Minting Contracts

1. User fills in **Party 1** and **Party 2** on create-contract page
2. User clicks **Save** button
3. Frontend:
   - Checks wallet is connected and on correct chain
   - Serializes contract terms to JSON
   - Calls `mintContractNFT()` smart contract function with full terms data
4. User signs transaction in wallet
5. NFT is minted with full contract terms stored on-chain on Base blockchain

### Viewing Contract NFTs

1. Dashboard loads user's NFTs via `useGetUserNFTs` hook
2. Hook calls contract's `getUserNFTs()` function
3. For each tokenId, fetch contract data via `useGetContractData`
4. Display in responsive grid with:
   - Party names
   - Created date
   - Signed/Unsigned status
   - Full contract terms

## File Changes Summary

### Modified Files
- `src/wagmi.ts` - Updated with Base chains support
- `src/pages/contracts/create-contract.tsx` - Added NFT minting logic

### New Files
- `src/lib/web3/chains.ts` - Chain configurations
- `src/lib/web3/contracts.ts` - Contract ABI
- `src/hooks/useWeb3.ts` - Wallet connection hook
- `src/hooks/useMintContractNFT.ts` - Minting hook
- `src/hooks/useContractNFT.ts` - Read contract data hook
- `src/components/UserNFTs.tsx` - NFT display component
- `src/styles/UserNFTs.module.css` - Component styles
- `src/backend/contracts.ts` - Backend service for mint argument preparation
- `contracts/ContractNFT.sol` - Smart contract

## Testing Checklist

- [ ] Wallet connects properly
- [ ] Can switch to Base Sepolia testnet
- [ ] Create contract with Party 1 and Party 2
- [ ] Transaction appears in wallet
- [ ] NFT mints successfully
- [ ] Transaction visible on BaseScan Sepolia
- [ ] Dashboard shows newly minted NFT
- [ ] NFT data displays correctly (parties, timestamp, status)

## Smart Contract Functions

### `mintContractNFT(party1, party2, terms)`
- Mints a new contract NFT with full terms stored on-chain
- Returns: `tokenId`
- Emits: `ContractMinted` event

### `getUserNFTs(user)`
- Returns array of token IDs owned by user
- Read-only function

### `getContractData(tokenId)`
- Returns contract metadata struct
- Contains: party1, party2, terms, createdAt, isSigned
- Read-only function

### `signContract(tokenId)`
- Marks contract as signed (requires owner)
- Emits: `ContractSigned` event

## Production Considerations

1. **On-Chain Storage**: Contract terms are stored directly on-chain for transparency and immutability. Consider gas costs for large terms strings.

2. **Contract Security**: Have contract audited before mainnet deployment

3. **Gas Optimization**: Current contract is feature-complete but not optimized
   - Consider batch operations for multiple contract mints
   - Optimize storage layout

4. **Mainnet Deployment**: When ready to deploy to production:
   - Deploy to Base mainnet (Chain ID 8453)
   - Update `NEXT_PUBLIC_CONTRACT_NFT_MAINNET` in `.env.local`
   - Test thoroughly on testnet first

## Troubleshooting

**"Chain not supported"**: Ensure you're on Base Sepolia (84532) or Base mainnet (8453)

**"Contract address not found"**: Update `.env.local` with deployed contract address

**"Transaction reverted"**: Check:
   - Sufficient gas
   - Valid contract address
   - Correct chain
   - Party1/Party2 not empty

**NFTs not showing on dashboard**: 
   - Verify contract address is correct
   - Check wallet is connected
   - Ensure you're viewing from the minting address
   - Allow time for blockchain confirmation

## Next Steps

1. Deploy `ContractNFT.sol` to Base Sepolia testnet
2. Update `.env.local` with contract address
3. Add `<UserNFTs />` to dashboard
4. Test minting on testnet
5. Once working, deploy to Base mainnet
6. Integrate IPFS for document storage
7. Add signature validation (ECDSA)
