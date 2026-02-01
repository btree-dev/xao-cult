import { 
  DatesAndTimes, 
  Location, 
  TicketConfig, 
  ResaleRules, 
  PayInConfig,
  CreateEventContractParams 
} from '../../hooks/useCreateContract';


export const dateToTimestamp = (dateString: string): bigint => {
  if (!dateString) return BigInt(0);
  const date = new Date(dateString);
  return BigInt(Math.floor(date.getTime() / 1000));
};


export const timeToSeconds = (timeString: string): bigint => {
  if (!timeString) return BigInt(0);
  const [hours, minutes] = timeString.split(':').map(Number);
  return BigInt((hours * 3600) + (minutes * 60));
};


export const percentageToBasisPoints = (percentage: string): bigint => {
  if (!percentage) return BigInt(0);
  return BigInt(Math.floor(parseFloat(percentage) * 100));
};


export const dollarToWei = (dollar: string): bigint => {
  if (!dollar) return BigInt(0);
  return BigInt(Math.floor(parseFloat(dollar) * 1e18));
};


export const buildContractParams = (formData: any, party1Username: string): CreateEventContractParams => {

  const dates: DatesAndTimes = {
    eventAnnouncement: dateToTimestamp(formData.datesAndTimes?.eventAnnouncementDate || ''),
    showDate: dateToTimestamp(formData.datesAndTimes?.eventStartDate || ''),
    loadIn: timeToSeconds(formData.datesAndTimes?.loadIn || ''),
    doors: timeToSeconds(formData.datesAndTimes?.doors || ''),
    startTime: timeToSeconds(formData.datesAndTimes?.startTime || ''),
    endTime: timeToSeconds(formData.datesAndTimes?.endTime || ''),
    setTime: timeToSeconds(formData.datesAndTimes?.setTime || ''),
    setLength: BigInt(parseInt(formData.datesAndTimes?.setLength || '0') || 0),
  };


  const location: Location = {
    venueName: formData.location?.venueName || '',
    physicalAddress: formData.location?.address || '',
    radiusMiles: BigInt(parseInt(formData.location?.radiusDistance || '0') || 0),
    radiusDays: BigInt(parseInt(formData.location?.days || '0') || 0),
  };


  // Parse total capacity - use provided value or calculate from ticket rows
  const totalCapacityValue = formData.tickets?.totalCapacity
    ? parseInt(formData.tickets.totalCapacity.replace(/,/g, '') || '0')
    : formData.tickets?.ticketRows?.reduce(
        (sum: number, row: any) => sum + (parseInt(String(row.numberOfTickets).replace(/,/g, '')) || 0),
        0
      ) || 0;

  // Parse sales tax percentage and convert to basis points (e.g., 8% = 800, 8.5% = 850)
  const salesTaxBasisPoints = percentageToBasisPoints(formData.tickets?.salesTax || '0');

  const ticketConfig: TicketConfig = {
    ticketsEnabled: formData.tickets?.ticketRows?.length > 0,
    totalCapacity: BigInt(totalCapacityValue),
    salesTaxPercentage: salesTaxBasisPoints,
    ticketTypeCount: BigInt(formData.tickets?.ticketRows?.length || 0),
  };

  const party1Resale = percentageToBasisPoints(formData.tickets?.resale?.party1 || '33.33');
  const party2Resale = percentageToBasisPoints(formData.tickets?.resale?.party2 || '33.33');
  const resellerResale = percentageToBasisPoints(formData.tickets?.resale?.reseller || '33.34');
  
  const resaleRules: ResaleRules = {
    party1Percentage: party1Resale,
    party2Percentage: party2Resale,
    resellerPercentage: BigInt(10000) - party1Resale - party2Resale, // Ensure total is 10000
  };

 
  const payIn: PayInConfig = {
    guaranteeAmount: dollarToWei(formData.money?.guaranteeInput || '0'),
    guaranteePercentage: percentageToBasisPoints(formData.money?.guaranteeInput || '0'),
    backendPercentage: percentageToBasisPoints(formData.money?.backendInput || '0'),
    barSplitPercentage: percentageToBasisPoints(formData.money?.barsplitInput || '0'),
    merchSplitPercentage: percentageToBasisPoints(formData.money?.merchSplitInput || '0'),
  };


  const riderText = formData.rider?.rows?.map((r: any) => r.value).filter(Boolean).join(', ') || '';

  
  const genres: string[] = formData.promotion?.genres || [];

  return {
    party1Username,
    party2Address: (formData.party2 || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    dates,
    location,
    ticketConfig,
    resaleRules,
    payIn,
    eventName: formData.promotion?.value || '',
    eventImageUri: formData.eventImageUri || '',
    genres,
    rider: riderText,
    contractLegalLanguage: formData.legalAgreement || '',
    ticketLegalLanguage: formData.ticketLegalLanguage || '',
  };
};


export const validateContractParams = (params: CreateEventContractParams): string | null => {
  if (!params.party2Address || params.party2Address === '0x') {
    return 'Party 2 address is required';
  }
  
  if (!params.eventName) {
    return 'Event name is required';
  }

 
  const totalResale = params.resaleRules.party1Percentage + 
                      params.resaleRules.party2Percentage + 
                      params.resaleRules.resellerPercentage;
  if (totalResale !== BigInt(10000)) {
    return 'Resale percentages must equal 100%';
  }

  return null;
};
