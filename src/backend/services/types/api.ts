export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  error?: string;
}

export interface IVenue {
  _id?: string;
  name: string;
  address?: string;
  capacity?: number;
}

export interface IArtist {
  _id?: string;
  name: string;
  genre?: string;
  profilePicUrl?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEvent {
  _id?: string;
  title: string;
  description?: string;
  organizerName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  venueId: string;
  eventPicUrl?: string;
  artistIds?: string[];
  likes: number;
  views: number;
  tags?: string[];
  ticketPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EventCreateInput {
  title: string;
  description?: string;
  organizerName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  venueId: string;
  eventPicUrl?: string;
  artistIds?: string[];
  likes?: number;
  views?: number;
  tags?: string[];
  ticketPrice?: number;
}

export interface EventUpdateInput {
  title?: string;
  description?: string;
  organizerName?: string;
  date?: Date;
  startTime?: Date;
  endTime?: Date;
  venueId?: string;
  eventPicUrl?: string;
  artistIds?: string[];
  likes?: number;
  views?: number;
  tags?: string[];
  ticketPrice?: number;
  updatedAt?: Date;
}

export interface EventFilters {
  limit?: number;
  skip?: number;
  venueId?: string;
  artistId?: string;
}

export interface DateRangeFilter {
  start: Date;
  end: Date;
}

export interface ArtistFilters {
  limit?: number;
  skip?: number;
  genre?: string;
}

// Profile Types
export interface IProfile {
  _id?: string;
  username: string;
  walletAddresses: Array<{ address: string; isSelected: boolean }>;
  didEth?: string;
  didWeb?: string;
  location?: { city: string };
  radius?: number;
  genres?: string[];
  profilePicUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProfileFilters {
  limit?: number;
  skip?: number;
  genre?: string;
  city?: string;
  search?: string;
}

export interface ITicket {
  _id?: string;
  eventId?: string;
  userId?: string;
  ticketType?: string;
  price?: number;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TicketFilters {
  limit?: number;
  skip?: number;
}

export interface IContract {
  _id?: string;
  eventId?: string;
  status?: string;
  terms?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContractFilters {
  limit?: number;
  skip?: number;
}

export interface IGenre {
  _id?: string;
  name?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface IContract {
  _id?: string;
  eventId?: string;
  party1?: string;
  party2?: string;
  status?: string;
  terms?: string;
  datesAndTimes?: {
    startTime?: string;
    endTime?: string;
    loadIn?: string;
    doors?: string;
    setTime?: string;
    setLength?: string;
    ticketsSale?: string;
    showDate?: string;
  };
  location?: {
    venueName?: string;
    address?: string;
  };
  tickets?: any; // Replace 'any' with your TicketRow[] type if available
  money?: any;   // Replace 'any' with your MoneySection type if available
  payments?: any;
  promotion?: any;
  rider?: any;
  legalAgreement?: string;
  createdAt?: Date;
  updatedAt?: Date;
}