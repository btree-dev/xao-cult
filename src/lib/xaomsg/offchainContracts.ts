import type { Address } from 'viem';
import type { IContract } from '../../backend/services/types/api';

const LS_KEY = 'xao-cult-offchain-contracts';
// draftIds the user explicitly deleted. Kept separately so that a later inbox
// sync (which can re-write a draft into the store from Waku history) can never
// bring a deleted draft back — listDrafts filters these out.
const LS_DISMISSED = 'xao-cult-offchain-dismissed';

function readDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(LS_DISMISSED) || '[]') as string[]); }
  catch { return new Set(); }
}
function writeDismissed(s: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_DISMISSED, JSON.stringify(Array.from(s)));
}

export interface OffchainContractDraft {
  draftId: string;
  party1: Address;
  party2: Address;
  terms: Partial<IContract>;
  revisionNumber: number;
  /** Wallet addresses that have ACCEPTed this draft. */
  approvals: Address[];
  mintedContractAddress?: Address;
  lastActivityUnixMs: number;
}

type Store = Record<string, OffchainContractDraft>; // draftId -> draft

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Store; }
  catch { return {}; }
}
function writeStore(s: Store): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export function listDrafts(): OffchainContractDraft[] {
  const dismissed = readDismissed();
  return Object.values(readStore())
    .filter((d) => !dismissed.has(d.draftId))
    .sort((a, b) => b.lastActivityUnixMs - a.lastActivityUnixMs);
}

/** Permanently delete a draft from this device: remove it from the store AND
 *  remember its id as dismissed, so a later inbox sync can't restore it. */
export function dismissDraft(draftId: string): void {
  const store = readStore();
  delete store[draftId];
  writeStore(store);
  const dismissed = readDismissed();
  dismissed.add(draftId);
  writeDismissed(dismissed);
}

/** Delete ALL current off-chain drafts (bulk cleanup). Each id is remembered as
 *  dismissed so a sync can't bring them back. */
export function dismissAllDrafts(): void {
  const store = readStore();
  const dismissed = readDismissed();
  Object.keys(store).forEach((id) => dismissed.add(id));
  writeStore({});
  writeDismissed(dismissed);
}

/** Un-dismiss everything: forget the deleted-draft list so a subsequent inbox
 *  sync can bring previously-deleted drafts back (recovery for an accidental
 *  delete). Drafts that were only ever local and not re-published to Waku can't
 *  be recovered this way — nothing remains to re-fetch them from. */
export function clearDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_DISMISSED);
}

/** How many drafts are currently hidden (dismissed). Lets the UI show a
 *  "restore" affordance only when there is something to restore. */
export function dismissedCount(): number {
  return readDismissed().size;
}

export function loadDraft(draftId: string): OffchainContractDraft | null {
  return readStore()[draftId] ?? null;
}

/** Save (overwrite) a device-local draft unconditionally — no revision guard.
 *  Backs the create-contract "Save" button: a local checkpoint the user can
 *  return to and keep editing before the contract is signed on-chain. Unlike
 *  `upsertDraft` (which drops a non-newer revision to protect the proposal
 *  sync order), this always writes the latest form state. */
export function saveLocalDraft(next: OffchainContractDraft): OffchainContractDraft {
  const store = readStore();
  store[next.draftId] = next;
  writeStore(store);
  return next;
}

/** Upsert a draft revision. A strictly-newer `revisionNumber` always wins; a
 *  stale/equal one is dropped so an out-of-order PROPOSAL replay (e.g. from
 *  store history) can never regress a newer COUNTER_PROPOSAL already applied. */
export function upsertDraft(next: OffchainContractDraft): OffchainContractDraft {
  const store = readStore();
  const existing = store[next.draftId];
  const winner = !existing || next.revisionNumber > existing.revisionNumber ? next : existing;
  store[next.draftId] = winner;
  writeStore(store);
  return winner;
}

/** Add an approving wallet to a draft without bumping its revision. Returns
 *  null if the draft is unknown (an ACCEPT referencing a proposal we haven't
 *  upserted yet — caller should not treat this as approval progress). */
export function recordApproval(draftId: string, approver: Address): OffchainContractDraft | null {
  const store = readStore();
  const existing = store[draftId];
  if (!existing) return null;
  const lower = approver.toLowerCase();
  if (existing.approvals.some((a) => a.toLowerCase() === lower)) return existing;
  const updated: OffchainContractDraft = {
    ...existing,
    approvals: [...existing.approvals, approver],
    lastActivityUnixMs: Date.now(),
  };
  store[draftId] = updated;
  writeStore(store);
  return updated;
}

/** Record the on-chain contract a draft was minted to. Kept in the store as
 *  history (not deleted) — `isMinted` is what hides it from "still negotiating" UI. */
export function recordMint(draftId: string, contractAddress: Address): OffchainContractDraft | null {
  const store = readStore();
  const existing = store[draftId];
  if (!existing) return null;
  const updated: OffchainContractDraft = { ...existing, mintedContractAddress: contractAddress, lastActivityUnixMs: Date.now() };
  store[draftId] = updated;
  writeStore(store);
  return updated;
}

/** Finds the local draft that is BOTH minted to `contractAddress` AND whose
 *  own party1/party2 genuinely match the contract's real on-chain parties
 *  (order-insensitive, case-insensitive) — the parties check gates candidacy
 *  itself, not just which candidate wins, so a draft that only matches the
 *  address (e.g. an attacker's own throwaway draft with a poisoned
 *  mintedContractAddress claim) can never shadow a real match and force a
 *  downgrade to the legacy (publicly-derivable-key) thread. `drafts` is
 *  expected pre-sorted newest-first (as `listDrafts()` already returns) so
 *  the freshest genuinely-matching draft wins ties.
 *
 *  Accepted residual risk: a *genuine* counterparty (both wallets real, both
 *  legitimately parties to `contractAddress`) could record a second
 *  throwaway draft's mint claim for the same contract; if it's more recently
 *  active, `.find()` prefers it over the original — since both drafts are
 *  between the same two real wallets this is history substitution /
 *  repudiation between legitimate parties, not a confidentiality break to a
 *  third party, and is out of scope to prevent here. */
export function resolveDraftForContract(
  drafts: OffchainContractDraft[],
  contractAddress: Address,
  onChainParty1: string,
  onChainParty2: string,
): OffchainContractDraft | null {
  const lower = contractAddress.toLowerCase();
  const cp1 = onChainParty1.toLowerCase();
  const cp2 = onChainParty2.toLowerCase();
  return drafts.find((d) => {
    if (d.mintedContractAddress?.toLowerCase() !== lower) return false;
    const dp1 = d.party1.toLowerCase();
    const dp2 = d.party2.toLowerCase();
    return (dp1 === cp1 && dp2 === cp2) || (dp1 === cp2 && dp2 === cp1);
  }) ?? null;
}

function draftEventName(draft: OffchainContractDraft): string {
  // IContract has no top-level `eventName`; the create-contract form nests it
  // under `promotion.value` (see backend/contract-services/createContract.ts).
  return String((draft.terms as { promotion?: { value?: string } }).promotion?.value || '').trim().toLowerCase();
}

/** True once a draft is retired: either an exact recorded mint (normal path —
 *  the SYSTEM `{ draftId, contractAddress }` message arrived), or, as a
 *  fallback for a contract minted on a device that never saw that message, an
 *  on-chain summary with matching parties (either order) and event name. */
export function isMinted(
  draft: OffchainContractDraft,
  onChainSummaries: { party1Address: string; party2Address: string; eventName: string }[],
): boolean {
  if (draft.mintedContractAddress) return true;
  const p1 = draft.party1.toLowerCase();
  const p2 = draft.party2.toLowerCase();
  const name = draftEventName(draft);
  if (!name) return false;
  return onChainSummaries.some((s) => {
    const sp1 = s.party1Address.toLowerCase();
    const sp2 = s.party2Address.toLowerCase();
    const sameParties = (sp1 === p1 && sp2 === p2) || (sp1 === p2 && sp2 === p1);
    return sameParties && s.eventName.trim().toLowerCase() === name;
  });
}
