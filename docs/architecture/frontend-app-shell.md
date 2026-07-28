# Frontend App Shell / Routing / State

**Scope:** how the Next.js Pages Router app is bootstrapped, wrapped in providers, and organized — routing map, provider stack, and non-domain-specific shared UI. Domain logic (messaging, contracts/NFTs, events/tickets, financial stats) lives in its own doc; this one is the orientation map that tells you where to go next.

## Purpose

This is a Next.js **Pages Router** app (not App Router — routes are files under `src/pages/`, not `app/`). A new session should read this doc first to understand how the app boots, what wraps every page, and which route maps to which domain doc, instead of grepping `src/pages/_app.tsx` and the routing tree from scratch.

## Provider stack

Providers wrap the app in this order, outermost first (`src/pages/_app.tsx`):

1. **`WagmiProvider`** (`src/pages/_app.tsx:45`, config from `src/wagmi.ts`) — chain/RPC config for wagmi hooks.
2. **`QueryClientProvider`** (`_app.tsx:46`, `@tanstack/react-query`) — a single module-level `QueryClient` instance (`_app.tsx:13`); no custom query defaults set.
3. **`DynamicProviders`** (`_app.tsx:50`, `src/components/DynamicProviders.tsx`) — loaded via `next/dynamic` with `ssr: false` because Dynamic.xyz needs browser APIs. This itself wraps three more layers:
   - **`DynamicContextProvider`** (`@dynamic-labs/sdk-react-core`) — wallet auth, dark theme, `environmentId` from `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`, hardcoded `EVM_NETWORKS` list (Base Sepolia, Base, Ethereum, Polygon, OP Mainnet, Arbitrum One) with RPC URLs (`DynamicProviders.tsx:17-84`).
   - **`DynamicWagmiConnector`** (`@dynamic-labs/wagmi-connector`) — bridges Dynamic's wallet state into wagmi.
   - **`ProfileCacheProvider`** (`src/contexts/ProfileCacheContext.tsx`) — localStorage-backed profile cache, keyed by wallet address. Owned in detail by the xaomsg-messaging doc (contact cards write into this cache), but it's app-wide since `dashboard.tsx` and others read display names/avatars from it too.
4. Inside all of that: `<Scrollbar />` (custom scrollbar UI, `src/components/Scrollbar.tsx`) then `<Component {...pageProps} />` — the actual page.

`_app.tsx` also runs a `useEffect` (`_app.tsx:23-42`) that toggles the viewport `<meta>` tag and `is-desktop`/`is-mobile` body classes based on `window.innerWidth > 530` — the app is designed mobile-first at a fixed 430px width on desktop, not responsive in the traditional sense.

`_document.tsx` is standard Next.js boilerplate (no custom `<Html>`/`<body>` attributes worth noting beyond defaults) — check it directly if you need `<head>`-level tags outside `_app`.

There is **no `AppRouterCacheProvider`, no theme provider beyond Dynamic's `theme="dark"`, and no i18n setup**.

## Route map

Every route under `src/pages/`, one line each:

| Route | Purpose | Detail owned by |
|---|---|---|
| `/` (`index.tsx`) | Landing page; embeds `DynamicEmbeddedWidget` for wallet connect, redirects to `/dashboard` once `dynamicUser` is set | this doc |
| `/dashboard` (`dashboard.tsx`, 435 lines) | Main authenticated home — event/contract browsing, search, calendar filter, ties together `useGetContracts`, `ProfileCache`, chain-aware USDC addresses | events-tickets.md + contracts-nft.md (dashboard is a composite view) |
| `/wallets` (`wallets.tsx`) | Wallet management screen, embeds `DynamicWidget` | web3-wallet.md |
| `/create-profile` (`create-profile.tsx`, 428 lines) | Profile creation/edit — username, genres (large hardcoded genre-hierarchy data), avatar; writes to `ProfileCache` | this doc / xaomsg-messaging.md (consumer of ProfileCache) |
| `/public-information` (`public-information.tsx`) | Public-facing info page, backed by `src/backend/public-information-services` | backend-data.md |
| `/unlock-chat` (`unlock-chat.tsx`) | Explicit post-login step that unlocks the XaoMsg session (`useXaoMsgSession`) and kicks off `syncAllKnownThreads` | xaomsg-messaging.md |
| `/chat-Section/*` (`Chat.tsx`, `Filter.tsx`, `Notification.tsx`, `Search.tsx`) | Messaging UI — conversation list, chat panel, filters, notifications | xaomsg-messaging.md |
| `/contracts/*` (create-contract, current-contract, past-contracts, Negotiation, arbitrate, contracts-detail, + section subcomponents) | Contract creation wizard and lifecycle views | contracts-nft.md |
| `/event/[id]`, `/event/[id]/confirm`, `/purchase`, `/ticket-confirmation` | Event detail page and purchase/confirmation flow | events-tickets.md |
| `/legal/[id]`, `/legal/legal-documents` | Legal document viewer, backed by `src/backend/legaldata.ts` | backend-data.md |
| `/stats/*` (index, search-token, swap-token, transaction-history, tickets/*) | Financial/swap stats and ticket redemption dashboards | financial-stats-tax.md |
| `/tax/tax-documents` | Tax document listing | financial-stats-tax.md |
| `/TicketAuthenticate/*` (Access, TicketAuthentication, TicketQR, TicketScan) | QR-based ticket scanning/authentication flow | events-tickets.md |
| `/api/deletegroup`, `/api/upload-image` | Next.js API routes (server-side) | backend-data.md |
| `_app.tsx`, `_document.tsx`, `_error.tsx` | Next.js framework files | this doc |

## Shared components

`src/components/` top level (excluding `src/components/Chat/`, which belongs to xaomsg-messaging.md):

- **`Layout.tsx`** — trivial wrapper (`<main>{children}</main>`) with an optional `hideNav` prop; not a full layout system, most pages compose their own nav directly.
- **`Navbar.tsx`** (254 lines) — main bottom/top nav, includes inline ERC-20 `balanceOf` ABI for displaying a token balance in-nav.
- **`BackNav.tsx`** (318 lines) — the standard "back + title" header used across detail/sub-pages (`pageTitle`, `pageIcon`, download/share icon slots).
- **`FloatingNav.tsx`** — floating action nav scoped to contract-related routes (`homeRoutes` array lists `/contracts/*` paths it appears on).
- **`ContractsNav.tsx`** — sub-nav for the contracts section; also carries its own inline ERC-20 balance ABI (duplicated from `Navbar.tsx` — not shared, worth deduping if touching either).
- **`StatsNav.tsx`** — sub-nav for `/stats/*` (unredeemed/redeemed/swap/transactions tabs).
- **`CalendarFilter.tsx`** (422 lines) — date + location filter UI used from `dashboard.tsx`, exports `FilterOptions`/`LocationFilterData` types.
- **`ShareModal.tsx`** — generic share-link modal, takes `eventTitle`/`eventUrl` props (event-specific despite living at top level).
- **`UserNFTs.tsx`** — reads and displays the connected wallet's contract NFTs via `useWeb3` + `useGetUserNFTs`.
- **`MapComponent.tsx`** — Leaflet map wrapper (manually patches default marker icons for webpack), used for event location display/picking.
- **`FundTicketButton.tsx`** — Coinbase onramp button (`src/lib/coinbase/onramp.ts`), lets users fund a wallet to buy a ticket.
- **`Scrollbar.tsx`** — custom-drawn scrollbar (mounted once, globally, in `_app.tsx`), tracks scroll position/drag state manually rather than using native scrollbars.

None of these are in a `ui/` or `primitives/` subfolder — the app has no generic design-system component layer (buttons, inputs, etc. are styled per-page via CSS Modules, see `CLAUDE.md`'s Styling section).

## Shared types

`src/types/` currently contains only **two files, both messaging-domain**: `contactMessage.ts` and `contractMessage.ts` (payload shapes for XaoMsg contact-card and contract-proposal messages — see xaomsg-messaging.md). There is no generic/global type module — domain types are colocated with their domain (e.g. contract types live near `src/backend/contract-services/` and `src/hooks/useGetContracts.ts`, event types near event backend/pages). If you're looking for a type and it's not colocated with its obvious domain, check `src/types/` next as the second place, not the first.

## Integration points

- Pages reach into domain logic via **hooks** (`src/hooks/*`), not by importing backend services directly — e.g. `dashboard.tsx` uses `useAllContractsWithSummaries` from `useGetContracts.ts` rather than calling `src/backend/contract-services` itself. Treat `src/hooks/` as the page-facing API surface for each domain.
- `ProfileCacheContext` is the one piece of domain state (messaging/profile) that's threaded through the app shell itself rather than fetched per-page — `dashboard.tsx`, `create-profile.tsx`, and the chat UI all read/write it directly.
- Chain/network config (`DynamicProviders.tsx`'s `EVM_NETWORKS`, `src/wagmi.ts`, `src/lib/web3/chains.ts`) is the seam between the app shell and web3-wallet.md — the shell wires up *which* chains are connectable, web3-wallet.md covers what happens once connected.

## Gotchas & constraints

- **Redux is present but effectively unused.** `src/store/store.ts` calls `configureStore({ reducer: {} })` — an empty reducer map — and `src/store/redux.ts` exports typed `useAppDispatch`/`useAppSelector` hooks that are not imported anywhere else in `src/`. There is no `<Provider store={store}>` in `_app.tsx` either. Don't assume Redux is wired into the app; it's vestigial scaffolding. If you need shared client state, follow the existing pattern (React Context, e.g. `ProfileCacheContext`) rather than reaching for Redux.
- **`DynamicProviders` is `ssr: false`.** Anything that depends on wallet/auth state is client-only by construction; don't expect `dynamicUser`/`useAccount()` to have a value during SSR or the first paint.
- **Provider order matters**: `DynamicWagmiConnector` must be inside both `DynamicContextProvider` and the top-level `WagmiProvider` — it bridges the two. If you add wagmi-dependent providers, they need to sit inside `DynamicProviders`, not beside it in `_app.tsx`, or they won't see Dynamic-managed wallet state.
- **Viewport is manually forced to 430px on desktop** (`_app.tsx`'s `useEffect`, breakpoint `window.innerWidth > 530`). This is a deliberate mobile-app-in-a-desktop-frame design choice, not a bug — see `is-desktop`/`is-mobile` body classes if you're debugging layout differences between the two.
- Several nav components (`Navbar.tsx`, `ContractsNav.tsx`) each inline their own copy of the ERC-20 `balanceOf` ABI — not shared from `src/lib/web3/`. Worth consolidating if you're touching either, but out of scope for this doc alone.
