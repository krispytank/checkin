import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, X } from 'lucide-react';
import { TILE_URL, TILE_ATTRIBUTION, DEFAULT_MAP_OPTIONS, DEFAULT_TILE_OPTIONS } from '../lib/mapConfig.js';

const DEFAULT_CENTER = [-1.2921, 36.8219];
const DEFAULT_ZOOM = 13;

const stationIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#009A44;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapEvents({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center }) {
  const map = useMap();
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center[0], center[1], map]);

  return null;
}

function LocationSearch({ onResultSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setQuery(item.display_name.split(',').slice(0, 3).join(','));
    setShowResults(false);
    setResults([]);
    onResultSelect(lat, lng);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search for a location..."
          className="w-full rounded-lg border bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-60 overflow-y-auto">
          {results.map((item, i) => (
            <button
              key={item.place_id || i}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-start gap-2 border-b last:border-b-0"
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocationPickerMap({ latitude, longitude, radius, onLocationChange }) {
  const lat = latitude ? parseFloat(latitude) : null;
  const lng = longitude ? parseFloat(longitude) : null;
  const center = (lat !== null && lng !== null) ? [lat, lng] : DEFAULT_CENTER;

  const handleLocationSelect = (newLat, newLng) => {
    onLocationChange(newLat.toFixed(6), newLng.toFixed(6));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
      },
      () => alert('Unable to get your location')
    );
  };

  return (
    <div className="space-y-3">
      <LocationSearch onResultSelect={(lat, lng) => handleLocationSelect(lat, lng)} />

      <div className="h-64 rounded-lg overflow-hidden border">
        <MapContainer
          key={`${DEFAULT_CENTER[0]}-${DEFAULT_CENTER[1]}`}
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          {...DEFAULT_MAP_OPTIONS}
        >
          <TileLayer
            url={TILE_URL}
            {...DEFAULT_TILE_OPTIONS}
          />
          <MapEvents onLocationSelect={handleLocationSelect} />
          <MapUpdater center={center} />
          {lat !== null && lng !== null && (
            <>
              <Marker position={[lat, lng]} icon={stationIcon} />
              <Circle
                center={[lat, lng]}
                radius={radius || 100}
                pathOptions={{
                  color: '#009A44',
                  fillColor: '#009A44',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Use Current Location
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Click on the map or search to set station location
      </p>
    </div>
  );
}
