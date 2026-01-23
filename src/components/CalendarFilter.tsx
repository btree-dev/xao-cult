import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './CalendarFilter.module.css';
import { Genres } from '../backend/public-information-services/publicinfodata';

export interface LocationFilterData {
  name: string;
  coordinates: { lat: number; lng: number } | null;
}

interface CalendarFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  onApplyLocationFilter: (location: LocationFilterData) => void;
  currentLocationFilter?: LocationFilterData;
}

export interface FilterOptions {
  startDate: string;
  endDate: string;
  sortBy: ('date' | 'genre' | 'location' | 'distance')[];
  selectedGenres: string[];
}

interface LocationSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>
});

const CalendarFilter: React.FC<CalendarFilterProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  onApplyLocationFilter,
  currentLocationFilter
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<('date' | 'genre' | 'location' | 'distance')[]>(['date']);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);

  // Location filter states
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    currentLocationFilter?.coordinates || null
  );
  const [locationName, setLocationName] = useState<string>(currentLocationFilter?.name || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [flyToPosition, setFlyToPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Fetch location suggestions from OpenStreetMap Nominatim API
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce the API call
    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle selecting a suggestion
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    setSearchQuery(suggestion.display_name);
    setLocationName(suggestion.display_name);
    setMarkerPosition({ lat, lng });
    setFlyToPosition({ lat, lng });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setMarkerPosition({ lat, lng });

    // Reverse geocoding using OpenStreetMap Nominatim API
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      const data = await response.json();

      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county || '';
        const country = data.address.country || '';
        const name = city ? `${city}, ${country}` : data.display_name;
        setLocationName(name);
        setSearchQuery(name);
      } else {
        const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setLocationName(name);
        setSearchQuery(name);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
      const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationName(name);
      setSearchQuery(name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleApply = () => {
    // Apply date filters
    onApplyFilters({
      startDate,
      endDate,
      sortBy,
      selectedGenres
    });

    // Apply location filter
    onApplyLocationFilter({
      name: locationName,
      coordinates: markerPosition
    });

    onClose();
  };

  const handleReset = () => {
    // Reset date filters
    setStartDate('');
    setEndDate('');
    setSortBy(['date']);
    setSelectedGenres([]);
    setGenreDropdownOpen(false);

    // Reset location filter
    setMarkerPosition(null);
    setLocationName('');
    setSearchQuery('');
    setFlyToPosition(null);
    setSuggestions([]);
    setShowSuggestions(false);

    onApplyFilters({
      startDate: '',
      endDate: '',
      sortBy: ['date'],
      selectedGenres: []
    });

    onApplyLocationFilter({ name: '', coordinates: null });

    onClose();
  };

  const toggleSortBy = (option: 'date' | 'genre' | 'location' | 'distance') => {
    setSortBy(prev => {
      if (prev.includes(option)) {
        // If it's the only option selected, keep it selected
        if (prev.length === 1) return prev;
        return prev.filter(item => item !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const clearLocation = () => {
    setMarkerPosition(null);
    setLocationName('');
    setSearchQuery('');
    setFlyToPosition(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalInner}>
          <div className={styles.header}>
            <h2 className={styles.title}>Filter Events</h2>
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className={styles.content}>
            {/* Date Range Section */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Search by Date Range</label>
              <div className={styles.dateInputWrapper}>
                <label className={styles.dateLabel}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.dateInputWrapper}>
                <label className={styles.dateLabel}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>

            {/* Location Section */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Search by Location</label>

              {/* Search Input with Autocomplete */}
              <div className={styles.searchContainer} ref={suggestionRef}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  />
                  {isSearching && (
                    <div className={styles.searchSpinnerWrapper}>
                      <span className={styles.searchSpinner}></span>
                    </div>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className={styles.suggestionsDropdown}>
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.place_id}
                        className={styles.suggestionItem}
                        onClick={() => handleSelectSuggestion(suggestion)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.suggestionIcon}>
                          <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.3639 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span className={styles.suggestionText}>{suggestion.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className={styles.mapHintLabel}>Or click on the map to select a location</label>

              <div className={styles.mapContainer}>
                <MapComponent
                  markerPosition={markerPosition}
                  onMapClick={handleMapClick}
                  flyToPosition={flyToPosition}
                />
              </div>

              {locationName && (
                <div className={styles.locationDisplay}>
                  <div className={styles.locationHeader}>
                    <span className={styles.locationLabel}>Selected Location:</span>
                    <button className={styles.clearLocationButton} onClick={clearLocation}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <span className={styles.locationValue}>{locationName}</span>
                  <span className={styles.locationHint}>Events within 10km radius will be shown</span>
                </div>
              )}
            </div>

            {/* Sort By Section */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Sort By</label>
              <div className={styles.sortOptions}>
                <button
                  className={`${styles.sortButton} ${sortBy.includes('date') ? styles.active : ''}`}
                  onClick={() => toggleSortBy('date')}
                >
                  Date
                </button>
                <div className={styles.genreButtonWrapper}>
                  <button
                    className={`${styles.sortButton} ${sortBy.includes('genre') || selectedGenres.length > 0 ? styles.active : ''}`}
                    onClick={() => {
                      toggleSortBy('genre');
                      setGenreDropdownOpen(!genreDropdownOpen);
                    }}
                    type="button"
                  >
                    Genre
                  </button>
                  {genreDropdownOpen && (
                    <div className={styles.genreDropdownMenu}>
                      {Genres.map((genre) => (
                        <label key={genre} className={styles.genreCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={selectedGenres.includes(genre)}
                            onChange={() => toggleGenre(genre)}
                            className={styles.genreCheckbox}
                          />
                          <span className={styles.genreCheckboxText}>{genre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className={`${styles.sortButton} ${sortBy.includes('location') ? styles.active : ''}`}
                  onClick={() => toggleSortBy('location')}
                >
                  Location
                </button>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button className={styles.resetButton} onClick={handleReset}>
              Reset
            </button>
            <button className={styles.applyButton} onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilter;
