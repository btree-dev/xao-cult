# Contract ↔ Frontend Field Mapping & Gap Analysis

**Status:** Current-state reference · **Date:** 2026-08-10 · **App HEAD:** `138ae06`
**On-chain source:** [`mudaseriqbalshah/xao.contracts.v2`](https://github.com/mudaseriqbalshah/xao.contracts.v2) — `contracts/ShowContract.sol`, `contracts/XAOTicket.sol`
**Frontend source:** `src/pages/contracts/create-contract-section.tsx` (`getContractData()`), `src/backend/contract-services/contractHelpers.ts` (`buildContractParams()`), `src/hooks/useCreateContract.ts` (`create()` call)

> **Purpose:** Document exactly which create-contract form fields reach the on-chain `ShowContract`, which the contract can store but the frontend never sends, and which the form collects but the contract has no home for. Written because the deployed `ShowContract`/`XAOTicket` Solidity lives in a separate repo (not in `xao-cult`); only the ABIs (`src/lib/web3/eventcontract.ts`) are here.

---

## TL;DR

- **Wired ✅** — parties, all dates, location, ticket config (capacity/tax), the 5 aggregate financials, promo/legal strings, and ticket tiers (via `XAOTicket.addTier` after both sign).
- **Missing wiring ❌ (biggest gap)** — **Payments, Security Deposits, and Cancellation Refunds**: the contract has full storage + setter functions, the form collects the data with an exact-shape match, but the `addParty*` calls are **never made**. Also `contractCIDHash` / `flyerCIDHash` are always sent as zero, so there is no on-chain integrity hash of the full contract JSON.
- **Form-only (no on-chain home) ⚠️** — genres, comps count, contract-level resale splits, `ticketsSale` date.
- **2 mapping bugs** — `salesTax` is fed the `comps` value; `addTier` uses hardcoded resale BPS instead of the form's resale values.

---

## How the data flows today

```
Form sections ──getContractData()──> Partial<IContract>  (full fidelity)
                                            │
                        ┌───────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
              buildContractParams()   Waku proposal        localStorage
              (subset → 7 structs)    (full object)        off-chain draft
                        │                (full)               (full)
                        ▼
              ShowContractFactory.create(...)  ← ONLY this subset lands on-chain
                        │
             (both parties sign → finalize)
                        ▼
              XAOTicket deployed → addTier() per ticket row
```

The **full** contract object only ever lives in the Waku proposal + the localStorage draft. On-chain `ShowContract` receives a **subset**.

---

## ✅ A) In contract AND sent by frontend (wired)

| Contract field (`ShowContract.sol`) | Frontend source | Sent via |
|---|---|---|
| `party1 {wallet, role, xaoUsername}` | `party1` + connected wallet + username | `create()` — role **hardcoded** `PROMOTER` |
| `party2 {wallet, role}` | `party2` address | `create()` — role **hardcoded** `ARTIST` |
| `announcementDate, eventStartDate, eventEndDate, loadInTime, doorsTime, startTime, endTime, setTime, setLengthMinutes` | `datesAndTimes.*` | `create()` |
| `venueName, venueAddress, radiusMiles, radiusDays` | `location.{venueName, address, radiusDistance, days}` | `create()` |
| `ticketsEnabled, totalCapacity, salesTaxBPS` | `tickets.*` (see bug #1) | `create()` |
| `guaranteeUSDC, guaranteePctBPS, backendBPS, barSplitBPS, merchSplitBPS` | `money.{depositbandInput, guaranteeInput, backendInput, barsplitInput, merchSplitInput}` | `create()` |
| `eventName, flyerDNSLink, riderIPFSCID, contractLegalLanguage, ticketLegalLanguage` | `promotion.value`, `eventImageUri`, `rider.rows` (joined text), `legalAgreement`, `ticketLegalLanguage` | `create()` |
| XAOTicket tier: `ticketType, priceUSDC, quantity, onSaleTimestamp` | `tickets.ticketRows[]` | `addTier()` **after both sign** |

---

## ❌ B) In contract but frontend NEVER sends (missing wiring)

The contract has storage **and** the exact setter functions; the form collects a shape-matching payload; the call is simply never made. All setters are `onlyParty1 notFinalized`, so they must run after Save (Draft) and before finalize.

| Contract storage + function | Frontend data (shape match) | Status |
|---|---|---|
| `party1Deposits[]` / `party2Deposits[]` — `addParty1Deposit(ts,pct,amt)` / `addParty2Deposit(...)` → `PaymentSchedule {timestamp, pctBPS, usdcAmount}` | `money.securityDepositRows` / `money.securityDeposit2Rows` — `{dateTime, percentage, dollarAmount}` | ❌ never called |
| `party1Payouts[]` / `party2Payouts[]` — `addParty1Payout(...)` / `addParty2Payout(...)` → `PaymentSchedule` | `payments.party1` (payoutRows) / `payments.party2` (payout2Rows) — `{dateTime, percentage, dollarAmount}` | ❌ never called |
| `party1CancellationRefunds[]` / `party2CancellationRefunds[]` — `addParty1CancellationRefund(cutoff,pct,amt)` / `...party2...` → `CancellationRefund {cutoffTimestamp, refundPctBPS, refundUSDC}` | `money.cancelParty1Rows` / `money.cancelParty2Rows` — `{dateTime, percentage, dollarAmount}` | ❌ never called |
| `contractCIDHash` (sha256 of the signed contract JSON's IPFS CID) — set in constructor or `updateContractCID()` | — (full contract JSON is never pinned to IPFS) | ❌ sent as `ZERO_BYTES32` |
| `originalFlyerCIDHash` (immutable first-pin flyer hash) | — | ❌ sent as `ZERO_BYTES32` |
| `party2.xaoUsername` — `setParty2Username()` | party2's username | ❌ stored as `""` |

**Impact:** Payments, Security Deposits, and Cancellation Refunds — three whole form sections — are supported on-chain and filled in by the user, but never persisted on-chain. `contractCIDHash = 0` means there is no on-chain integrity anchor for the full agreement, so the complete contract is not on-chain-verifiable.

References: setters at `ShowContract.sol:492-526`; ABI present but uncalled — `src/lib/web3/eventcontract.ts` (`addParty1Deposit`, `addParty1Payout`, `addParty1CancellationRefund`, `updateContractCID`); zeros at `src/backend/contract-services/contractHelpers.ts:138,142`.

---

## ⚠️ C) In frontend but NO on-chain home

| Frontend field (`getContractData()`) | On-chain? |
|---|---|
| `promotion.genres` | ❌ `ShowContract` has no genre field |
| `tickets.comps` | ❌ no `ShowContract` field (comp tickets are a `TicketType` enum in `XAOTicket`, not stored here) |
| `tickets.resale {party1, party2, reseller}` | ❌ not stored at `ShowContract` level; resale BPS is per-tier in `XAOTicket.addTier` — **and** the form values are not used (see bug #2) |
| `datesAndTimes.ticketsSale` | ❌ no `ShowContract` field (per-tier `onSaleTimestamp` lives in `XAOTicket`) |
| `money.bandCanceledBy`, `money.cancelParty2DateTime`, `money.securitydepositAdd` | ❌ UI helper/scalar fields; no contract field |
| `updatedAt` | ❌ frontend metadata |

Note: `rider.rows` is partially wired — joined into a text string and stored in the `riderIPFSCID` **string** field (it is not an actual IPFS CID).

Also: party roles are not selectable in the form (hardcoded PROMOTER/ARTIST), though `ShowContract` supports 6 roles (`PROMOTER, ARTIST, VENUE, BOOKING_AGENT, PRODUCTION, OTHER`).

---

## 🐞 Mapping bugs found during this comparison

1. **`salesTax` is fed `comps`.** In `getContractData()`, `tickets` is built as `{ ..., comps, salesTax: comps, ... }` — both point at the same `comps` variable ([create-contract-section.tsx:409-410](../../src/pages/contracts/create-contract-section.tsx#L409)). `buildContractParams` then maps `tickets.salesTax` into `salesTaxBPS` ([contractHelpers.ts:113](../../src/backend/contract-services/contractHelpers.ts#L113)). Result: **on-chain `salesTaxBPS` receives the comps value, not the sales tax.**

2. **`addTier` ignores the form's resale splits.** The form collects `tickets.resale {party1, party2, reseller}`, but the sign-success handler calls `addTier(...)` with **hardcoded** `party1ResaleBPS=3333, party2ResaleBPS=3333, resellerBPS=3334` ([create-contract.tsx:463-465](../../src/pages/contracts/create-contract.tsx#L463)).

3. **Guarantee field naming mismatch (verify).** `money.depositbandInput → guaranteeUSDC` (flat) and `money.guaranteeInput → guaranteePctBPS` (percent) ([contractHelpers.ts:117-126](../../src/backend/contract-services/contractHelpers.ts#L117)). The form label ("deposit band") and the contract field ("guarantee") don't line up — confirm the intended mapping.

---

## Recommended fixes (priority order)

1. **Wire the payment-schedule setters** (Section B, rows 1–3). After Save (Draft) succeeds and before finalize, loop the deposit/payout/cancellation rows and call the matching `addParty1*/addParty2*` functions. Shapes already match `PaymentSchedule` / `CancellationRefund`; reuse `dateToTimestamp`, `percentageToBasisPoints`, `dollarToUSDC` from `contractHelpers.ts`.
2. **Populate `contractCIDHash`.** Pin the full contract JSON to IPFS on Save and pass its `sha256(CID)` into `create()` (or `updateContractCID`). `src/lib/web3/ipfs.ts` already has `uploadContractMetadata` + `generateTermsHash` — wire them into the create flow.
3. **Fix bug #1** (`salesTax` should read the real sales-tax input, not `comps`).
4. **Fix bug #2** (use `tickets.resale` in `addTier` instead of hardcoded BPS).
5. **Decide on Section C fields** — either add on-chain storage (needs a contract change in the `xao.contracts.v2` repo) or accept they stay off-chain (Waku/localStorage only) and document that.

---

## Source-of-truth references

- Contract storage & setters: `ShowContract.sol:113-175` (state), `:231-300` (constructor), `:492-526` (payment/cancellation setters), `:359-378` (`updateContractCID`).
- Frontend form shape: `create-contract-section.tsx:385-447` (`getContractData`).
- On-chain param builder: `contractHelpers.ts:65-162` (`buildContractParams`).
- Factory call: `useCreateContract.ts:116-206` (`create()` args).
- Row shapes: `TicketsSection.tsx` (`TicketRow`), `MoneySection.tsx` (`SecurityDepositRow`, `CancelPartyRow`), `PaymentsSection.tsx` (`PaymentRow`).
