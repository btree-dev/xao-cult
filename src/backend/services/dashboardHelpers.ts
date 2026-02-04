import { FilterOptions, LocationFilterData } from '../../components/CalendarFilter';

// Cache for geocoded event locations
const eventLocationCache: Map<string, { lat: number; lng: number } | null> = new Map();

// Cache for user's default location coordinates
let userDefaultLocationCache: { location: string; coords: { lat: number; lng: number } | null } | null = null;

// Helper functions to get/set filters from sessionStorage
export const getStoredLocationFilter = (): LocationFilterData => {
  if (typeof window === 'undefined') return { name: '', coordinates: null };
  const stored = sessionStorage.getItem('locationFilter');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { name: '', coordinates: null };
    }
  }
  return { name: '', coordinates: null };
};

export const getStoredDateFilters = (): FilterOptions | null => {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem('dateFilters');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

// Format count for display (e.g., 1000 -> 1K, 1000000 -> 1M)
export const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};

// Haversine formula to calculate distance between two coordinates in kilometers
export const calculateDistanceKm = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Geocode an event location using OpenStreetMap Nominatim API
export const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
  // Check cache first
  if (eventLocationCache.has(location)) {
    return eventLocationCache.get(location) || null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      eventLocationCache.set(location, coords);
      return coords;
    }
  } catch (error) {
    console.error('Error geocoding location:', location, error);
  }

  eventLocationCache.set(location, null);
  return null;
};

// Parse event date string to Date object
export const parseEventDate = (dateString: string): Date | null => {
  try {
    const datePart = dateString.replace(/^[A-Za-z]+,\s*/, '');
    const eventDate = new Date(datePart);
    if (isNaN(eventDate.getTime())) {
      console.warn('Invalid date:', dateString);
      return null;
    }

    return eventDate;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
};

// Get user default location cache
export const getUserDefaultLocationCache = () => userDefaultLocationCache;

// Set user default location cache
export const setUserDefaultLocationCache = (location: string, coords: { lat: number; lng: number } | null) => {
  userDefaultLocationCache = { location, coords };
};

// Apply all filters to events
export const applyAllFilters = async (
  events: any[],
  dateFilters: FilterOptions | null,
  filterLocation: LocationFilterData,
  profile: any
): Promise<any[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filtered = [...events];

  // Step 1: Filter by date (only future events)
  filtered = filtered.filter((event) => {
    const eventDate = parseEventDate(event.date);
    if (!eventDate) return false;
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  // Step 2: Apply date range filter if set
  if (dateFilters?.startDate) {
    filtered = filtered.filter((event) => {
      const eventDate = parseEventDate(event.date);
      if (!eventDate) return false;
      eventDate.setHours(0, 0, 0, 0);

      const startDate = new Date(dateFilters.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (!dateFilters.endDate) {
        // Filter by month only
        const selectedMonth = startDate.getMonth();
        const selectedYear = startDate.getFullYear();
        const eventMonth = eventDate.getMonth();
        const eventYear = eventDate.getFullYear();
        return eventMonth === selectedMonth && eventYear === selectedYear;
      } else {
        // Filter by date range
        const endDate = new Date(dateFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        return eventDate >= startDate && eventDate <= endDate;
      }
    });
  }

  // Step 3: Apply genre filter if set
  if (dateFilters?.selectedGenres && dateFilters.selectedGenres.length > 0) {
    filtered = filtered.filter((event) => {
      return dateFilters.selectedGenres.includes(event.genre);
    });
  }

  // Step 4: Apply location filter if coordinates are set
  if (filterLocation.coordinates) {
    const { lat: filterLat, lng: filterLng } = filterLocation.coordinates;
    const RADIUS_KM = 10;

    const filteredWithDistance = await Promise.all(
      filtered.map(async (event) => {
        const eventCoords = await geocodeLocation(event.location || '');
        if (!eventCoords) {
          return { event, distance: Infinity };
        }
        const distance = calculateDistanceKm(
          filterLat, filterLng,
          eventCoords.lat, eventCoords.lng
        );
        return { event, distance };
      })
    );

    // Keep only events within radius and sort by distance
    filtered = filteredWithDistance
      .filter(({ distance }) => distance <= RADIUS_KM)
      .sort((a, b) => a.distance - b.distance)
      .map(({ event }) => event);
  } else {
    // Step 5: Apply sorting if no location filter
    filtered = await applySorting(filtered, dateFilters, profile);
  }

  return filtered;
};

// Apply sorting to filtered events
const applySorting = async (
  filtered: any[],
  dateFilters: FilterOptions | null,
  profile: any
): Promise<any[]> => {
  if (dateFilters?.sortBy && dateFilters.sortBy.length > 0) {
    const hasLocation = dateFilters.sortBy.includes('location');
    const hasGenre = dateFilters.sortBy.includes('genre');
    const hasDate = dateFilters.sortBy.includes('date');

    // If location sort is selected and user has a default location, sort by distance from user's city
    if (hasLocation && profile?.location) {
      // Get user's default location coordinates
      let userCoords = userDefaultLocationCache?.coords;

      // Check if we need to geocode the user's location
      if (!userDefaultLocationCache || userDefaultLocationCache.location !== profile.location) {
        userCoords = await geocodeLocation(profile.location);
        userDefaultLocationCache = { location: profile.location, coords: userCoords };
      }

      if (userCoords) {
        // Calculate distance for each event and sort by distance
        const eventsWithDistance = await Promise.all(
          filtered.map(async (event) => {
            const eventCoords = await geocodeLocation(event.location || '');
            if (!eventCoords) {
              return { event, distance: Infinity };
            }
            const distance = calculateDistanceKm(
              userCoords!.lat, userCoords!.lng,
              eventCoords.lat, eventCoords.lng
            );
            return { event, distance };
          })
        );

        // Sort by distance (nearest first), then by other criteria
        eventsWithDistance.sort((a, b) => {
          // First sort by distance
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }

          // Then by date if selected
          if (hasDate) {
            const dateA = parseEventDate(a.event.date);
            const dateB = parseEventDate(b.event.date);
            if (dateA && dateB) {
              const dateComparison = dateA.getTime() - dateB.getTime();
              if (dateComparison !== 0) return dateComparison;
            }
          }

          // Then by genre if selected
          if (hasGenre) {
            return (a.event.genre || '').localeCompare(b.event.genre || '');
          }

          return 0;
        });

        return eventsWithDistance.map(({ event }) => event);
      } else {
        // Fallback to alphabetical location sort if geocoding failed
        filtered.sort((a, b) => {
          let comparison = (a.location || '').localeCompare(b.location || '');
          if (comparison !== 0) return comparison;

          if (hasDate) {
            const dateA = parseEventDate(a.date);
            const dateB = parseEventDate(b.date);
            if (dateA && dateB) {
              comparison = dateA.getTime() - dateB.getTime();
              if (comparison !== 0) return comparison;
            }
          }

          if (hasGenre) {
            return (a.genre || '').localeCompare(b.genre || '');
          }

          return 0;
        });
        return filtered;
      }
    } else {
      // No location sort or no user location - sort by other criteria
      filtered.sort((a, b) => {
        if (hasDate) {
          const dateA = parseEventDate(a.date);
          const dateB = parseEventDate(b.date);
          if (dateA && dateB) {
            const comparison = dateA.getTime() - dateB.getTime();
            if (comparison !== 0) return comparison;
          }
        }

        if (hasGenre) {
          const comparison = (a.genre || '').localeCompare(b.genre || '');
          if (comparison !== 0) return comparison;
        }

        if (hasLocation) {
          return (a.location || '').localeCompare(b.location || '');
        }

        return 0;
      });
      return filtered;
    }
  } else {
    // Default: Sort by distance from user's default location if available
    return await applyDefaultSorting(filtered, profile);
  }
};

// Apply default sorting (by distance from user's location or by date)
const applyDefaultSorting = async (filtered: any[], profile: any): Promise<any[]> => {
  if (profile?.location) {
    let userCoords = userDefaultLocationCache?.coords;

    if (!userDefaultLocationCache || userDefaultLocationCache.location !== profile.location) {
      userCoords = await geocodeLocation(profile.location);
      userDefaultLocationCache = { location: profile.location, coords: userCoords };
    }

    if (userCoords) {
      const eventsWithDistance = await Promise.all(
        filtered.map(async (event) => {
          const eventCoords = await geocodeLocation(event.location || '');
          if (!eventCoords) {
            return { event, distance: Infinity };
          }
          const distance = calculateDistanceKm(
            userCoords!.lat, userCoords!.lng,
            eventCoords.lat, eventCoords.lng
          );
          return { event, distance };
        })
      );

      // Sort by distance first, then by date
      eventsWithDistance.sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        const dateA = parseEventDate(a.event.date);
        const dateB = parseEventDate(b.event.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });

      return eventsWithDistance.map(({ event }) => event);
    } else {
      // Fallback to date sort if geocoding failed
      filtered.sort((a, b) => {
        const dateA = parseEventDate(a.date);
        const dateB = parseEventDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
      return filtered;
    }
  } else {
    // No user location - default sort by date
    filtered.sort((a, b) => {
      const dateA = parseEventDate(a.date);
      const dateB = parseEventDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
    return filtered;
  }
};
