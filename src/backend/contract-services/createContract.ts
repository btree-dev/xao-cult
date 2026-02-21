import React from 'react';
import { CreateEventContractParams } from '../../hooks/useCreateContract';
import { buildContractParams, validateContractParams } from './contractHelpers';
import { validateBaseChain } from '../contracts';
import { TicketRow } from '../../pages/contracts/TicketsSection';
import { AddTicketTypeParams, dateTimeToTimestamp, dollarToWei, parseFormattedNumber } from '../../hooks/useAddTicketType';

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
  action: string = 'SAVED'
): { params: CreateEventContractParams; error: string | null } => {
  const params = buildContractParams(formData, party1, otherPartyAddress);
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
  createEventContract: (params: CreateEventContractParams) => void,
  existingImageUri?: string | null
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

    const { params, error: validationError } = buildAndValidateParams(formData, party1, party2, otherPartyAddress, 'SAVED');
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
