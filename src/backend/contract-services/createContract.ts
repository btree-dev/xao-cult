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
  setPendingSign?: (value: boolean) => void;
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
export const handleImageUpload = async (
  formData: any,
  setIsUploading: (value: boolean) => void
): Promise<void> => {
  if (formData.promotion?.imageData) {
    setIsUploading(true);
    try {
      const imageUrl = await uploadImageToIPFS(
        formData.promotion.imageData,
        formData.promotion.imageFile?.name
      );
      formData.eventImageUri = imageUrl;
    } catch (uploadErr) {
      console.warn('Image upload failed, continuing without image:', uploadErr);
      formData.eventImageUri = '';
    }
    setIsUploading(false);
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
  action: string = 'SAVED'
): { params: CreateEventContractParams; error: string | null } => {
  const params = buildContractParams(formData, party1);
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
  stateSetters: ContractStateSetters,
  createEventContract: (params: CreateEventContractParams) => void
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
    await handleImageUpload(formData, setIsUploading);
    setTicketRowsToAdd(getTicketRows(formData));

    const { params, error: validationError } = buildAndValidateParams(formData, party1, party2, 'SAVED');
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

// Main function to handle signing contract
export const handleSignContract = async (
  isConnected: boolean,
  chainId: number | undefined,
  contractSectionRef: React.RefObject<any>,
  party1: string,
  party2: string,
  stateSetters: ContractStateSetters,
  createEventContract: (params: CreateEventContractParams) => void
): Promise<void> => {
  const { setIsContractCreating, setCreationError, setIsUploading, setTicketRowsToAdd, setPendingSign } = stateSetters;

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
    await handleImageUpload(formData, setIsUploading);
    setTicketRowsToAdd(getTicketRows(formData));

    const { params, error: validationError } = buildAndValidateParams(formData, party1, party2, 'SIGNED');
    if (validationError) {
      setCreationError(validationError);
      setIsContractCreating(false);
      return;
    }

    setPendingSign?.(true);
    createEventContract(params);
  } catch (err) {
    setCreationError(
      err instanceof Error ? err.message : "Failed to create and sign contract"
    );
    setIsContractCreating(false);
    setIsUploading(false);
    setPendingSign?.(false);
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
        await addTicketTypeAsync(contractAddress, {
          ticketTypeName: ticketRow.ticketType,
          onSaleDate: dateTimeToTimestamp(ticketRow.onSaleDate),
          numberOfTickets: parseFormattedNumber(ticketRow.numberOfTickets),
          ticketPrice: dollarToWei(ticketRow.ticketPrice),
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
export const uploadImageToIPFS = async (imageData: string, filename?: string): Promise<string> => {
  console.log('=== UPLOADING IMAGE TO IPFS ===');
  console.log('Filename:', filename);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData,
      filename: filename || 'contract-image.jpg',
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
