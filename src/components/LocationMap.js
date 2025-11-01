import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationMap.css';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to update map view when address changes
function MapUpdater({ address, city, country }) {
  const map = useMap();
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    const fullAddress = [address, city, country].filter(Boolean).join(', ');
    
    if (!fullAddress) return;

    // Use Nominatim (OpenStreetMap) geocoding API
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`)
      .then(response => response.json())
      .then(data => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const coordinates = [parseFloat(lat), parseFloat(lon)];
          setCoords(coordinates);
          map.setView(coordinates, 13);
        }
      })
      .catch(err => {
        console.error('Geocoding error:', err);
      });
  }, [address, city, country, map]);

  if (!coords) {
    return null;
  }

  return (
    <Marker position={coords}>
      <Popup>
        {[address, city, country].filter(Boolean).join(', ')}
      </Popup>
    </Marker>
  );
}

function LocationMap({ address, city, country }) {
  const mapRef = useRef(null);

  if (!address && !city && !country) {
    return null;
  }

  return (
    <div className="location-map-container">
      <MapContainer
        center={[51.505, -0.09]} // Default center (London)
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater address={address} city={city} country={country} />
      </MapContainer>
    </div>
  );
}

export default LocationMap;

