# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XAO Cult is a Web3 DAO-governed dApp built with Next.js, RainbowKit, and Wagmi for managing smart contract agreements as NFTs on the Base blockchain. It combines traditional contract management with blockchain technology, featuring event management, ticket authentication via QR codes, and financial statistics.

## Essential Commands

```bash
# Development
yarn dev              # Start Next.js dev server (localhost:3000)
yarn build            # Production build
yarn start            # Start production server

# Smart Contracts (Hardhat)
npx hardhat compile                                    # Compile Solidity contracts
npx hardhat run scripts/deploy.ts --network baseSepolia   # Deploy to Base Sepolia testnet
npx hardhat run scripts/deploy.ts --network base          # Deploy to Base mainnet

# Linting
npx eslint .          # Run ESLint (extends next/core-web-vitals)
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (Pages Router), React 19, TypeScript, TailwindCSS
- **Web3**: Wagmi + RainbowKit for wallet connection, Viem for Ethereum interactions
- **Smart Contracts**: Solidity 0.8.20, Hardhat, deployed to Base blockchain (ERC721 NFTs)
- **Backend**: Supabase (PostgreSQL + Auth), MongoDB/Mongoose as alternative
- **State**: Redux Toolkit (minimal), React Query for server state

### Key Directories
```
src/
├── pages/              # Next.js pages (routing)
│   ├── contracts/      # Contract creation, negotiation, details
│   ├── event/[id]/     # Event pages with ticket purchase
│   ├── stats/          # Financial/token statistics
│   └── TicketAuthenticate/  # QR ticket scanning
├── components/         # Reusable UI components
├── hooks/              # Custom hooks (useWeb3, useMintContractNFT, useContractNFT)
├── lib/web3/           # Chain configs, contract ABIs, IPFS utils
├── backend/            # API services and mock data
│   └── services/       # Axios API client and typed services
└── store/              # Redux store setup

contracts/              # Solidity smart contracts
scripts/                # Hardhat deployment scripts
```

### Web3 Integration Flow
1. Wallet connection via RainbowKit (`src/wagmi.ts` configures supported chains)
2. Custom hooks in `src/hooks/` handle contract interactions
3. Contract NFT minting stores agreement terms on-chain (Base blockchain)
4. Supported chains: Ethereum, Polygon, Optimism, Arbitrum, Base, Base Sepolia

### Smart Contract (`contracts/ContractNFT.sol`)
- `mintContractNFT(party1, party2, terms)` - Mint new contract NFT
- `getUserNFTs(user)` - Get user's token IDs
- `getContractData(tokenId)` - Get contract metadata
- `signContract(tokenId)` - Mark contract as signed

## Environment Variables

Required in `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Web3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # from cloud.walletconnect.com
NEXT_PUBLIC_CONTRACT_NFT_TESTNET=       # Base Sepolia contract address
NEXT_PUBLIC_CONTRACT_NFT_MAINNET=       # Base mainnet contract address

# Hardhat deployment
PRIVATE_KEY=
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=
```

## Styling

- **CSS Modules** (`.module.css`) for component-scoped styles - primary styling method
- **TailwindCSS** for utility classes
- Global styles in `src/styles/globals.css`

### Design System

**Color Scheme:**
- Background: Dark with gradient overlay image (`/084251a867b139499f23448c34c1f6f13ca835ec.png`)
- Primary gradient: `linear-gradient(to right, #ff9900, #e100ff)` (orange to pink/purple)
- Text: White (`#fff`) on dark/gradient backgrounds
- Accent gradient: `linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)`

**Common UI Patterns (from `CreateContract.module.css`):**
- `styles.RecievedMessage` - Gradient background message bubble, white text, rounded corners
- `styles.sentMessage` - Black background with gradient border, white text
- `styles.inputRow` / `styles.contractInput` - Black background with gradient border inputs
- `styles.confirmButton` - Full gradient background button
- `styles.docContainer` - Black background container with gradient border

**Key Guidelines:**
- Always use white (`#fff`) text on gradient backgrounds - colored text is unreadable
- Avoid inline styles; use existing CSS module classes for consistency
- Borders use gradient via `background-image` + `background-clip` technique
- Border radius: `30px` for inputs/buttons, `18px` for message bubbles, `46px` for containers
- Max content width: `400px` centered

## Deployment

Deployed via Vercel.
