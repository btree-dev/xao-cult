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
import CalendarFilter, { FilterOptions } from '../components/CalendarFilter';
import LocationFilter, { LocationFilterData } from '../components/LocationFilter';
import { EventDocs } from '../backend/eventsdata';
//import { loadEvents, EventDoc } from '../backend/services/Event';

// Cache for geocoded event locations
const eventLocationCache: Map<string, { lat: number; lng: number } | null> = new Map();

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
  const [locationFilterOpen, setLocationFilterOpen] = useState(false);
  const [filterLocation, setFilterLocation] = useState<LocationFilterData>({ name: '', coordinates: null });

  const router = useRouter();

  // Format count to display as K or M
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  // Toggle mute for an event
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

  // Handle share button click
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

  // Handle calendar filter
  const handleApplyFilters = (filters: FilterOptions) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = [...events];
    filtered = filtered.filter((event) => {
      const eventDate = parseEventDate(event.date);
      if (!eventDate) return false;

      eventDate.setHours(0, 0, 0, 0);
      if (eventDate < today) return false;

      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);


        if (!filters.endDate) {
          const selectedMonth = startDate.getMonth();
          const selectedYear = startDate.getFullYear();
          const eventMonth = eventDate.getMonth();
          const eventYear = eventDate.getFullYear();

          if (eventMonth !== selectedMonth || eventYear !== selectedYear) {
            return false;
          }
        } else {
          
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);

       
          if (eventDate < startDate || eventDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });


    // Location filtering is handled separately via filterLocation state

    if (filters.selectedGenres && filters.selectedGenres.length > 0) {
      filtered = filtered.filter((event) => {
        return filters.selectedGenres.includes(event.genre);
      });
    }

    let sortPriority: ('location' | 'date' | 'genre')[];

    const hasLocation = filters.sortBy.includes('location');
    const hasGenre = filters.sortBy.includes('genre');
    const hasDate = filters.sortBy.includes('date');

    if (hasLocation && hasDate && !hasGenre) {
      
      sortPriority = ['location', 'date', 'genre'];
    } else {
    
      sortPriority = ['location', 'genre', 'date'];
    }

    filtered.sort((a, b) => {
     
      for (const sortOption of sortPriority) {
        
        if (!filters.sortBy.includes(sortOption)) continue;

        let comparison = 0;

        if (sortOption === 'location') {
          // Sort alphabetically by location name
          comparison = (a.location || '').localeCompare(b.location || '');
        } else if (sortOption === 'date') {
          const dateA = parseEventDate(a.date);
          const dateB = parseEventDate(b.date);
          if (dateA && dateB) {
            comparison = dateA.getTime() - dateB.getTime();
          }
        } else if (sortOption === 'genre') {
       
          comparison = (a.genre || '').localeCompare(b.genre || '');
        }

        if (comparison !== 0) {
          return comparison;
        }
      }

      return 0;
    });

    setFilteredEvents(filtered);
  };

  // Handle location filter
  const handleApplyLocationFilter = (location: LocationFilterData) => {
    setFilterLocation(location);
  };

  // Filter events by location using coordinates (100km radius)
  useEffect(() => {
    const filterByLocation = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filtered = [...events];

      // First filter by date (only future events)
      filtered = filtered.filter((event) => {
        const eventDate = parseEventDate(event.date);
        if (!eventDate) return false;
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      });

      // Then filter by location if coordinates are set
      if (filterLocation.coordinates) {
        const { lat: filterLat, lng: filterLng } = filterLocation.coordinates;
        const RADIUS_KM = 10;

        // Geocode all event locations and filter by distance
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

        // Keep only events within 100km radius
        filtered = filteredWithDistance
          .filter(({ distance }) => distance <= RADIUS_KM)
          .sort((a, b) => a.distance - b.distance) // Sort by distance (nearest first)
          .map(({ event }) => event);
      } else {
        // No location filter, sort by date
        filtered.sort((a, b) => {
          const dateA = parseEventDate(a.date);
          const dateB = parseEventDate(b.date);
          if (!dateA || !dateB) return 0;
          return dateA.getTime() - dateB.getTime();
        });
      }

      setFilteredEvents(filtered);
    };

    filterByLocation();
  }, [filterLocation, events]);


  useEffect(() => {
    const allEvents = [...events];
    allEvents.sort((a, b) => {
      const dateA = parseEventDate(a.date);
      const dateB = parseEventDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
    setFilteredEvents(allEvents);
  }, [events]);

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
        onLocationClick={() => setLocationFilterOpen(true)}
      />
      <Scrollbar />

      <CalendarFilter
        isOpen={calendarFilterOpen}
        onClose={() => setCalendarFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
      />

      <LocationFilter
        isOpen={locationFilterOpen}
        onClose={() => setLocationFilterOpen(false)}
        onApplyFilter={handleApplyLocationFilter}
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