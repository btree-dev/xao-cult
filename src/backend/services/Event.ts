import apiClient from './ApiClient';
import { IEvent,IVenue, APIResponse, EventFilters, DateRangeFilter } from './types/api';

// Event API Class
export class EventAPI {
  private endpoint = '/events';

  async getAllEvents(filters?: EventFilters): Promise<IEvent[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.skip) params.append('skip', filters.skip.toString());
      
      const url = `${this.endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('🌐 Fetching all events from:', url);
      const response = await apiClient.get<APIResponse<IEvent[]>>(url);
      
      console.log('✅ Raw API response:', response.data);
      
      // Extract events and normalize _id
      let events = response.data.data || response.data;
      if (Array.isArray(events)) {
        events = events.map(this.normalizeEvent);
      }
      
      return events;
    } catch (error: any) {
      console.error('❌ Error in getAllEvents:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to fetch events');
    }
  }

  async getEventById(id: string): Promise<IEvent> {
    try {
      console.log('🔍 Fetching event by ID:', id);
      console.log('🔍 Full URL:', `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${this.endpoint}/${id}`);
      
      const response = await apiClient.get<any>(`${this.endpoint}/${id}`);
      
      console.log('✅ Raw response received:', response);
      console.log('✅ Response data:', response.data);
      console.log('✅ Response status:', response.status);
      
      // Handle different response structures
      let eventData: IEvent;
      
      if (response.data.data) {
        // Response format: { success: true, data: {...} }
        eventData = response.data.data;
      } else if (response.data.success !== undefined && response.data) {
        // Response format: { success: true, ...eventData }
        const { success, message, ...rest } = response.data;
        eventData = rest as IEvent;
      } else {
        // Direct event data
        eventData = response.data;
      }
      
      // Normalize the event (handle MongoDB ObjectId format)
      eventData = this.normalizeEvent(eventData);
      
      console.log('✅ Event data extracted and normalized:', eventData);
      return eventData;
    } catch (error: any) {
      console.error('❌ Error fetching event by ID:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Event not found');
      }
      
      if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Internal server error';
        throw new Error(`Server error: ${errorMsg}`);
      }
      
      // More detailed error message
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to fetch event';
      
      throw new Error(errorMessage);
    }
  }

  async getEventsByArtist(artistId: string): Promise<IEvent[]> {
    try {
      const response = await apiClient.get<APIResponse<IEvent[]>>(`${this.endpoint}/artist/${artistId}`);
      let events = response.data.data || response.data;
      if (Array.isArray(events)) {
        events = events.map(this.normalizeEvent);
      }
      return events;
    } catch (error: any) {
      console.error('❌ Error in getEventsByArtist:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch events by artist');
    }
  }

  async getEventsByVenue(venueId: string): Promise<IEvent[]> {
    try {
      const response = await apiClient.get<APIResponse<IEvent[]>>(`${this.endpoint}/venue/${venueId}`);
      let events = response.data.data || response.data;
      if (Array.isArray(events)) {
        events = events.map(this.normalizeEvent);
      }
      return events;
    } catch (error: any) {
      console.error('❌ Error in getEventsByVenue:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch events by venue');
    }
  }

  async getEventsByDateRange(dateRange: DateRangeFilter): Promise<IEvent[]> {
    try {
      const params = new URLSearchParams({
        start: dateRange.start.toISOString().split('T')[0], // YYYY-MM-DD format
        end: dateRange.end.toISOString().split('T')[0]
      });
      
      console.log('📅 Fetching events by date range:', params.toString());
      const response = await apiClient.get<APIResponse<IEvent[]>>(`${this.endpoint}/date-range?${params.toString()}`);
      
      let events = response.data.data || response.data;
      if (Array.isArray(events)) {
        events = events.map(this.normalizeEvent);
      }
      return events;
    } catch (error: any) {
      console.error('❌ Error in getEventsByDateRange:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch events by date range');
    }
  }

  async getTodaysEvents(): Promise<IEvent[]> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      
      return await this.getEventsByDateRange({
        start: startOfDay,
        end: endOfDay
      });
    } catch (error: any) {
      console.error('❌ Error in getTodaysEvents:', error);
      throw new Error('Failed to fetch today\'s events');
    }
  }

  // New method: Increment likes
  async likeEvent(id: string): Promise<boolean> {
    try {
      const response = await apiClient.post<APIResponse<{ message: string }>>(
        `${this.endpoint}/${id}/like`
      );
      return response.data.success;
    } catch (error: any) {
      console.error('❌ Error in likeEvent:', error);
      if (error.response?.status === 404) {
        throw new Error('Event not found');
      }
      throw new Error(error.response?.data?.message || 'Failed to like event');
    }
  }

  // New method: Increment views (manual)
  async recordView(id: string): Promise<boolean> {
    try {
      const response = await apiClient.post<APIResponse<{ message: string }>>(
        `${this.endpoint}/${id}/view`
      );
      return response.data.success;
    } catch (error: any) {
      console.error('❌ Error in recordView:', error);
      if (error.response?.status === 404) {
        throw new Error('Event not found');
      }
      throw new Error(error.response?.data?.message || 'Failed to record view');
    }
  }

  // Helper method to normalize MongoDB ObjectId format
  private normalizeEvent(event: any): IEvent {
    // Handle MongoDB's { $oid: "..." } format
    if (event._id && typeof event._id === 'object' && event._id.$oid) {
      event._id = event._id.$oid;
    }
    
    // Convert date strings to Date objects
    if (event.date && typeof event.date === 'string') {
      event.date = new Date(event.date);
    }
    if (event.startTime && typeof event.startTime === 'string') {
      event.startTime = new Date(event.startTime);
    }
    if (event.endTime && typeof event.endTime === 'string') {
      event.endTime = new Date(event.endTime);
    }
    if (event.createdAt && typeof event.createdAt === 'string') {
      event.createdAt = new Date(event.createdAt);
    }
    if (event.updatedAt && typeof event.updatedAt === 'string') {
      event.updatedAt = new Date(event.updatedAt);
    }
    
    return event as IEvent;
  }
}

export class VenueAPI {
  private endpoint = '/venues';

  async getVenueById(id: string): Promise<IVenue> {
    try {
      console.log('🏢 Fetching venue by ID:', id);
      console.log('🏢 Full URL:', `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${this.endpoint}/${id}`);
      
      const response = await apiClient.get<any>(`${this.endpoint}/${id}`);
      
      console.log('✅ Raw venue response received:', response);
      console.log('✅ Venue response data:', response.data);
      console.log('✅ Venue response status:', response.status);
      
      // Handle different response structures
      let venueData: IVenue;
      
      if (response.data.data) {
        // Response format: { success: true, data: {...} }
        venueData = response.data.data;
      } else if (response.data.success !== undefined && response.data) {
        // Response format: { success: true, ...venueData }
        const { success, message, ...rest } = response.data;
        venueData = rest as IVenue;
      } else {
        // Direct venue data
        venueData = response.data;
      }
      
      // Normalize the venue (handle MongoDB ObjectId format)
      venueData = this.normalizeVenue(venueData);
      
      console.log('✅ Venue data extracted and normalized:', venueData);
      return venueData;
    } catch (error: any) {
      console.error('❌ Error fetching venue by ID:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Venue not found');
      }
      
      if (error.response?.status === 500) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Internal server error';
        throw new Error(`Server error: ${errorMsg}`);
      }
      
      // More detailed error message
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'Failed to fetch venue';
      
      throw new Error(errorMessage);
    }
  }

  async getAllVenues(limit: number = 50, skip: number = 0): Promise<IVenue[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        skip: skip.toString()
      });
      
      const url = `${this.endpoint}?${params.toString()}`;
      console.log('🏢 Fetching all venues from:', url);
      const response = await apiClient.get<APIResponse<IVenue[]>>(url);
      
      console.log('✅ Raw venues API response:', response.data);
      
      // Extract venues and normalize _id
      let venues = response.data.data || response.data;
      if (Array.isArray(venues)) {
        venues = venues.map(this.normalizeVenue);
      }
      
      return venues;
    } catch (error: any) {
      console.error('❌ Error in getAllVenues:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to fetch venues');
    }
  }

  // Helper method to normalize MongoDB ObjectId format
  private normalizeVenue(venue: any): IVenue {
    // Handle MongoDB's { $oid: "..." } format
    if (venue._id && typeof venue._id === 'object' && venue._id.$oid) {
      venue._id = venue._id.$oid;
    }
    
    // Convert date strings to Date objects if present
    if (venue.createdAt && typeof venue.createdAt === 'string') {
      venue.createdAt = new Date(venue.createdAt);
    }
    if (venue.updatedAt && typeof venue.updatedAt === 'string') {
      venue.updatedAt = new Date(venue.updatedAt);
    }
    
    return venue as IVenue;
  }
}

export const eventAPI = new EventAPI();
export const venueAPI = new VenueAPI();
// Interface to match your current EventDocs structure
export interface EventDoc {
  id: string;
  artist: string;
  profilePic: string;
  tag: string;
  image: string;
  title: string;
  views: number;
  likes: number;
  description?: string;
  date?: Date;
  startTime?: Date;
  endTime?: Date;
  venueId?: string;
  tags?: string[];
  ticketPrice?: number;
}

// Function to transform API events to match your current UI structure
const transformEventToDoc = (event: IEvent): EventDoc => {
  return {
    id: event._id || '',
    artist: event.organizerName || 'Unknown Artist',
    profilePic: event.eventPicUrl || '/default-profile.png',
    tag: (event.tags && event.tags.length > 0) ? event.tags[0] : 'event',
    image: event.eventPicUrl || '/default-event.png',
    title: event.title || 'Untitled Event',
    description: event.description || '',
    date: event.date ? new Date(event.date) : undefined,
    startTime: event.startTime ? new Date(event.startTime) : undefined,
    endTime: event.endTime ? new Date(event.endTime) : undefined,
    venueId: event.venueId || '',
    tags: event.tags || [],
    ticketPrice: event.ticketPrice || 0,
    views: event.views || 0,
    likes: event.likes || 0,
  };
};

// Load events from API
let cachedEvents: EventDoc[] = [];
let isLoading = false;
let loadPromise: Promise<EventDoc[]> | null = null;

export const loadEvents = async (): Promise<EventDoc[]> => {
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  if (cachedEvents.length > 0) {
    return cachedEvents;
  }

  isLoading = true;
  
  loadPromise = (async () => {
    try {
      console.log('📡 Fetching events from API...');
      const apiEvents = await eventAPI.getAllEvents({ limit: 50, skip: 0 });
      console.log('✅ Fetched events:', apiEvents.length);
      
      cachedEvents = apiEvents.map(transformEventToDoc);
      
      return cachedEvents;
    } catch (error) {
      console.error('❌ Error loading events:', error);
      return [];
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
};

export const getEventsSync = (): EventDoc[] => {
  return cachedEvents;
};

export const clearEventsCache = () => {
  cachedEvents = [];
};

export const refreshEvents = async (): Promise<EventDoc[]> => {
  clearEventsCache();
  return await loadEvents();
};

// Helper function to like an event
export const likeEvent = async (eventId: string): Promise<boolean> => {
  try {
    const success = await eventAPI.likeEvent(eventId);
    if (success) {
      // Update cached event if exists
      const eventIndex = cachedEvents.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        cachedEvents[eventIndex].likes += 1;
      }
    }
    return success;
  } catch (error) {
    console.error('Error liking event:', error);
    return false;
  }
};

// Helper function to record a view
export const recordEventView = async (eventId: string): Promise<boolean> => {
  try {
    const success = await eventAPI.recordView(eventId);
    if (success) {
      // Update cached event if exists
      const eventIndex = cachedEvents.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        cachedEvents[eventIndex].views += 1;
      }
    }
    return success;
  } catch (error) {
    console.error('Error recording view:', error);
    return false;
  }
};

export const EventDocs: EventDoc[] = [];

if (typeof window !== 'undefined') {
  loadEvents().then(events => {
    EventDocs.push(...events);
  });
}