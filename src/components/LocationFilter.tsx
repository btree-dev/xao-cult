import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './CalendarFilter.module.css';

export interface LocationFilterData {
  name: string;
  coordinates: { lat: number; lng: number } | null;
}

interface LocationFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (location: LocationFilterData) => void;
}

// Dynamically import the map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>
});

const LocationFilter: React.FC<LocationFilterProps> = ({ isOpen, onClose, onApplyFilter }) => {
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [flyToPosition, setFlyToPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

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
        setLocationName(city ? `${city}, ${country}` : data.display_name);
      } else {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error getting location name:', error);
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        // Set marker and fly to position
        setMarkerPosition({ lat, lng });
        setFlyToPosition({ lat, lng });
        setLocationName(result.display_name);
      } else {
        alert('Location not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error searching location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleApply = () => {
    onApplyFilter({
      name: locationName,
      coordinates: markerPosition
    });
    onClose();
  };

  const handleReset = () => {
    setMarkerPosition(null);
    setLocationName('');
    setSearchQuery('');
    setFlyToPosition(null);
    onApplyFilter({ name: '', coordinates: null });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filter by Location</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            {/* Search Input */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className={styles.searchButton}
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <span className={styles.searchSpinner}></span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>

            <label className={styles.sectionLabel}>Or click on the map to select a location</label>

            <div className={styles.mapContainer}>
              <MapComponent
                markerPosition={markerPosition}
                onMapClick={handleMapClick}
                flyToPosition={flyToPosition}
              />
            </div>

            {locationName && (
              <div className={styles.locationDisplay}>
                <span className={styles.locationLabel}>Selected Location:</span>
                <span className={styles.locationValue}>{locationName}</span>
                <span className={styles.locationHint}>Events within 100km radius will be shown</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={handleReset}>
            Reset
          </button>
          <button
            className={styles.applyButton}
            onClick={handleApply}
            disabled={!markerPosition}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationFilter;
