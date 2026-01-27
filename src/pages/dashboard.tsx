import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import Scrollbar from '../components/Scrollbar';
import ShareModal from '../components/ShareModal';
import CalendarFilter, { FilterOptions, LocationFilterData } from '../components/CalendarFilter';
import { EventDocs } from '../backend/eventsdata';
//import { loadEvents, EventDoc } from '../backend/services/Event';

// Cache for geocoded event locations
const eventLocationCache: Map<string, { lat: number; lng: number } | null> = new Map();

// Cache for user's default location coordinates
let userDefaultLocationCache: { location: string; coords: { lat: number; lng: number } | null } | null = null;

// Helper functions to get/set filters from sessionStorage
const getStoredLocationFilter = (): LocationFilterData => {
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

const getStoredDateFilters = (): FilterOptions | null => {
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

const Dashboard: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>(EventDocs);
  const [filteredEvents, setFilteredEvents] = useState<any[]>(EventDocs);
  const [mutedEvents, setMutedEvents] = useState<Set<string>>(new Set());
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [calendarFilterOpen, setCalendarFilterOpen] = useState(false);
  const [filterLocation, setFilterLocation] = useState<LocationFilterData>({ name: '', coordinates: null });
  const [dateFilters, setDateFilters] = useState<FilterOptions | null>(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Load filters from sessionStorage on mount
  useEffect(() => {
    const storedLocation = getStoredLocationFilter();
    const storedDateFilters = getStoredDateFilters();

    if (storedLocation.coordinates || storedLocation.name) {
      setFilterLocation(storedLocation);
    }
    if (storedDateFilters) {
      setDateFilters(storedDateFilters);
    }
    setFiltersLoaded(true);
  }, []);

  // Save filters to sessionStorage when they change
  useEffect(() => {
    if (filtersLoaded) {
      sessionStorage.setItem('locationFilter', JSON.stringify(filterLocation));
    }
  }, [filterLocation, filtersLoaded]);

  useEffect(() => {
    if (filtersLoaded) {
      sessionStorage.setItem('dateFilters', JSON.stringify(dateFilters));
    }
  }, [dateFilters, filtersLoaded]);

  const router = useRouter();

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };


  const toggleMute = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Toggle like for an event
  const toggleLike = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };


  const handleShare = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSelectedEvent(null);
  };
  // Haversine formula to calculate distance between two coordinates in kilometers
  const calculateDistanceKm = (
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
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
  const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
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
  const parseEventDate = (dateString: string): Date | null => {
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

  // Handle calendar filter - save filters and trigger combined filtering
  const handleApplyFilters = (filters: FilterOptions) => {
    setDateFilters(filters);
    // If reset (empty filters), clear from sessionStorage
    if (!filters.startDate && !filters.endDate && filters.selectedGenres.length === 0) {
      sessionStorage.removeItem('dateFilters');
    }
  };

  // Handle location filter
  const handleApplyLocationFilter = (location: LocationFilterData) => {
    setFilterLocation(location);
    // If reset (empty location), clear from sessionStorage
    if (!location.name && !location.coordinates) {
      sessionStorage.removeItem('locationFilter');
    }
  };

  // Combined filter effect - applies both date and location filters together
  useEffect(() => {
    const applyAllFilters = async () => {
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
        // Step 5: Apply sorting if no location filter (location filter already sorts by distance)
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

              filtered = eventsWithDistance.map(({ event }) => event);
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
          }
        } else {
          // Default: Sort by distance from user's default location if available
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

              filtered = eventsWithDistance.map(({ event }) => event);
            } else {
              // Fallback to date sort if geocoding failed
              filtered.sort((a, b) => {
                const dateA = parseEventDate(a.date);
                const dateB = parseEventDate(b.date);
                if (!dateA || !dateB) return 0;
                return dateA.getTime() - dateB.getTime();
              });
            }
          } else {
            // No user location - default sort by date
            filtered.sort((a, b) => {
              const dateA = parseEventDate(a.date);
              const dateB = parseEventDate(b.date);
              if (!dateA || !dateB) return 0;
              return dateA.getTime() - dateB.getTime();
            });
          }
        }
      }

      setFilteredEvents(filtered);
    };

    applyAllFilters();
  }, [filterLocation, dateFilters, events, profile]);

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/');
          return;
        }
        
        setUser(user);
        
        let profileData = null;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!error) {
            profileData = data;
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
        
        if (!profileData) {
          router.push('/create-profile');
          return;
        } else {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error in dashboard:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [router]);


  const handleEventClick = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboardContainer}>
      <div className={styles.background} />
      <Head>
        <title>Dashboard - XAO Cult</title>
        <meta content="Dashboard - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar
        userProfile={{
          username: profile?.username,
          avatar: profile?.profile_picture_url || '/profileIcon.svg'
        }}
        showNotificationIcon={true}
        showSearchIcon={false}
        onCalendarClick={() => setCalendarFilterOpen(true)}
        selectedStartDate={dateFilters?.startDate}
      />
      <Scrollbar />

      <CalendarFilter
        isOpen={calendarFilterOpen}
        onClose={() => setCalendarFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
        onApplyLocationFilter={handleApplyLocationFilter}
        currentLocationFilter={filterLocation}
      />

        <div className={styles.walletCardContainer}>
        <div 
          className={styles.walletCard} 
          style={{ 
            background: 'linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)'
          }}
        >
          <div className={styles.walletCardHeader}>
            <span className={styles.walletUsername}>@{profile?.username || 'yevhenii_d'}</span>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <img src="/usdc-logo.svg" alt="USDC" />
              </div>
              <span className={styles.walletCurrencyName}>USDC</span>
            </div>
            <div className={styles.walletCurrencyRight}>
              <span className={styles.walletCurrencyValue}>13,246.22</span>
              <span className={styles.walletCurrencyUsd}>(13,246.22 usd)</span>
            </div>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <img src="/xao-logo.svg" alt="XAO" />
              </div>
              <span className={styles.walletCurrencyName}>XAO</span>
            </div>
            <div className={styles.walletCurrencyRight}>
              <span className={styles.walletCurrencyValue}>1,280.99</span>
              <span className={styles.walletCurrencyUsd}>(500,000 usd)</span>
            </div>
          </div>
        </div>
      </div>

        <div className={styles.feedContainer}>
          {filteredEvents.map((event, index) => (
              <div 
                key={event.id || index} 
                className={styles.feedItem}
                onClick={() => handleEventClick(event.id)}
              >
                <div className={styles.feedHeader}>
                  <div className={styles.feedAuthor}>
                    <div className={styles.authorAvatar}>
                      <img
                        src={event.profilePic}
                        alt={event.artist}
                      />
                    </div>
                    <div className={styles.authorName}>@{event.artist}</div>
                    <div className={styles.headerTag}>{event.tag}</div>
                  </div>
                </div>
                <div className={styles.feedContent}>
                  <img
                    src={event.image}
                    alt={`${event.artist} Content`}
                    className={styles.feedImage}
                  />
                  <div className={styles.feedContentOverlayTop}>
                    <h2 className={styles.feedEventTitle}>{event.title}</h2>
                    <div className={styles.feedEventLocation}>
                      <img src="/Map_Pin.svg" alt="Location" className={styles.locationIcon} />
                      <span>{event.location}</span>
                    </div>
                    <div className={styles.feedEventDate}>
                      <img src="/Calendar_Days.svg" alt="Date" className={styles.dateIcon} />
                      <span>{event.date}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.feedActionsBottom}>
                  <div className={styles.actionButton} onClick={(e) => handleShare(event, e)}>
                    <img src="/Paper_Plane.svg" alt="Share" className={styles.contractIconSvg} />
                    <span className={styles.actionCounter}>{formatCount(event.Shares)}</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => toggleLike(event.id, e)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 7.69431C10 2.99988 3 3.49988 3 9.49991C3 15.4999 12 20.5001 12 20.5001C12 20.5001 21 15.4999 21 9.49991C21 3.49988 14 2.99988 12 7.69431Z"
                        fill={likedEvents.has(event.id) ? "#DC143C" : "none"}
                        stroke={likedEvents.has(event.id) ? "#DC143C" : "white"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className={styles.actionCounter}>{formatCount(event.likes + (likedEvents.has(event.id) ? 1 : 0))}</span>
                  </div>
                  <div className={styles.actionButton} onClick={(e) => toggleMute(event.id, e)}>
                    {mutedEvents.has(event.id) ? (
                      <img src="/Volume_Off_02.png" alt="Muted" className={styles.contractIconSvg} />
                    ) : (
                      <img src="/Volume.svg" alt="Volume" className={styles.contractIconSvg} />
                    )}
                  </div>
                </div>
              </div>
              ))}
        </div>

        <ShareModal
          isOpen={shareModalOpen}
          onClose={closeShareModal}
          eventTitle={selectedEvent?.title || ''}
          eventUrl={`/event/${selectedEvent?.id || ''}`}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;