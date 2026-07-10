import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, DEFAULT_MAP_OPTIONS, DEFAULT_TILE_OPTIONS } from '../lib/mapConfig.js';

const stationIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#009A44;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function StationMiniMap({ station }) {
  const center = [station.latitude, station.longitude];

  return (
    <div className="h-32 rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        {...DEFAULT_MAP_OPTIONS}
      >
        <TileLayer url={TILE_URL} {...DEFAULT_TILE_OPTIONS} />
        <Marker position={center} icon={stationIcon} />
        <Circle
          center={center}
          radius={station.radiusMeters}
          pathOptions={{
            color: '#009A44',
            fillColor: '#009A44',
            fillOpacity: 0.1,
            weight: 1.5,
          }}
        />
      </MapContainer>
    </div>
  );
}
