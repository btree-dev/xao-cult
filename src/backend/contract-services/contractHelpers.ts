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
  // new Date("YYYY-MM-DD") parses as UTC midnight, causing timezone offset.
  // Parse components manually to use local time.
  const [datePart, timePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return BigInt(0);
  if (timePart) {
    // datetime-local format: "YYYY-MM-DDTHH:MM"
    const [hours, minutes] = timePart.split(':').map(Number);
    const date = new Date(year, month - 1, day, hours || 0, minutes || 0);
    return BigInt(Math.floor(date.getTime() / 1000));
  }
  // Date-only: use midnight local time
  const date = new Date(year, month - 1, day, 0, 0, 0);
  return BigInt(Math.floor(date.getTime() / 1000));
};
export const timeToSeconds = (timeString: string): bigint => {
  if (!timeString) return BigInt(0);
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return BigInt(0);
  return BigInt((hours * 3600) + (minutes * 60));
};

// Combine a date string and time string into a full Unix timestamp
// e.g. dateString="2026-03-15" + timeString="20:00" → full timestamp for Mar 15 2026 8pm
export const dateTimeToTimestamp = (dateString: string, timeString: string): bigint => {
  if (!dateString || !timeString) return BigInt(0);
  const dateTs = dateToTimestamp(dateString);
  const timeSecs = timeToSeconds(timeString);
  if (dateTs === BigInt(0) || timeSecs === BigInt(0)) return BigInt(0);
  return dateTs + timeSecs;
};


export const percentageToBasisPoints = (percentage: string): bigint => {
  if (!percentage) return BigInt(0);
  const parsed = parseFloat(percentage);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.floor(parsed * 100));
};


// ETH price in USD for dollar-to-ETH conversion
const ETH_PRICE_USD = 2000;

export const dollarToWei = (dollar: string): bigint => {
  if (!dollar) return BigInt(0);
  const parsed = parseFloat(dollar);
  if (isNaN(parsed)) return BigInt(0);
  const eth = parsed / ETH_PRICE_USD;
  return BigInt(Math.floor(eth * 1e18));
};


export const buildContractParams = (formData: any, party1Username: string, otherPartyAddress: string): CreateEventContractParams => {
  console.log('=== BUILD CONTRACT PARAMS DEBUG ===');
  console.log('formData:', formData);
  console.log('otherPartyAddress (_p2Addr):', otherPartyAddress);
  console.log('datesAndTimes:', formData.datesAndTimes);
  console.log('location:', formData.location);
  console.log('tickets:', formData.tickets);
  console.log('money:', formData.money);

  // datetime-local inputs give "YYYY-MM-DDTHH:MM" — use full value for announce/show
  const eventStartFull = formData.datesAndTimes?.eventStartDate || '';
  const eventEndFull = formData.datesAndTimes?.eventEndDate || '';
  // Extract date-only (YYYY-MM-DD) for combining with separate time-only fields
  const eventStartDateOnly = eventStartFull.split('T')[0];
  const eventEndDateOnly = eventEndFull ? eventEndFull.split('T')[0] : eventStartDateOnly;
  const dates: DatesAndTimes = {
    announce: dateToTimestamp(formData.datesAndTimes?.eventAnnouncementDate || ''),
    show: dateToTimestamp(eventStartFull),
    loadIn: dateTimeToTimestamp(eventStartDateOnly, formData.datesAndTimes?.loadIn || ''),
    doors: dateTimeToTimestamp(eventStartDateOnly, formData.datesAndTimes?.doors || ''),
    start: dateTimeToTimestamp(eventStartDateOnly, formData.datesAndTimes?.startTime || ''),
    end: dateTimeToTimestamp(eventEndDateOnly, formData.datesAndTimes?.endTime || ''),
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

 
  // Guarantee: user fills either % (guaranteeInput) or $ (depositbandInput), they are mutually exclusive
  const guaranteePct = formData.money?.guaranteeInput || '0';
  const guaranteeDollar = (formData.money?.depositbandInput || '0').replace(/,/g, '');
  // Backend: user fills either % (backendInput) or $ (securitydepositAdd), they are mutually exclusive
  const backendPct = formData.money?.backendInput || '0';
  const backendDollar = (formData.money?.securitydepositAdd || '0').replace(/,/g, '');

  console.log('guaranteePct:', guaranteePct, 'guaranteeDollar:', guaranteeDollar);
  console.log('backendPct:', backendPct, 'backendDollar:', backendDollar);
  console.log('barsplitInput:', formData.money?.barsplitInput);
  console.log('merchSplitInput:', formData.money?.merchSplitInput);

  const payIn: PayInConfig = {
    // If dollar amount is provided, use it; otherwise fall back to percentage converted to wei
    guarantee: parseFloat(guaranteeDollar) > 0
      ? dollarToWei(guaranteeDollar)
      : dollarToWei(guaranteePct),
    guaPct: parseFloat(guaranteePct) > 0
      ? percentageToBasisPoints(guaranteePct)
      : BigInt(0),
    backPct: parseFloat(backendPct) > 0
      ? percentageToBasisPoints(backendPct)
      : BigInt(0),
    barPct: percentageToBasisPoints(formData.money?.barsplitInput || '0'),
    merchPct: percentageToBasisPoints(formData.money?.merchSplitInput || '0'),
  };
  console.log('payIn built:', payIn);


  const riderText = formData.rider?.rows?.map((r: any) => r.value).filter(Boolean).join(', ') || '';

  
  const genres: string[] = formData.promotion?.genres || [];

  return {
    party1Username,
    // msg.sender becomes party1.addr on-chain, so _p2Addr must be the OTHER party's wallet.
    // otherPartyAddress is the peerAddress (always the other party, never yourself).
    party2Address: (otherPartyAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
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
