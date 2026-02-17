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
  if (isNaN(hours) || isNaN(minutes)) return BigInt(0);
  return BigInt((hours * 3600) + (minutes * 60));
};


export const percentageToBasisPoints = (percentage: string): bigint => {
  if (!percentage) return BigInt(0);
  const parsed = parseFloat(percentage);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.floor(parsed * 100));
};


export const dollarToWei = (dollar: string): bigint => {
  if (!dollar) return BigInt(0);
  const parsed = parseFloat(dollar);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.floor(parsed * 1e18));
};


export const buildContractParams = (formData: any, party1Username: string): CreateEventContractParams => {
  console.log('=== BUILD CONTRACT PARAMS DEBUG ===');
  console.log('formData:', formData);
  console.log('datesAndTimes:', formData.datesAndTimes);
  console.log('location:', formData.location);
  console.log('tickets:', formData.tickets);
  console.log('money:', formData.money);

  const dates: DatesAndTimes = {
    announce: dateToTimestamp(formData.datesAndTimes?.eventAnnouncementDate || ''),
    show: dateToTimestamp(formData.datesAndTimes?.eventStartDate || ''),
    loadIn: timeToSeconds(formData.datesAndTimes?.loadIn || ''),
    doors: timeToSeconds(formData.datesAndTimes?.doors || ''),
    start: timeToSeconds(formData.datesAndTimes?.startTime || ''),
    end: timeToSeconds(formData.datesAndTimes?.endTime || ''),
    setTime: timeToSeconds(formData.datesAndTimes?.setTime || ''),
    setLength: BigInt(parseInt(formData.datesAndTimes?.setLength || '0', 10) || 0),
  };
  console.log('dates built:', dates);


  const location: Location = {
    venue: formData.location?.venueName || '',
    addr: formData.location?.address || '',
    radius: BigInt(parseInt(formData.location?.radiusDistance || '0', 10) || 0),
    days1: BigInt(parseInt(formData.location?.days || '0', 10) || 0),
  };
  console.log('location built:', location);

  const totalCapacityValue = formData.tickets?.totalCapacity
    ? parseInt(formData.tickets.totalCapacity.replace(/,/g, ''), 10) || 0
    : formData.tickets?.ticketRows?.reduce(
        (sum: number, row: any) => sum + (parseInt(String(row.numberOfTickets || '0').replace(/,/g, ''), 10) || 0),
        0
      ) || 0;

  console.log('salesTax value:', formData.tickets?.salesTax);
  console.log('totalCapacityValue:', totalCapacityValue);
  const salesTaxBasisPoints = percentageToBasisPoints(formData.tickets?.salesTax || '0');
  console.log('salesTaxBasisPoints:', salesTaxBasisPoints);
  const ticketConfig: TicketConfig = {
    enabled: formData.tickets?.ticketRows?.length > 0,
    capacity: BigInt(totalCapacityValue || 0),
    taxPct: salesTaxBasisPoints,
    typeCount: BigInt(formData.tickets?.ticketRows?.length || 0),
  };
  console.log('ticketConfig built:', ticketConfig);

  console.log('resale party1:', formData.tickets?.resale?.party1);
  console.log('resale party2:', formData.tickets?.resale?.party2);
  console.log('resale reseller:', formData.tickets?.resale?.reseller);
  
  const party1Resale = percentageToBasisPoints(formData.tickets?.resale?.party1 || '33.33');
  const party2Resale = percentageToBasisPoints(formData.tickets?.resale?.party2 || '33.33');
  const resellerResale = percentageToBasisPoints(formData.tickets?.resale?.reseller || '33.34');
  
  console.log('party1Resale:', party1Resale);
  console.log('party2Resale:', party2Resale);
  console.log('resellerResale:', resellerResale);
  
  const resaleRules: ResaleRules = {
    p1Pct: party1Resale,
    p2Pct: party2Resale,
    rPct: resellerResale,
  };
  console.log('resaleRules built:', resaleRules);

 
  console.log('guaranteeInput:', formData.money?.guaranteeInput);
  console.log('backendInput:', formData.money?.backendInput);
  console.log('barsplitInput:', formData.money?.barsplitInput);
  console.log('merchSplitInput:', formData.money?.merchSplitInput);
  
  const payIn: PayInConfig = {
    guarantee: dollarToWei(formData.money?.guaranteeInput || '0'),
    guaPct: BigInt(0), // Set to 0 as guarantee is a fixed amount, not percentage
    backPct: percentageToBasisPoints(formData.money?.backendInput || '0'),
    barPct: percentageToBasisPoints(formData.money?.barsplitInput || '0'),
    merchPct: percentageToBasisPoints(formData.money?.merchSplitInput || '0'),
  };
  console.log('payIn built:', payIn);


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

  return null;
};
