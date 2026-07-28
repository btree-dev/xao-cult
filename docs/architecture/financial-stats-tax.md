# Financial Stats & Tax

**Scope:** the `/stats/*` token-swap + transaction-history UI, and the `/tax/*` tax-document locker. Excludes `/stats/tickets` (ticket sales stats — see `events-tickets.md`) and event-search filtering helpers that happen to live in a file named `dashboardHelpers.ts` (see Gotchas).

## Purpose

"Financial Stats" is not a revenue/analytics dashboard — it's a **Uniswap v3 token-swap widget** (`/stats/swap-token`) plus a **read-only on-chain swap history** (`/stats/transaction-history`) for the connected wallet, scoped to Base and Base Sepolia. "Tax" is a **client-only document locker**: users upload tax forms (W-9, W-8BEN, etc.) which are stored as base64 data URLs in `localStorage` and linked out to official IRS/OECD PDF sources — there is no backend, no server-side storage, and no actual tax computation anywhere in this subsystem.

## Key modules

- `src/pages/stats/index.tsx` — redirects to `/stats/swap-token`.
- `src/pages/stats/swap-token.tsx` — main swap UI: pay/get token pickers, quote, execute swap, chain switcher (Base ⇄ Base Sepolia).
- `src/pages/stats/search-token.tsx` — token picker sub-page, writes the chosen token back via `localStorage` (`selectedPayToken` / `selectedGetToken`, keyed by symbol only) and `router.back()`.
- `src/pages/stats/transaction-history.tsx` — lists the wallet's Uniswap swaps for the active/fallback chain; "Transfer" tab is a stub (always empty, "coming soon").
- `src/pages/tax/tax-documents.tsx` — lists/opens/deletes uploaded tax PDFs; upload itself happens elsewhere (see Gotchas).
- `src/hooks/useTokenList.ts` — reads ERC-20 balances for `TOKENS_BY_CHAIN[chainId]` for "My Assets".
- `src/hooks/useSwapQuote.ts` — quotes a swap (amount out, price, fee tier) for a token pair.
- `src/hooks/useUniswapSwap.ts` — drives the approve → sign → swap state machine (`swapState`: idle/approving/signing/swapping/success/error).
- `src/hooks/useSwapHistory.ts` — the actual "transaction history" data source (see Data flow).
- `src/lib/web3/tokens.ts` — `TOKENS_BY_CHAIN`, `TokenInfo`, `SwapChainId`, `isSwapSupportedChain`.
- `src/lib/web3/uniswap.ts` — Uniswap v3 factory/router addresses, ABI fragments, `SUPPORTED_FEE_TIERS`.
- `src/backend/taxdata.ts` — a static hardcoded `taxDocs` array. **Appears unused** (see Gotchas).
- `src/backend/tax-services/InfotipContent.ts` — static copy for a "What To Do" info tooltip on the tax page.
- `src/backend/services/dashboardHelpers.ts` — NOT part of this subsystem despite the name; see Gotchas.
- `src/backend/services/types/api.ts` — generic `IVenue`/`IArtist`/`IEvent`/`APIResponse<T>` types; belongs to the events domain, not finance. Grouped under `backend/services/` for no finance-specific reason.

## Data flow

**Swap:** `swap-token.tsx` reads the connected wallet/chain via `useWeb3()`. Token choice defaults to USDC→WETH, overridable via `search-token.tsx`, persisted to `localStorage` **by symbol only** (`selectedPayToken`/`selectedGetToken`), then re-resolved to a full `TokenInfo` against `TOKENS_BY_CHAIN[pickerChainId]` on load. `useSwapQuote` and `useUniswapSwap` talk to Uniswap v3 contracts directly via wagmi/viem — there is no price/quote API and no Supabase involvement. On swap success the user is routed to `/stats/transaction-history`.

**Transaction history:** there is no swap-history indexer or database. `useSwapHistory` (`src/hooks/useSwapHistory.ts:76`) re-derives history live from chain by: (1) enumerating candidate pools via `factory.getPool(tokenA, tokenB, fee)` for every token pair × `SUPPORTED_FEE_TIERS`, (2) `eth_getLogs` for Uniswap v3 `Swap` events on those pool addresses filtered by `recipient == address`, over only the **last ~10,000 blocks** (`HISTORY_BLOCK_WINDOW`, `useSwapHistory.ts:24`), chunked into ≤2000-block requests to satisfy the Base Sepolia public RPC's log-range cap. It polls every 15s and on window focus. This means: swaps older than the block window silently disappear from history, and a swap on a fee tier not in `SUPPORTED_FEE_TIERS` or a pool that doesn't exist yet won't be found.

**Tax:** `tax-documents.tsx` reads/writes `localStorage["taxDocs"]` directly (list of `{id, name, fileName, size, uploadDate, dataUrl}`) — no backend call. Deleting filters the array and rewrites it. PDF viewing decodes the stored data URL to a `Blob` and opens it in a new tab.

## Data model / key types

- `TokenInfo` (`src/lib/web3/tokens.ts:3`): `{ address, symbol, name, decimals, icon }`.
- `SwapChainId = base.id | baseSepolia.id` — the only two chains the swap UI supports (`isSwapSupportedChain` guards this everywhere).
- `SwapHistoryEntry` (`src/hooks/useSwapHistory.ts:11`): `{ txHash, blockNumber, timestamp, tokenIn, tokenOut, amountIn, amountOut, amountInFormatted, amountOutFormatted }`.
- Tax `FileItem` (`src/pages/tax/tax-documents.tsx:9`): `{ id, name, fileName, size, uploadDate, dataUrl }` — `size`/`uploadDate` are display strings, not derived/formatted numbers or real `Date`s.

## Integration points

- Wallet/chain state comes from `useWeb3()` (see `web3-wallet.md`), same Dynamic.xyz/wagmi connection used app-wide.
- Swap execution reads/writes on-chain state directly (Uniswap v3 on Base/Base Sepolia) — no Supabase, no `src/backend` service layer.
- Tax documents are pure client-local state; nothing here is shared cross-device or synced to any other subsystem (e.g., not wired into `contracts-nft.md`'s counterparty flows despite `InfotipContent.ts` claiming uploads "can be shared securely in contracts").

## Gotchas & constraints

- **`dashboardHelpers.ts` is misfiled here by name only.** It contains event search/filter/geocoding logic (Nominatim geocoding, Haversine distance, date/genre/location filtering for events and signed contracts) — nothing financial. It belongs conceptually with events search (`events-tickets.md` or a future `search`/`events` doc); it's listed in this doc only because it was in scope for this pass. Don't assume "dashboard" here means financial.
- **`taxdata.ts`'s `taxDocs` array is dead code** — grep shows no import of it anywhere; the live tax page reads exclusively from `localStorage["taxDocs"]`, which is populated by an upload handler in `src/components/BackNav.tsx` (not in this doc's scope), not by this seed data.
- **Tax documents never leave the browser.** No upload endpoint, no Supabase table for tax docs — clearing site data or switching devices loses them. Anyone touching this needs to decide if that's acceptable before building on top of it.
- **Two different Base Sepolia USDC tokens exist in the codebase.** `TOKENS_BY_CHAIN[baseSepolia.id]` uses Circle's official testnet USDC (`0x036CbD5...`) for Uniswap pool compatibility — explicitly *not* the same address as "the app's existing USDC faucet token" referenced in a comment at `tokens.ts:50`. Don't assume USDC is a single canonical address across the app.
- **Swap token selection persistence is symbol-only**, not address/chain-scoped — `localStorage` just stores `{symbol}` and re-resolves against whatever chain is active later, so switching chains can silently re-resolve "USDC" to a different contract address.
- **Transaction history has no pagination and a hard lookback window** (~10k blocks); it is not a complete or archival record.
- **"Transfer" tab in transaction history is non-functional** (`activeTab === 'Transfer'` always renders empty with "coming soon").
- No currency conversion/fiat pricing anywhere in this subsystem — all amounts are token-native (formatted via `formatUnits`), not USD.
