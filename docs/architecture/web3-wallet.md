# Web3 / Wallet / Chains

**Scope:** wallet connection (Dynamic.xyz + Wagmi), supported-chain config, ERC-20 token metadata/balances, Uniswap v3 swaps, USDC balance polling, Coinbase fiat onramp. Out of scope: `ContractNFT` minting/signing (see `contracts-nft.md`) and IPFS metadata upload details (owned by that doc; noted here only as a shared dependency).

## Purpose

The app needs a connected EVM wallet to do anything on-chain: mint/sign contract NFTs, swap tokens, and buy USDC with fiat. This subsystem wires up Dynamic.xyz as the wallet UI/connector layer, feeds it into Wagmi so the rest of the app can use standard `wagmi` hooks, and layers a hand-rolled (non-SDK) Uniswap v3 swap integration plus a Coinbase Onramp popup flow on top.

## Key modules

- `src/wagmi.ts` — the single `wagmi` `config` object (chains + transports), imported everywhere `wagmi/actions` functions need explicit config.
- `src/components/DynamicProviders.tsx` — top-level provider tree: `DynamicContextProvider` → `DynamicWagmiConnector` → `ProfileCacheProvider` (xaomsg's profile cache, unrelated to wallet but nested here). This is where the Dynamic environment ID and custom EVM network metadata (icons, explorer URLs) live.
- `src/hooks/useWeb3.ts` — thin wrapper over `useAccount()`; exposes `address`, `isConnected`, `chain`, and `isBaseNetwork`.
- `src/lib/web3/chains.ts` — `CHAINS` (RPC URLs for base/baseSepolia/sepolia), `CONTRACT_ADDRESSES` (per-chain `ContractNFT` + `ShowContractFactory` addresses, env-driven), `TREASURY_ADDRESS`, `USDC_ADDRESS_TESTNET`/`MAINNET`, `DEFAULT_CHAIN`.
- `src/lib/web3/tokens.ts` — `TOKENS_BY_CHAIN` curated token list (USDC/WETH/UNI/cbBTC on Base; WETH/USDC on Base Sepolia), `getTokensForChain`, `findToken`, `findTokenBySymbol`, `SWAP_SUPPORTED_CHAIN_IDS`.
- `src/lib/web3/uniswap.ts` — all static Uniswap v3 config: contract addresses (Universal Router, Permit2, QuoterV2, Factory) per chain, minimal ABIs, `SLIPPAGE_BPS`, deadlines, Universal Router command bytes, Permit2 EIP-712 domain/types.
- `src/lib/web3/usdc.ts` — `usdcAddressForChain`, `readUsdcBalance`, `waitForUsdcBalance` (polling helper used after fiat onramp/funding flows).
- `src/lib/coinbase/onramp.ts` — builds a Coinbase Pay URL and opens/manages the onramp popup window.
- `src/hooks/useUniswapSwap.ts` — imperative swap execution (approve → Permit2 sign → Universal Router `execute`).
- `src/hooks/useSwapQuote.ts` — debounced multi-fee-tier quote via `QuoterV2.quoteExactInputSingle` (simulated, not a real call).
- `src/hooks/useSwapHistory.ts` — reconstructs a user's swap history by discovering pools and scanning `Swap` event logs over a recent block window (no indexer).
- `src/hooks/useTokenList.ts` — batched `balanceOf` reads (via `useReadContracts`) for the curated token list.
- `src/hooks/useUniswapTokenList.ts` — fetches `https://tokens.uniswap.org`, caches it (in-memory + `sessionStorage`, 1h TTL), unions it with the curated list.

## Data flow / lifecycle

**Connect:** `DynamicProviders` (`src/components/DynamicProviders.tsx:92-102`) wraps the app (mounted from `_app`/root layout). `DynamicContextProvider` handles the actual wallet-connect UI/modal; `DynamicWagmiConnector` bridges the resulting session into the shared `wagmi` `config` from `src/wagmi.ts`, so every subsequent `useAccount`/`useAccount`-derived hook (including `useWeb3`) just works via normal Wagmi state — there's no separate "Dynamic address" to reconcile.

**Chain support:** `src/wagmi.ts` declares 6 chains (`baseSepolia`, `base`, `mainnet`, `polygon`, `optimism`, `arbitrum`) with per-chain `transports`. `DynamicProviders.tsx` separately declares `EVM_NETWORKS` (chain metadata: icons, explorer URLs, RPC URLs) passed to Dynamic via `overrides.evmNetworks` — **this list is maintained by hand and must be kept in sync with `wagmi.ts`'s chain list**; nothing enforces it programmatically.

**Swap flow** (`useUniswapSwap.ts:65-213`), driven by user input into a swap UI (quote comes from `useSwapQuote`):
1. `approving` — read ERC-20 `allowance(owner, permit2)`; if insufficient, `approve(permit2, MAX_UINT256)` (one-time, infinite approval to Permit2, not to the router).
2. `signing` — read the Permit2 `allowance(owner, token, spender=universalRouter)` nonce, build a `PermitSingle` (30-day expiration), sign it as EIP-712 typed data (`permit2Domain`, `PERMIT_SINGLE_TYPES`).
3. `swapping` — encode Universal Router `execute()` with commands `[PERMIT2_PERMIT, V3_SWAP_EXACT_IN]`, `amountOutMin` from `applySlippage` (0.5% slippage, `SLIPPAGE_BPS`), 30-min deadline. Send tx, wait for receipt.

**Quotes** (`useSwapQuote.ts`): 300ms-debounced effect that calls `simulateContract` for `quoteExactInputSingle` across all `SUPPORTED_FEE_TIERS` (500/3000/10000) in parallel via `Promise.allSettled`, picks the best `amountOut`.

**Swap history** (`useSwapHistory.ts`): no subgraph/indexer. On mount (and every 15s / on window focus), it (1) brute-force discovers pools for every token pair × fee tier via `Factory.getPool`, (2) scans `Swap` events over the last `HISTORY_BLOCK_WINDOW` (10,000 blocks), chunked into ≤2,000-block `eth_getLogs` requests (`MAX_LOGS_RANGE`, sized for Base Sepolia's public RPC cap), (3) resolves block timestamps, (4) derives in/out token+amount from the sign of `amount0`/`amount1` per Uniswap V3 convention.

**Fiat onramp:** `buildOnrampUrl` constructs a `pay.coinbase.com` URL keyed by `CDP_PROJECT_ID`/network/destination address; `openOnrampPopup` opens it as a sized popup window (falls back to a new tab if popups are blocked) and polls `popup.closed` every 500ms to fire an `onClose` callback. Callers (`src/pages/event/[id]/confirm.tsx`, `src/components/FundTicketButton.tsx`) then presumably use `waitForUsdcBalance` to detect the funds landing.

## Key types / config

- Supported swap chains: Base + Base Sepolia only (`SWAP_SUPPORTED_CHAIN_IDS`), even though wallet connect supports 6 chains — the difference is deliberate (Uniswap deployment addresses only exist for those two here).
- `TokenInfo { address, symbol, name, decimals, icon }` — the shared token shape across swap hooks.
- Env vars this subsystem reads: `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`, `NEXT_PUBLIC_CONTRACT_NFT_MAINNET`/`TESTNET`, `NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_MAINNET`/`TESTNET`, `NEXT_PUBLIC_TREASURY_ADDRESS`, `NEXT_PUBLIC_ENABLE_FIAT_ONRAMP`, `NEXT_PUBLIC_CDP_PROJECT_ID`. (`ShowContractFactory` and treasury/onramp vars aren't in the root `CLAUDE.md` env list — add them there if this becomes the source of truth.)

## Integration points

- **contracts-nft**: consumes the wallet address/chain via plain `wagmi` hooks (`useAccount`, `writeContract` against `config` from `src/wagmi.ts`) directly, not through `useWeb3` — `useWeb3` is only used where `isBaseNetwork` gating matters. `CONTRACT_ADDRESSES` in `chains.ts` is the address source for both `ContractNFT` and `ShowContractFactory`.
- **contracts-nft / xaomsg off-chain contracts**: `src/lib/web3/ipfs.ts` (owned by contracts-nft doc) uploads contract metadata; today `useDataUri` defaults to `true`, so metadata is embedded as a `data:` URI, not actually pinned to IPFS, unless a caller explicitly passes `false` and Pinata keys are configured.
- **xaomsg session signing**: uses its own wallet-signature flow (`session.ts`) independent of this subsystem, but both ultimately sign through the same connected Dynamic/Wagmi wallet.
- **Ticketing**: `FundTicketButton.tsx` and the event purchase-confirm page use the onramp + `waitForUsdcBalance` to get a user from "no USDC" to "can buy a ticket."

## Gotchas & constraints

- **Two different "testnet USDC" addresses exist and are NOT interchangeable**: `chains.ts`'s `USDC_ADDRESS_TESTNET` (`0x06B18F78…`, the app's original faucet token, used by `usdc.ts`'s balance reads) vs. `tokens.ts`'s Base Sepolia USDC entry (`0x036CbD53…`, Circle's official testnet USDC, required because it's the one with actual Uniswap pool liquidity). Balance-checking code and swap code are silently looking at different tokens on testnet.
- **`EVM_NETWORKS` in `DynamicProviders.tsx` is a hand-maintained duplicate** of the chain list in `wagmi.ts`. Adding/removing a chain requires updating both, plus `CONTRACT_ADDRESSES`/`TOKENS_BY_CHAIN`/`SWAP_SUPPORTED_CHAIN_IDS` if the new chain needs contracts or swaps.
- **`useUniswapSwap` does infinite ERC-20 approval to Permit2** (`MAX_UINT256`), not a bounded amount — standard Permit2 pattern (Permit2 itself gates the router via time-boxed `PermitSingle`), but worth knowing before assuming approvals are amount-scoped.
- **Swap history has no indexer and is bounded to the last ~10k blocks** — a swap older than that window (or before pool discovery covered the token pair) will not appear. Pool discovery is O(tokens² × fee tiers) `getPool` calls, done client-side on every load.
- **`sepolia.rpcUrl` in `chains.ts` hardcodes a public shared Infura project ID** (`9aa3d95b…`) — fine for light use, but it's a shared/rate-limited endpoint, not project-specific.
- **`generateTermsHash` in `ipfs.ts`** (contracts-nft's file, flagged here because it's easy to miss) is not a real hash — it hex-encodes `party1:party2:Date.now()`. Anyone relying on it for tamper-evidence should know it isn't one yet.
- `useAccount()`'s `chain` can be `undefined` (wrong/unrecognized network); `useWeb3` normalizes this to `{ id: 0 }` rather than `undefined`, so downstream code checking `chain.id === 8453` etc. won't throw, but `0` is a fake chain id that could accidentally match a naive `!chainId` check as falsy while still being an object.
