# Architecture docs

Living, current-state reference for each subsystem — read the relevant doc(s) before exploring the codebase manually. Unlike `docs/superpowers/specs/` and `docs/superpowers/plans/` (point-in-time design proposals, dated by filename, not updated after the fact), these docs describe what's true in the code **today** and should be updated as part of any PR that changes the subsystem they cover. If a doc and the code disagree, the code is right — fix the doc.

| Doc | Covers |
|---|---|
| [web3-wallet.md](web3-wallet.md) | Dynamic.xyz wallet connection, Wagmi chain config, Uniswap swaps, Coinbase onramp |
| [contracts-nft.md](contracts-nft.md) | On-chain booking agreements: `ShowContract`/`ShowContractFactory`/`XAOTicket`, dual-party signing, ticketing, legacy `ContractNFT.sol` |
| [xaomsg-messaging.md](xaomsg-messaging.md) | Waku-based wallet-to-wallet chat, contact cards, off-chain contract negotiation, encryption/session lifecycle |
| [events-tickets.md](events-tickets.md) | Event browsing, ticket types/purchase, QR ticket authentication |
| [financial-stats-tax.md](financial-stats-tax.md) | Token-swap stats page, on-chain transaction history, client-side tax document locker |
| [backend-data.md](backend-data.md) | Supabase schema, `src/backend/` conventions, Pinata IPFS routes, Redux store |
| [frontend-app-shell.md](frontend-app-shell.md) | Provider stack (`_app.tsx`), full route map, shared components/types |

## Known cross-cutting issues found while writing these docs

Surfaced during the code trawl, not yet fixed — listed here once so they aren't lost, filed under whichever doc has the detail:

- **Security:** on-chain contract-thread chat still derives its encryption key as bare `keccak256(contractAddress)` — a public value — instead of the ECDH-derived key DM chat now uses. Anyone who knows a contract's address can derive that thread's key. See `xaomsg-messaging.md` § Gotchas.
- **Two parallel on-chain contract systems:** the legacy `ContractNFT.sol` (still queried by `Search.tsx`) coexists with the actual production contracts (`ShowContract`/`ShowContractFactory`/`XAOTicket`), whose Solidity source isn't in this repo at all — only hand-maintained ABI constants. See `contracts-nft.md`.
- **Supabase is provisioned but not integrated:** no `@supabase/supabase-js` dependency or client exists anywhere; `src/backend/` is mostly static/mock data despite `supabase/init.sql` defining a real `profiles` table with RLS. See `backend-data.md`.
- **CLAUDE.md env var list is incomplete:** missing `PINATA_JWT`, `NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_*`, `TREASURY_ADDRESS` at minimum.
- **Redux store is vestigial:** empty reducer map, not mounted in `_app.tsx`, hooks unused. Real state lives in React Context / `localStorage`.
- **QR ticket codes** are generated via a third-party public API (`api.qrserver.com`) rather than a local library — ticket payloads leave the app to render a code. See `events-tickets.md`.
- Several dead-code/mock-data paths (`useAddTicketType`, `taxdata.ts` seed array, one `negotiation.ts` backend helper, "My Tickets" list, "Me" QR tab) — see individual docs for specifics.
