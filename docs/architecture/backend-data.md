# Backend / Data Layer (Supabase)

**Scope:** shared schema + conventions reference for `supabase/` and `src/backend/`; business logic for contracts, events, tickets, stats, and messaging lives in each feature's own doc and links here for schema/convention details.

## Purpose

Documents what's actually wired up as server-side/persistent data versus what's mock or client-only. This matters because the picture from `supabase/init.sql` alone (a real, RLS-protected `profiles` table) overstates how much of the app is backed by Supabase — as of this writing, **none of it is**. Read this before assuming any `src/backend/*data.ts` file is live data.

## Supabase client setup

**There is no Supabase client in this codebase.** `@supabase/supabase-js` is not in `package.json` dependencies, and no file calls `createClient` or imports a Supabase SDK. `CLAUDE.md` documents `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as required env vars, and `src/backend/legaldata.ts` (static legal-copy content, see below) references Supabase-backed email login in its ToS/Privacy text — but no code path currently constructs a client or queries it. Treat Supabase as **provisioned but not integrated**: the schema and env var contract exist for a future email-login feature, not a present one.

## Schema overview

`supabase/init.sql` defines exactly one table:

- **`profiles`** — `id` (UUID, FK to `auth.users(id)`, PK), `username` (unique, not null), `location`, `radius` (int), `genres` (`text[]`), `profile_picture_url`, `created_at`, `updated_at`. RLS is enabled: anyone can `SELECT`, a user can `INSERT`/`UPDATE` only their own row (`auth.uid() = id`). An `updated_at` trigger (`handle_updated_at`) keeps the timestamp current on update.

No other tables, migrations, or seed files exist. There's no migrations directory — `init.sql` is the entire schema as a single file, applied however the Supabase project was originally set up (manually via dashboard/SQL editor, presumably — nothing in the repo runs it).

## src/backend/ conventions

`src/backend/` is not a server — it's a grab-bag of client-importable modules organized by feature folder (`contract-services/`, `Chat-Services/`, `ticket-services/`, `tax-services/`, `public-information-services/`) plus flat top-level files (`contracts.ts`, `eventsdata.ts`, `legaldata.ts`, `taxdata.ts`, `ticketAuthData.ts`). In practice these fall into two buckets:

1. **Static/mock data modules** — plain exported arrays/objects, no I/O. Confirmed examples: `eventsdata.ts` (file header literally says `/** Event Mock Data ... Add new events here and they will automatically appear on the dashboard! */`), `publicinfodata.ts` (hardcoded sample user records — "ABC", "Alice", "Bob" — with placeholder wallet addresses like `"0x123..."`), `legaldata.ts` (static ToS/Privacy/Risk-Disclosure copy, not data access at all). Assume any `*data.ts` file is this kind unless you've verified otherwise.
2. **Pure client-side helper functions** — take React state setters as arguments and mutate local component/localStorage state (e.g. `public-information-services/publicInfoServices.ts`: `handleWalletSelection`, `toggleGenre`, `handleSignOut` which clears `localStorage`/`sessionStorage` while preserving the `xao-cult-profile-cache` key). No network calls.

Real I/O in this layer is narrow and goes through Next.js API routes, not Supabase:

- `src/pages/api/upload-image.ts` and `src/pages/api/deletegroup.ts` are the only server-side handlers with actual external calls. Both talk to **Pinata** (IPFS pinning) directly via `fetch`, authenticated with `process.env.PINATA_JWT` (and optional `PINATA_GATEWAY`) — **not documented in CLAUDE.md's env var list**, add it if you touch this area. Upload dedupes by IPFS hash within a named "group" (folder) before re-uploading; delete unpins every file in a group then deletes the group. Error handling is inline try/catch returning `{success, error}` JSON — no shared response helper.
- On-chain data (contracts, events-on-chain) goes through `src/lib/web3/*` and hooks in `src/hooks/`, not `src/backend/` — see `contracts-nft.md`.
- XaoMsg/Waku data goes through `src/lib/xaomsg/*`, not `src/backend/` — see `xaomsg-messaging.md`. `src/backend/Chat-Services/*` only holds UI-adjacent helpers (search/filter logic over already-loaded conversation data), not a data-fetch layer.

There's no shared "backend client" abstraction, no ORM, no typed query builder — each file does its own thing. Naming is inconsistent (`ticketAuthData.ts` at top level vs `ticket-services/ticketdata.ts` in a subfolder covering overlapping ground) — don't assume the top-level file and the subfolder file are duplicates or that one supersedes the other without reading both.

## Client-side state (Redux store)

`src/store/store.ts` calls `configureStore({ reducer: {} })` — **an empty reducer map.** `src/store/redux.ts` just exports typed `useAppDispatch`/`useAppSelector` hooks bound to that empty store. Redux Toolkit and react-redux are installed and wired into the store shape, but nothing is registered. If you're looking for where app state is cached, it's not here — it's in React Context (`ProfileCacheContext`), component state, and `localStorage` (profile cache, XaoMsg session — see `xaomsg-messaging.md`). Don't add a reducer here without checking whether the feature you're working on already has a working localStorage/Context pattern to follow instead, since that's the codebase's actual convention.

## Integration points

- **`contracts-nft.md`** owns on-chain contract data via `src/lib/web3/contracts.ts`, `src/backend/contract-services/*`, `src/hooks/useContractNFT.ts` etc. `src/backend/contracts.ts` (top-level, chain-ID/mint-arg validation) is also theirs despite living at this layer's root.
- **`xaomsg-messaging.md`** owns `src/lib/xaomsg/*`, `src/backend/Chat-Services/*`, `src/contexts/ProfileCacheContext.tsx`.
- **`events-tickets.md`** owns `src/backend/eventsdata.ts` (mock), `src/backend/ticket-services/*`, `src/backend/ticketAuthData.ts`.
- **`financial-stats-tax.md`** owns `src/backend/taxdata.ts`, `src/backend/tax-services/*`, `src/backend/services/dashboardHelpers.ts`.
- This doc owns: `supabase/init.sql`, `src/backend/public-information-services/*`, `src/backend/legaldata.ts`, `src/store/*`, `src/pages/api/upload-image.ts`, `src/pages/api/deletegroup.ts`.

## Gotchas & constraints

- **Don't trust `CLAUDE.md`'s Supabase env vars to mean Supabase is live.** They're provisioned for a future feature; check for `@supabase/supabase-js` in `package.json` before assuming otherwise (it wasn't there as of this doc).
- **Most "backend" data is mock data checked into the repo**, not fetched from anywhere. `eventsdata.ts` says so explicitly in a comment; others don't, so verify by looking for `fetch`/SDK calls before treating a `*data.ts` export as live.
- **`PINATA_JWT` / `PINATA_GATEWAY` are required env vars not listed in `CLAUDE.md`** — image upload and IPFS group deletion silently 500 without them.
- **The Redux store is dead weight as configured** — empty reducer map. Either it's meant for a future feature or vestigial; don't build on it without confirming intent with whoever's driving that work.
- **No migration tooling for `supabase/init.sql`.** If the schema needs to change, there's no established process in-repo (no `supabase/migrations/`, no CLI config checked in) — changes were presumably applied by hand against the live project.
