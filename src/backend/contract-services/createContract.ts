import React from 'react';
import { CreateEventContractParams, CreateShowContractParams } from '../../hooks/useCreateContract';
import { buildContractParams, validateContractParams, dateToTimestamp, percentageToBasisPoints, dollarToUSDC } from './contractHelpers';
import { validateBaseChain } from '../contracts';
import { TicketRow } from '../../pages/contracts/TicketsSection';
import { AddTicketTypeParams, dateTimeToTimestamp, dollarToWei, parseFormattedNumber } from '../../hooks/useAddTicketType';
import { ScheduleFn, ShowContractConfigApi } from '../../hooks/useShowContractSchedules';
import { encodeFunctionData, type Hex } from 'viem';
import { SHOW_CONTRACT_ABI } from '../../lib/web3/eventcontract';

// State setters interface for contract operations
export interface ContractStateSetters {
  setIsContractCreating: (value: boolean) => void;
  setCreationError: (value: string) => void;
  setIsUploading: (value: boolean) => void;
  setTicketRowsToAdd: (value: TicketRow[]) => void;
}

// Helper to gather form data from contract section ref
export const getFormData = (
  contractSectionRef: React.RefObject<any>,
  party1: string,
  party2: string
) => {
  const formData = contractSectionRef.current?.getContractData
    ? contractSectionRef.current.getContractData()
    : { party1, party2 };
  formData.party1 = party1;
  formData.party2 = party2;
  return formData;
};

// Helper to handle image upload
// If new base64 imageData exists, upload it (new image selected by user).
// Otherwise, use formData.eventImageUri (from getContractData) or existingImageUri as fallback.
export const handleImageUpload = async (
  formData: any,
  setIsUploading: (value: boolean) => void,
  existingImageUri?: string | null,
  groupName?: string
): Promise<void> => {
  const eventName = (formData.promotion?.value || 'event').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const startDate = formData.datesAndTimes?.eventStartDate || '';
  const ipfsFilename = startDate ? `${eventName}-${startDate}` : eventName;

  // New image selected — base64 data present and no IPFS URI yet
  if (formData.promotion?.imageData && !formData.eventImageUri) {
    setIsUploading(true);
    try {
      const imageUrl = await uploadImageToIPFS(
        formData.promotion.imageData,
        ipfsFilename,
        groupName || ipfsFilename
      );
      formData.eventImageUri = imageUrl;
    } catch (uploadErr) {
      console.warn('Image upload failed, continuing without image:', uploadErr);
      formData.eventImageUri = '';
    }
    setIsUploading(false);
    return;
  }

  // For XAO group (save/sign): ensure image exists in XAO group
  if (groupName === 'XAO') {
    const currentUri = formData.eventImageUri || existingImageUri;
    if (currentUri) {
      // Extract IPFS hash from the URI
      const hashMatch = currentUri.match(/ipfs\/([a-zA-Z0-9]+)/);
      const ipfsHash = hashMatch ? hashMatch[1] : null;

      if (ipfsHash) {
        // Check if this hash already exists in XAO group (API handles the check)
        setIsUploading(true);
        try {
          const checkRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ existingIpfsHash: ipfsHash, groupName: 'XAO', filename: ipfsFilename }),
          });
          const checkResult = await checkRes.json();
          if (checkResult.success) {
            // Already exists in XAO — use that URL
            formData.eventImageUri = checkResult.url;
            setIsUploading(false);
            return;
          }
        } catch (err) {
          console.warn('Check existing in XAO failed:', err);
        }

        // Not in XAO yet — fetch the image and re-upload to XAO
        try {
          const imgResponse = await fetch(currentUri);
          const imgBlob = await imgResponse.blob();
          const imageData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imgBlob);
          });
          const imageUrl = await uploadImageToIPFS(imageData, ipfsFilename, 'XAO');
          formData.eventImageUri = imageUrl;
        } catch (uploadErr) {
          console.warn('Re-upload to XAO failed, keeping existing URI:', uploadErr);
          formData.eventImageUri = currentUri;
        }
        setIsUploading(false);
        return;
      }
    }
  }

  // Already has URI from getContractData (e.g. received proposal image unchanged)
  if (formData.eventImageUri) {
    return;
  }
  // Fallback to previously uploaded URI
  if (existingImageUri) {
    formData.eventImageUri = existingImageUri;
  }
};

// Helper to extract ticket rows from form data
export const getTicketRows = (formData: any): TicketRow[] => {
  return formData.tickets?.ticketRows || [];
};

// Helper to build and validate contract params
export const buildAndValidateParams = (
  formData: any,
  party1: string,
  party2: string,
  otherPartyAddress: string,
  action: string = 'SAVED',
  callerAddress?: `0x${string}`
): { params: CreateShowContractParams; error: string | null } => {
  const params = buildContractParams(formData, party1, otherPartyAddress, callerAddress);
  logContractData(formData, party1, party2, params, action);
  const error = validateContractParams(params);
  return { params, error };
};

// Main function to handle saving contract (draft)
export const handleSaveContract = async (
  isConnected: boolean,
  chainId: number | undefined,
  contractSectionRef: React.RefObject<any>,
  party1: string,
  party2: string,
  otherPartyAddress: string,
  stateSetters: ContractStateSetters,
  createEventContract: (params: CreateShowContractParams) => void,
  existingImageUri?: string | null,
  callerAddress?: `0x${string}`
): Promise<void> => {
  const { setIsContractCreating, setCreationError, setIsUploading, setTicketRowsToAdd } = stateSetters;

  if (!isConnected) {
    setCreationError("Please connect your wallet");
    return;
  }

  const chainError = validateBaseChain(chainId);
  if (chainError) {
    setCreationError(chainError);
    return;
  }

  try {
    setIsContractCreating(true);
    setCreationError("");

    const formData = getFormData(contractSectionRef, party1, party2);
    await handleImageUpload(formData, setIsUploading, existingImageUri, 'XAO');
    setTicketRowsToAdd(getTicketRows(formData));

    const { params, error: validationError } = buildAndValidateParams(formData, party1, party2, otherPartyAddress, 'SAVED', callerAddress);
    if (validationError) {
      setCreationError(validationError);
      setIsContractCreating(false);
      return;
    }

    createEventContract(params);
  } catch (err) {
    setCreationError(
      err instanceof Error ? err.message : "Failed to create contract"
    );
    setIsContractCreating(false);
    setIsUploading(false);
  }
};

// Main function to handle signing an already-created contract
export const handleSignContract = async (
  isConnected: boolean,
  chainId: number | undefined,
  savedContractAddress: string | null,
  party1: string,
  stateSetters: ContractStateSetters,
  signContractAsync: (contractAddress: `0x${string}`, username: string) => Promise<any>,
  contractSectionRef: React.RefObject<any>
): Promise<void> => {
  const { setIsContractCreating, setCreationError } = stateSetters;

  if (!isConnected) {
    setCreationError("Please connect your wallet");
    return;
  }

  if (!savedContractAddress) {
    setCreationError("Please save the contract as a draft first before signing");
    return;
  }

  const chainError = validateBaseChain(chainId);
  if (chainError) {
    setCreationError(chainError);
    return;
  }

  try {
    setIsContractCreating(true);
    setCreationError("");

    await signContractAsync(savedContractAddress as `0x${string}`, party1);

    // Delete proposal image group from Pinata in background (non-blocking)
    deleteProposalImageGroup(contractSectionRef).catch((err) => {
      console.warn('Background cleanup of proposal image group failed:', err);
    });
  } catch (err) {
    setCreationError(
      err instanceof Error ? err.message : "Failed to sign contract"
    );
    setIsContractCreating(false);
  }
};

// Helper function to add ticket types to a contract
export const addTicketsToContract = async (
  contractAddress: `0x${string}`,
  ticketRows: TicketRow[],
  addTicketTypeAsync: (contractAddress: `0x${string}`, params: AddTicketTypeParams) => Promise<any>
): Promise<void> => {
  if (ticketRows.length > 0) {
    for (const ticketRow of ticketRows) {
      if (ticketRow.ticketType && ticketRow.numberOfTickets) {
        const price = dollarToWei(ticketRow.ticketPrice);
        await addTicketTypeAsync(contractAddress, {
          ticketTypeName: ticketRow.ticketType,
          onSaleDate: dateTimeToTimestamp(ticketRow.onSaleDate),
          numberOfTickets: parseFormattedNumber(ticketRow.numberOfTickets),
          ticketPrice: price,
          isFree: price === BigInt(0),
        });
      }
    }
  }
};

// A single security-deposit / cancellation / payout form row.
interface ScheduleRow {
  dateTime: string;
  percentage: string;
  dollarAmount: string;
}

// Convert one form row to the ShowContract setter's (uint256, uint256, uint256)
// args. Returns null for an empty row so blank/placeholder rows are skipped.
const scheduleRowToArgs = (row: ScheduleRow): [bigint, bigint, bigint] | null => {
  const ts = dateToTimestamp(row?.dateTime || '');       // works on datetime-local strings (splits on 'T')
  const pct = percentageToBasisPoints(row?.percentage || '0');
  const amt = dollarToUSDC(row?.dollarAmount || '0');
  if (ts === BigInt(0) && pct === BigInt(0) && amt === BigInt(0)) return null;
  return [ts, pct, amt];
};

/**
 * Push the contract's payment schedules, payouts, and cancellation refunds
 * on-chain via the ShowContract setters. Must run after the draft is deployed
 * (contract in Draft) and by party1, since every setter is `onlyParty1
 * notFinalized`. Each row is a separate transaction (the contract has no batch
 * setter), so the caller will see one wallet prompt per non-empty row.
 *
 * Maps the create-contract form (getContractData) to the on-chain arrays:
 *   money.securityDepositRows  -> party1Deposits            (addParty1Deposit)
 *   money.securityDeposit2Rows -> party2Deposits            (addParty2Deposit)
 *   payments.party1            -> party1Payouts             (addParty1Payout)
 *   payments.party2            -> party2Payouts             (addParty2Payout)
 *   money.cancelParty1Rows     -> party1CancellationRefunds (addParty1CancellationRefund)
 *   money.cancelParty2Rows     -> party2CancellationRefunds (addParty2CancellationRefund)
 */
export const addPaymentSchedulesToContract = async (
  contractAddress: `0x${string}`,
  formData: any,
  addSchedule: (
    contractAddress: `0x${string}`,
    fn: ScheduleFn,
    arg1: bigint,
    arg2: bigint,
    arg3: bigint,
  ) => Promise<`0x${string}`>,
): Promise<void> => {
  const money = formData?.money || {};
  const payments = formData?.payments || {};

  const groups: Array<{ rows: ScheduleRow[]; fn: ScheduleFn }> = [
    { rows: money.securityDepositRows || [], fn: 'addParty1Deposit' },
    { rows: money.securityDeposit2Rows || [], fn: 'addParty2Deposit' },
    { rows: payments.party1 || [], fn: 'addParty1Payout' },
    { rows: payments.party2 || [], fn: 'addParty2Payout' },
    { rows: money.cancelParty1Rows || [], fn: 'addParty1CancellationRefund' },
    { rows: money.cancelParty2Rows || [], fn: 'addParty2CancellationRefund' },
  ];

  for (const group of groups) {
    for (const row of group.rows) {
      const args = scheduleRowToArgs(row);
      if (!args) continue;
      try {
        await addSchedule(contractAddress, group.fn, args[0], args[1], args[2]);
      } catch (err) {
        // Don't abort the whole batch if one row fails — log and continue.
        console.warn(`[addPaymentSchedules] ${group.fn} failed for row`, row, err);
      }
    }
  }
};

/**
 * Push the "frontend-parity" config fields on-chain via the ShowContract
 * setters added for genres / comps / tickets-sale date / resale splits. Must
 * run after deploy (Draft) and by party1 (setters are onlyParty1 notFinalized).
 * Each field is its own transaction. Every call is guarded so that, if the
 * deployed contract predates these setters (old factory), the revert is logged
 * and the rest of the save flow continues instead of breaking.
 *
 *   promotion.genres        -> setGenres
 *   tickets.comps           -> setCompTickets
 *   datesAndTimes.ticketsSale-> setTicketsSaleDate
 *   tickets.resale {p1,p2,reseller} -> setResaleSplits (only if BPS sum to 10000)
 */
export const addConfigFieldsToContract = async (
  contractAddress: `0x${string}`,
  formData: any,
  configApi: ShowContractConfigApi,
): Promise<void> => {
  // ── genres ──
  try {
    const genres: string[] = (formData?.promotion?.genres || []).filter(
      (g: unknown) => typeof g === 'string' && g.trim().length > 0,
    );
    if (genres.length > 0) {
      await configApi.setGenres(contractAddress, genres);
    }
  } catch (err) {
    console.warn('[addConfigFields] setGenres failed:', err);
  }

  // ── comps ──
  // NOTE: intentionally NOT wired. In the current form, the `tickets.comps`
  // state variable is mislabelled — the UI input bound to it is actually the
  // "Sales Tax" field (see TicketsSection: salesTaxPercent = comps), and its
  // value already reaches the chain as salesTaxBPS via buildContractParams.
  // There is no real complimentary-ticket-count field to source from, so
  // setCompTickets is left uncalled to avoid writing the sales-tax value as a
  // comp count. The on-chain compTickets field stays 0 until a genuine comps
  // input exists in the form.

  // ── tickets on-sale date ──
  try {
    const saleTs = dateToTimestamp(formData?.datesAndTimes?.ticketsSale || '');
    if (saleTs > BigInt(0)) {
      await configApi.setTicketsSaleDate(contractAddress, saleTs);
    }
  } catch (err) {
    console.warn('[addConfigFields] setTicketsSaleDate failed:', err);
  }

  // ── resale splits (only when the three percentages convert to a valid
  //    10000-BPS split; the on-chain setter reverts otherwise) ──
  try {
    const resale = formData?.tickets?.resale || {};
    const p1 = percentageToBasisPoints(resale.party1 || '0');
    const p2 = percentageToBasisPoints(resale.party2 || '0');
    const reseller = percentageToBasisPoints(resale.reseller || '0');
    if (p1 + p2 + reseller === BigInt(10000)) {
      await configApi.setResaleSplits(contractAddress, p1, p2, reseller);
    } else {
      console.warn('[addConfigFields] skipping setResaleSplits — BPS do not sum to 10000:', {
        p1: p1.toString(), p2: p2.toString(), reseller: reseller.toString(),
      });
    }
  } catch (err) {
    console.warn('[addConfigFields] setResaleSplits failed:', err);
  }
};

/**
 * Build the array of ABI-encoded setter calls for a freshly-created (Draft)
 * ShowContract — payment schedules, payouts, cancellation refunds, genres,
 * tickets-sale date, and resale splits. Sending these through ShowContract's
 * `multicall` runs them all in ONE transaction (one wallet confirmation)
 * instead of one per field. Empty/invalid entries are skipped.
 */
export const buildSetupCalldata = (formData: any): Hex[] => {
  const calls: Hex[] = [];
  const money = formData?.money || {};
  const payments = formData?.payments || {};

  const push = (functionName: string, args: any[]) => {
    calls.push(encodeFunctionData({ abi: SHOW_CONTRACT_ABI as any, functionName: functionName as any, args }));
  };

  const scheduleGroups: Array<{ rows: any[]; fn: string }> = [
    { rows: money.securityDepositRows || [], fn: 'addParty1Deposit' },
    { rows: money.securityDeposit2Rows || [], fn: 'addParty2Deposit' },
    { rows: payments.party1 || [], fn: 'addParty1Payout' },
    { rows: payments.party2 || [], fn: 'addParty2Payout' },
    { rows: money.cancelParty1Rows || [], fn: 'addParty1CancellationRefund' },
    { rows: money.cancelParty2Rows || [], fn: 'addParty2CancellationRefund' },
  ];
  for (const group of scheduleGroups) {
    for (const row of group.rows) {
      const ts = dateToTimestamp(row?.dateTime || '');
      const pct = percentageToBasisPoints(row?.percentage || '0');
      const amt = dollarToUSDC(row?.dollarAmount || '0');
      if (ts === BigInt(0) && pct === BigInt(0) && amt === BigInt(0)) continue;
      push(group.fn, [ts, pct, amt]);
    }
  }

  const genres: string[] = (formData?.promotion?.genres || []).filter(
    (g: unknown) => typeof g === 'string' && g.trim().length > 0,
  );
  if (genres.length > 0) push('setGenres', [genres]);

  const saleTs = dateToTimestamp(formData?.datesAndTimes?.ticketsSale || '');
  if (saleTs > BigInt(0)) push('setTicketsSaleDate', [saleTs]);

  const resale = formData?.tickets?.resale || {};
  const rp1 = percentageToBasisPoints(resale.party1 || '0');
  const rp2 = percentageToBasisPoints(resale.party2 || '0');
  const rReseller = percentageToBasisPoints(resale.reseller || '0');
  if (rp1 + rp2 + rReseller === BigInt(10000)) push('setResaleSplits', [rp1, rp2, rReseller]);

  return calls;
};

/**
 * Add ticket tiers to a finalized XAOTicket from the create-contract form's
 * ticket rows. Shared by create-contract's sign handler AND contracts-detail's
 * sign handler (which reads the rows from the off-chain draft) so tiers get
 * added on finalize no matter which page the finalizing signature came from.
 * All tiers use the event flyer as their NFT image.
 */
export const addTiersFromRows = async (
  ticketCollectionAddr: `0x${string}`,
  ticketRows: any[],
  resale: { party1?: string; party2?: string; reseller?: string } | undefined,
  eventImage: string,
  addTier: (
    addr: `0x${string}`,
    params: {
      ticketType: number; customName: string; priceUSDC: bigint; quantity: bigint;
      onSaleTimestamp: bigint; party1ResaleBPS: bigint; party2ResaleBPS: bigint;
      resellerBPS: bigint; image: string;
    },
  ) => Promise<any>,
): Promise<void> => {
  if (!Array.isArray(ticketRows) || ticketRows.length === 0) return;

  // Resale royalty split (percentages → BPS). XAOTicket requires them to sum to
  // 10000; fall back to an even split so a valid tier is still created.
  const rp1 = percentageToBasisPoints(resale?.party1 || '0');
  const rp2 = percentageToBasisPoints(resale?.party2 || '0');
  const rReseller = percentageToBasisPoints(resale?.reseller || '0');
  const resaleValid = rp1 + rp2 + rReseller === BigInt(10000);
  const party1ResaleBPS = resaleValid ? rp1 : BigInt(3333);
  const party2ResaleBPS = resaleValid ? rp2 : BigInt(3333);
  const resellerBPS = resaleValid ? rReseller : BigInt(3334);

  const nameToEnum = (name: string): number => {
    const lower = String(name).toLowerCase().trim();
    if (lower === 'comp' || lower === 'complimentary') return 0;
    if (lower === 'presale' || lower === 'pre-sale') return 1;
    if (lower === 'general admission' || lower === 'ga') return 2;
    if (lower === 'vip') return 3;
    return 4; // CUSTOM
  };

  for (const row of ticketRows) {
    if (!row?.ticketType || !row?.numberOfTickets) continue;
    const ticketTypeEnum = nameToEnum(row.ticketType);
    const customName = ticketTypeEnum === 4 ? row.ticketType : '';
    const priceUSDC = dollarToWei(row.ticketPrice);
    const quantity = BigInt(parseInt(String(row.numberOfTickets).replace(/,/g, '')) || 0);
    const onSale = row.onSaleDate ? dateTimeToTimestamp(row.onSaleDate) : BigInt(0);
    try {
      await addTier(ticketCollectionAddr, {
        ticketType: ticketTypeEnum,
        customName,
        priceUSDC,
        quantity,
        onSaleTimestamp: onSale,
        party1ResaleBPS,
        party2ResaleBPS,
        resellerBPS,
        image: eventImage || '',
      });
    } catch (tierErr) {
      console.warn(`[addTiersFromRows] Failed to add tier ${row.ticketType}:`, tierErr);
    }
  }
};

export const toggleGenreSelection = (
  genre: string,
  setGenres: React.Dispatch<React.SetStateAction<string[]>>
): void => {
  setGenres((prev) =>
    prev.includes(genre)
      ? prev.filter((g) => g !== genre)
      : [...prev, genre]
  );
};

// Helper to delete the proposal image group from Pinata after save/sign
// After deletion, re-fetch the final image from gateway cache and re-upload to XAO group
export const deleteProposalImageGroup = async (
  contractSectionRef: React.RefObject<any>
): Promise<void> => {
  try {
    const formData = contractSectionRef.current?.getContractData?.();
    if (!formData) return;

    const eventName = (formData.promotion?.value || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const startDate = formData.datesAndTimes?.eventStartDate || '';
    if (!eventName) return;

    const groupName = startDate ? `${eventName}-${startDate}` : eventName;
    const ipfsFilename = startDate ? `${eventName}-${startDate}` : eventName;

    // Get the final image URI before deleting the group
    const imageUri = formData.eventImageUri;

    // Delete the proposal group (this unpins all files in it)
    await fetch('/api/deletegroup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupName }),
    });

    // Re-fetch the image from gateway cache and re-upload to XAO group
    if (imageUri) {
      try {
        const imgResponse = await fetch(imageUri);
        if (imgResponse.ok) {
          const imgBlob = await imgResponse.blob();
          const imageData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imgBlob);
          });
          await uploadImageToIPFS(imageData, ipfsFilename, 'XAO');
          console.log('Re-uploaded final image to XAO group after cleanup');
        }
      } catch (uploadErr) {
        console.warn('Failed to re-upload image to XAO after group deletion:', uploadErr);
      }
    }
  } catch (err) {
    console.warn('Failed to delete proposal image group:', err);
  }
};

// Helper function to handle image file selection
export const handleImageSelection = (
  event: React.ChangeEvent<HTMLInputElement>,
  setImageFile: (file: File | null) => void,
  setImagePreview: (preview: string | null) => void
): void => {
  const file = event.target.files?.[0];
  if (file) {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};

// Helper function to upload image to IPFS via Pinata
export const uploadImageToIPFS = async (imageData: string, filename?: string, groupName?: string): Promise<string> => {
  console.log('=== UPLOADING IMAGE TO IPFS ===');
  console.log('Filename:', filename);
  console.log('Group:', groupName);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData,
      filename: filename || 'event',
      groupName: groupName || filename || 'event',
    }),
  });

  const result = await response.json();
  console.log('IPFS Upload Result:', result);

  if (!result.success) {
    throw new Error(result.error || 'Failed to upload image to IPFS');
  }

  console.log('IPFS URL:', result.url);
  console.log('IPFS Hash:', result.ipfsHash);
  return result.url;
};

export const logContractData = (
  formData: any,
  party1: string,
  party2: string,
  params: CreateEventContractParams,
  action: string = 'SAVED'
) => {
  console.log(`=== CONTRACT DATA BEING ${action} TO CHAIN ===`);
  console.log('--- PARTIES ---');
  console.log('Party 1 Username:', party1);
  console.log('Party 2 Address:', party2);
  console.log('--- DATES & TIMES ---');
  console.log('Event Announcement Date:', formData.datesAndTimes?.eventAnnouncementDate);
  console.log('Event Start Date:', formData.datesAndTimes?.eventStartDate);
  console.log('Event End Date:', formData.datesAndTimes?.eventEndDate);
  console.log('Load In:', formData.datesAndTimes?.loadIn);
  console.log('Doors:', formData.datesAndTimes?.doors);
  console.log('Start Time:', formData.datesAndTimes?.startTime);
  console.log('End Time:', formData.datesAndTimes?.endTime);
  console.log('Set Time:', formData.datesAndTimes?.setTime);
  console.log('Set Length:', formData.datesAndTimes?.setLength);
  console.log('--- LOCATION ---');
  console.log('Venue Name:', formData.location?.venueName);
  console.log('Address:', formData.location?.address);
  console.log('Radius Distance:', formData.location?.radiusDistance);
  console.log('Days:', formData.location?.days);
  console.log('--- TICKETS ---');
  console.log('Total Capacity:', formData.tickets?.totalCapacity);
  console.log('Sales Tax:', formData.tickets?.salesTax);
  console.log('Ticket Rows:', formData.tickets?.ticketRows);
  console.log('--- RESALE RULES ---');
  console.log('Party 1 Resale %:', formData.tickets?.resale?.party1);
  console.log('Party 2 Resale %:', formData.tickets?.resale?.party2);
  console.log('Reseller Resale %:', formData.tickets?.resale?.reseller);
  console.log('--- MONEY ---');
  console.log('Guarantee:', formData.money?.guaranteeInput);
  console.log('Backend %:', formData.money?.backendInput);
  console.log('Bar Split %:', formData.money?.barsplitInput);
  console.log('Merch Split %:', formData.money?.merchSplitInput);
  console.log('--- PROMOTION ---');
  console.log('Event Name:', formData.promotion?.value);
  console.log('Genres:', formData.promotion?.genres);
  console.log('Event Image URI:', formData.eventImageUri);
  console.log('--- RIDER ---');
  console.log('Rider:', formData.rider?.rows);
  console.log('--- LEGAL ---');
  console.log('Legal Agreement:', formData.legalAgreement);
  console.log('--- BLOCKCHAIN PARAMS ---');
  console.log('Contract Params:', params);
  console.log('==========================================');
};
