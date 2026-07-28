# Contract NFT / On-chain Agreements

**Scope:** what happens once a booking agreement leaves off-chain negotiation and becomes an on-chain contract — deployment, dual-party signing, ticketing, and (for the legacy path) NFT minting. Off-chain drafting/negotiation transport over Waku is covered in `xaomsg-messaging.md`.

## Purpose

XAO Cult turns a venue/artist booking agreement into a live smart contract so both parties have an immutable, dual-signed record of terms (dates, money splits, ticket config) and so ticket sales/revenue can be enforced on-chain rather than trusted to a database. This is the "why contracts are on-chain" part of the app's pitch.

## Key modules

- `contracts/ContractNFT.sol` — legacy: single ERC721 collection, one token per contract, party info as free-text strings.
- `src/contract/EventContract.sol`, `src/contract/EventContractFactory.sol` — an earlier per-event factory design. **Not what's currently deployed** — see Gotchas.
- `src/lib/web3/eventcontract.ts` — hand-maintained ABI constants (`SHOW_CONTRACT_ABI`, `SHOW_CONTRACT_FACTORY_ABI`, `XAO_TICKET_ABI`, aliased as `EVENT_CONTRACT_ABI`/`EVENT_CONTRACT_FACTORY_ABI`) for the contracts that are **actually live**: `ShowContract`, `ShowContractFactory`, `XAOTicket`. No `.sol` source for these exists in this repo.
- `src/lib/web3/contracts.ts` — `CONTRACT_NFT_ABI` for the legacy `ContractNFT.sol`.
- `src/lib/web3/chains.ts` — chain config, contract addresses per chain (`CONTRACT_ADDRESSES`), treasury/USDC addresses.
- `src/hooks/useCreateContract.ts` — `useCreateEventContract`: calls `ShowContractFactory.create(...)`, decodes the deployed address from the `ShowContractCreated` log.
- `src/hooks/useSignEventContract.ts` — `useSignEventContract`: calls `ShowContract.sign()` (no args; `msg.sender` determines which party is signing).
- `src/hooks/useGetContracts.ts` — reads: `useGetAllContracts`, `useGetUserContracts`, `useGetContractSummaries` (batched multicall over public fields), status enum labels.
- `src/hooks/useAddTicketType.ts`, `useBuyTickets.ts` — `XAOTicket` (ERC1155) tier management and USDC-based purchase flow.
- `src/hooks/useContractNFT.ts`, `useMintContractNFT.ts` — legacy `ContractNFT` mint/read hooks.
- `src/backend/contract-services/contractHelpers.ts` — form data → `CreateShowContractParams` translation, validation.
- `src/backend/contract-services/createContract.ts`, `currentcontract.ts`, `pastcontract.ts`, `negotiation.ts` — backend-layer helpers (see Gotchas for `negotiation.ts`).
- `src/pages/contracts/*` — UI: `create-contract.tsx` (+ section subcomponents `DatesAndTimesSection`, `LocationSection`, `MoneySection`, `PaymentsSection`, `TicketsSection`), `current-contract.tsx`, `contracts-detail.tsx`, `past-contracts.tsx`, `Negotiation.tsx`, `arbitrate.tsx`.
- `scripts/deploy.ts`, `hardhat.config.js` — Hardhat deploy script (only wired up for legacy `ContractNFT`; Base Sepolia chainId 84532 / Base mainnet 8453).

## Solidity contracts

### `ShowContract` / `ShowContractFactory` / `XAOTicket` — the live system

Source not in this repo (ABI-only). Reconstructed shape from the ABI in `eventcontract.ts`:

- **`ShowContractFactory.create(...)`** deploys one `ShowContract` per event/booking, given `PartyConfig` (wallet, `PartyRole` enum: PROMOTER/ARTIST/VENUE/BOOKING_AGENT/PRODUCTION/OTHER, username), `DatesConfig`, `LocationConfig`, `TicketConfig`, `FinancialConfig`, `PromoConfig`, plus `_usdc` and `_treasury` addresses. Emits `ShowContractCreated(contractAddr, party1, party2)`.
- **`ShowContract`** is `AccessControl` + `Pausable` + `ReentrancyGuard`-based (has `ADMIN_ROLE`, `TREASURY_ROLE`, `pause`/`unpause`, custom errors). Status enum: `DRAFT, PROPOSED, COUNTER_PROPOSED, APPROVED, ACTIVE, COMPLETED, CANCELLED, DISPUTED`.
- **Dual signing**: `sign()` — each party calls it from their own wallet (`msg.sender`); `hasSigned(address)` tracks per-party state; `isFinalized()` reflects both-signed. On finalize it deploys/exposes a `ticketCollection` (the `XAOTicket` contract) — see `TicketCollectionDeployed` event.
- **Escrow & payments**: `depositGuarantee`, `addParty1Deposit`/`addParty2Deposit`, `addParty1Payout`/`addParty2Payout`, `addParty1CancellationRefund`/`addParty2CancellationRefund`, `withdrawEscrow`, `escrowBalance`, `creditRevenue` — all USDC-denominated (`IShowUSDC`), not ETH.
- **Disputes**: `raiseDispute`, `resolveDispute(releaseToParty2)`, `hasVotedResolve`.
- **`XAOTicket`** is an ERC1155 + `ERC2981` (royalties) + `AccessControl` + `Pausable` contract, one per finalized `ShowContract`. Ticket tiers (`TierAdded`) have type `COMP/PRESALE/GENERAL_ADMISSION/VIP/CUSTOM`, price in USDC, resale split in basis points across party1/party2/reseller. Buying (`TicketSold`) requires ERC20 `approve` then `buyTicket(tierId)`. `TicketAuthenticated`/`TicketRedeemed` back the QR check-in flow (see `events-tickets.md`).

### `ContractNFT.sol` — legacy, still partially wired

Simple ERC721 (+`ERC721URIStorage`, `Ownable`): `mintContractNFT(party1, party2, terms)` mints one token holding free-text `party1`/`party2` names and a `terms` string blob; `signContract(tokenId)` can **only be called by the current NFT owner** — this is not a two-party signature scheme, just an owner-settable boolean (`isSigned`). `getUserNFTs`/`getContractData` are the read paths.

### `EventContract.sol` / `EventContractFactory.sol` (`src/contract/`)

A factory + per-event contract with its own ticketing (`TicketType`, `buyTickets`, `checkInTicket`, refunds) and a real `p1Signed`/`p2Signed` dual-signature flow — but its `Party`/status shapes and function names **don't match** `SHOW_CONTRACT_ABI`. Treat as a superseded design iteration, not live source (see Gotchas).

## Data flow / lifecycle

1. **Off-chain draft & negotiation** happens over Waku (`src/lib/xaomsg/offchainContracts.ts`, `draftSync.ts` — see `xaomsg-messaging.md`) and/or the multi-step `create-contract.tsx` form (dates, location, money, tickets, payment sections).
2. **Params translation**: `contractHelpers.ts#buildContractParams(formData, party1Username, otherPartyAddress, callerAddress)` converts form state into `CreateShowContractParams` (dates → unix timestamps, percentages → basis points, dollars → USDC 6-decimal bigints).
3. **Deploy**: `useCreateEventContract().createEventContract(params)` → `ShowContractFactory.create(...)` on the chain-specific factory address. The new `ShowContract` address is parsed out of the `ShowContractCreated` log topic (`contractAddress` returned from the hook), not from the tx return value.
4. **Dual signature**: each party calls `useSignEventContract().signContractAsync(contractAddress, username)` → `ShowContract.sign()`. Status flips `DRAFT → ... → ACTIVE` once both have signed (`isFinalized()` true) and the `XAOTicket` collection is deployed for that show.
5. **Ticketing**: `useAddTierToXAOTicket` adds tiers directly to the deployed `XAOTicket` (real path — `useAddTicketType.addTicketTypeAsync` is a no-op stub, see Gotchas). Buyers call `useBuyTickets` → ERC20 `approve` (if price > 0) → `XAOTicket.buyTicket(tierId)`.
6. **Check-in**: QR scan flow emits `TicketAuthenticated`/`TicketRedeemed` on `XAOTicket` — covered in `events-tickets.md`.
7. **Reads**: `useGetUserContracts`/`useGetAllContracts` list `ShowContract` addresses from the factory; `useGetContractSummaries` batches 9 public-field reads per contract via `useReadContracts` (no struct getter exists) to build `ContractSummary` for list views (`current-contract.tsx`, `past-contracts.tsx`, `contracts-detail.tsx`).

## Data model / key types

Defined in `src/hooks/useCreateContract.ts`, mirroring `ShowContract.sol`'s structs 1:1 (field order matters for the tuple-shaped `create()` call):

- `PartyConfig { wallet, role: PartyRole, xaoUsername }`
- `DatesConfig { announcementDate, eventStartDate, eventEndDate, loadInTime, doorsTime, startTime, endTime, setTime, setLengthMinutes }` (all `bigint` unix seconds)
- `LocationConfig { venueName, venueAddress, radiusMiles, radiusDays }`
- `TicketConfig { ticketsEnabled, totalCapacity, salesTaxBPS }`
- `FinancialConfig { guaranteeUSDC, guaranteePctBPS, backendBPS, barSplitBPS, merchSplitBPS }`
- `PromoConfig { eventName, flyerDNSLink, flyerCIDHash, riderIPFSCID, contractLegal, ticketLegal, contractCIDHash }`
- `ContractSummary` (read-side, `useGetContracts.ts`) — flattened view for list UIs; `CONTRACT_STATUS_LABELS` maps the 8-value status enum to display strings.

## Integration points

- **From xaomsg**: off-chain contract drafts (keyed by `draftId`, delivered over the DM thread) are the pre-mint stage; minting a `ShowContract` is the "either party can later mint it on-chain" step referenced in `docs/superpowers/specs/2026-07-19-xaomsg-direct-dm-design.md` §1. Full draft lifecycle lives in `xaomsg-messaging.md`.
- **Wallet/chain**: all writes go through `useWeb3`/wagmi (`useWriteContract`, `useWaitForTransactionReceipt`); factory/USDC/treasury addresses are resolved per `chainId` via `CONTRACT_ADDRESSES` in `chains.ts`.
- **USDC**: Base mainnet `0x8335...02913`, Base Sepolia `0x06B1...4Eeae` (Circle faucet token) — all financial fields are USDC (6 decimals), not ETH/wei.
- **IPFS**: `src/lib/web3/ipfs.ts#uploadContractMetadata` exists but targets the legacy `ContractNFT` metadata shape and defaults to returning a base64 data URI (`useDataUri = true`); the live `ShowContract` create flow never calls it — `flyerCIDHash`/`contractCIDHash` are always sent as zero bytes32 today.

## Gotchas & constraints

- **Two on-chain systems coexist.** `ContractNFT` (legacy ERC721) is still queried live: `Search.tsx` calls `useGetUserNFTs` to build part of its event-preview list, even though the `UserNFTs.tsx` component that would display them isn't rendered anywhere. Don't assume `ShowContract` fully replaced it — check both when debugging "why isn't my contract showing up."
- **`src/contract/EventContract.sol`/`EventContractFactory.sol` do not match the deployed ABI.** Their `Party`/status/ticket shapes differ from `SHOW_CONTRACT_ABI` in `eventcontract.ts`. There is no `.sol` source for the actually-deployed `ShowContract`/`XAOTicket` in this repo — treat the ABI constants as the source of truth and the `.sol` files as a stale/superseded iteration, not documentation of current behavior.
- **CLAUDE.md's env var list is incomplete.** It documents `NEXT_PUBLIC_CONTRACT_NFT_TESTNET/MAINNET` but not `NEXT_PUBLIC_SHOW_CONTRACT_FACTORY_TESTNET/MAINNET` (used in `chains.ts`, with a hardcoded testnet fallback `0x56b1AbF4...`), `NEXT_PUBLIC_TREASURY_ADDRESS`, or the Pinata keys referenced by `ipfs.ts`.
- **Party roles are hardcoded in the create flow.** `contractHelpers.ts#buildContractParams` always sets `party1Config.role = PartyRole.PROMOTER` and `party2Role = PartyRole.ARTIST` regardless of what the UI form actually collected — check the form/role-selection UI before trusting this reflects user intent.
- **`useAddTicketType.addTicketTypeAsync` is a no-op stub** ("tiers can be added after both parties sign via contract detail page") — the real write path is `useAddTierToXAOTicket`.
- **`useGetContractSummary` (singular) is a deprecated stub** returning `undefined` — use `useGetContractSummaries` (plural, batched).
- **`ContractSummary.party1Signed`/`party2Signed` both just mirror `isFinalized`** — `ShowContract`'s ABI doesn't expose per-party signed booleans as public fields the way `hasSigned(address)` would need per-address args, so the summary can't currently distinguish "only party1 signed" from "neither signed."
- **`src/backend/contract-services/negotiation.ts` (`AttentionList`/`WaitingList`) is hardcoded mock data**, not live backend logic — don't use it as a reference for how negotiation state is actually tracked (that's the xaomsg off-chain draft store).
- **`scripts/deploy.ts`/`hardhat.config.js` only deploy `ContractNFT`** — there's no deploy script in-repo for `ShowContractFactory`/`XAOTicket`, consistent with their source not being present either.