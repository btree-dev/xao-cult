import type { Address } from 'viem';
import type { IContract } from '../../backend/services/types/api';

const LS_KEY = 'xao-cult-offchain-contracts';

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
  return Object.values(readStore()).sort((a, b) => b.lastActivityUnixMs - a.lastActivityUnixMs);
}

export function loadDraft(draftId: string): OffchainContractDraft | null {
  return readStore()[draftId] ?? null;
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
