import {
  DatesConfig,
  LocationConfig,
  TicketConfig,
  FinancialConfig,
  PromoConfig,
  PartyConfig,
  PartyRole,
  CreateShowContractParams,
  CreateEventContractParams,
} from '../../hooks/useCreateContract';

export const dateToTimestamp = (dateString: string): bigint => {
  if (!dateString) return BigInt(0);
  const [datePart, timePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return BigInt(0);
  if (timePart) {
    const [hours, minutes] = timePart.split(':').map(Number);
    const date = new Date(year, month - 1, day, hours || 0, minutes || 0);
    return BigInt(Math.floor(date.getTime() / 1000));
  }
  const date = new Date(year, month - 1, day, 0, 0, 0);
  return BigInt(Math.floor(date.getTime() / 1000));
};

export const timeToSeconds = (timeString: string): bigint => {
  if (!timeString) return BigInt(0);
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return BigInt(0);
  return BigInt((hours * 3600) + (minutes * 60));
};

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

// USDC has 6 decimals
const USDC_DECIMALS = 6;

export const dollarToUSDC = (dollar: string): bigint => {
  if (!dollar) return BigInt(0);
  const cleaned = dollar.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return BigInt(0);
  return BigInt(Math.floor(parsed * 10 ** USDC_DECIMALS));
};

// Keep old name for backward compat
export const dollarToWei = dollarToUSDC;

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

export const buildContractParams = (
  formData: any,
  party1Username: string,
  otherPartyAddress: string,
  callerAddress?: `0x${string}`
): CreateShowContractParams => {
  console.log('=== BUILD SHOW CONTRACT PARAMS ===');
  console.log('formData:', formData);
  console.log('callerAddress (party1 wallet):', callerAddress);
  console.log('otherPartyAddress (party2 wallet):', otherPartyAddress);

  // ── Dates ──────────────────────────────────────────────────────────
  const eventStartFull = formData.datesAndTimes?.eventStartDate || '';
  const eventEndFull = formData.datesAndTimes?.eventEndDate || '';
  const eventStartDateOnly = eventStartFull.split('T')[0];
  const eventEndDateOnly = eventEndFull ? eventEndFull.split('T')[0] : eventStartDateOnly;

  const dates: DatesConfig = {
    announcementDate: dateToTimestamp(formData.datesAndTimes?.eventAnnouncementDate || ''),
    eventStartDate: dateToTimestamp(eventStartFull),
    eventEndDate: dateToTimestamp(eventEndFull || eventStartFull),
    loadInTime: dateTimeToTimestamp(eventStartDateOnly, formData.datesAndTimes?.loadIn || ''),
    doorsTime: dateTimeToTimestamp(eventStartDateOnly, formData.datesAndTimes?.doors || ''),
    startTime: dateTimeToTimestamp(eventStartDateOnly, formData.datesAndTimes?.startTime || ''),
    endTime: dateTimeToTimestamp(eventEndDateOnly, formData.datesAndTimes?.endTime || ''),
    setTime: timeToSeconds(formData.datesAndTimes?.setTime || ''),
    setLengthMinutes: BigInt(parseInt(formData.datesAndTimes?.setLength || '0', 10) || 0),
  };

  // ── Location ───────────────────────────────────────────────────────
  const location: LocationConfig = {
    venueName: formData.location?.venueName || '',
    venueAddress: formData.location?.address || '',
    radiusMiles: BigInt(parseInt(formData.location?.radiusDistance || '0', 10) || 0),
    radiusDays: BigInt(parseInt(formData.location?.days || '0', 10) || 0),
  };

  // ── Tickets ────────────────────────────────────────────────────────
  const totalCapacityValue = formData.tickets?.totalCapacity
    ? parseInt(formData.tickets.totalCapacity.replace(/,/g, ''), 10) || 0
    : formData.tickets?.ticketRows?.reduce(
        (sum: number, row: any) => sum + (parseInt(String(row.numberOfTickets || '0').replace(/,/g, ''), 10) || 0),
        0
      ) || 0;

  const ticketConfig: TicketConfig = {
    ticketsEnabled: formData.tickets?.ticketRows?.length > 0,
    totalCapacity: BigInt(totalCapacityValue || 0),
    salesTaxBPS: percentageToBasisPoints(formData.tickets?.salesTax || '0'),
  };

  // ── Financials (USDC amounts, not ETH/wei) ─────────────────────────
  const guaranteeDollar = (formData.money?.depositbandInput || '0').replace(/,/g, '');
  const guaranteePct = formData.money?.guaranteeInput || '0';

  const financialConfig: FinancialConfig = {
    guaranteeUSDC: parseFloat(guaranteeDollar) > 0
      ? dollarToUSDC(guaranteeDollar)
      : BigInt(0),
    guaranteePctBPS: parseFloat(guaranteePct) > 0
      ? percentageToBasisPoints(guaranteePct)
      : BigInt(0),
    backendBPS: percentageToBasisPoints(formData.money?.backendInput || '0'),
    barSplitBPS: percentageToBasisPoints(formData.money?.barsplitInput || '0'),
    merchSplitBPS: percentageToBasisPoints(formData.money?.merchSplitInput || '0'),
  };

  // ── Promo ──────────────────────────────────────────────────────────
  const riderText = formData.rider?.rows?.map((r: any) => r.value).filter(Boolean).join(', ') || '';

  const promoConfig: PromoConfig = {
    eventName: formData.promotion?.value || '',
    flyerDNSLink: formData.eventImageUri || '',
    flyerCIDHash: ZERO_BYTES32,
    riderIPFSCID: riderText,
    contractLegal: formData.legalAgreement || '',
    ticketLegal: formData.ticketLegalLanguage || '',
    contractCIDHash: ZERO_BYTES32,
  };

  // ── Party1 config ──────────────────────────────────────────────────
  const party1Config: PartyConfig = {
    wallet: (callerAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    role: PartyRole.PROMOTER,
    xaoUsername: party1Username,
  };

  return {
    party1Config,
    party2Address: (otherPartyAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    party2Role: PartyRole.ARTIST,
    dates,
    location,
    ticketConfig,
    financialConfig,
    promoConfig,
  };
};

export const validateContractParams = (params: CreateShowContractParams): string | null => {
  if (!params.party2Address || params.party2Address === '0x') {
    return 'Party 2 address is required';
  }
  if (!params.party1Config.wallet || params.party1Config.wallet === '0x0000000000000000000000000000000000000000') {
    return 'Please connect your wallet';
  }
  if (!params.promoConfig.eventName) {
    return 'Event name is required';
  }
  return null;
};
