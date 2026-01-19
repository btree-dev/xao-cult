import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with webpack
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapComponentProps {
  markerPosition: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
  flyToPosition?: { lat: number; lng: number } | null;
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle fly to position
function FlyToHandler({ flyToPosition }: { flyToPosition: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (flyToPosition) {
      map.flyTo([flyToPosition.lat, flyToPosition.lng], 12, {
        duration: 1.5
      });
    }
  }, [flyToPosition, map]);

  return null;
}

const MapComponent: React.FC<MapComponentProps> = ({ markerPosition, onMapClick, flyToPosition }) => {
  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.0060];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={3}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      <FlyToHandler flyToPosition={flyToPosition || null} />
      {markerPosition && (
        <Marker position={[markerPosition.lat, markerPosition.lng]} icon={customIcon} />
      )}
    </MapContainer>
  );
};

export default MapComponent;
