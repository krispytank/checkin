import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../lib/utils.js';
import { TILE_URL, TILE_ATTRIBUTION, DEFAULT_MAP_OPTIONS, DEFAULT_TILE_OPTIONS } from '../lib/mapConfig.js';

const DEFAULT_CENTER = [-1.2921, 36.8219];
const DEFAULT_ZOOM = 15;

const checkInIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#009A44;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const checkOutIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#8A704C;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [positions, map]);
  return null;
}

function LocateButton({ center }) {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: 'topright' });
    control.onAdd = function () {
      const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
      btn.title = 'Return to my location';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>';
      btn.style.cssText = 'background:white;width:32px;height:32px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,0.4);';
      btn.onmousedown = L.DomEvent.stopPropagation;
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.disableScrollPropagation(btn);
      btn.addEventListener('click', () => {
        map.flyTo(center, map.getZoom(), { duration: 0.8 });
      });
      return btn;
    };
    control.addTo(map);

    return () => {
      control.remove();
    };
  }, [map, center]);

  return null;
}

export default function AttendanceMap({ checkInLocation, checkOutLocation, showAccuracy, className }) {
  const positions = [];

  if (checkInLocation?.latitude && checkInLocation?.longitude) {
    positions.push([checkInLocation.latitude, checkInLocation.longitude]);
  }
  if (checkOutLocation?.latitude && checkOutLocation?.longitude) {
    positions.push([checkOutLocation.latitude, checkOutLocation.longitude]);
  }

  const primaryPin = positions.length > 0 ? positions[0] : null;
  const center = primaryPin || DEFAULT_CENTER;
  const zoom = positions.length === 1 ? DEFAULT_ZOOM : 14;

  return (
    <div className={cn("rounded-lg overflow-hidden border relative", className)}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        {...DEFAULT_MAP_OPTIONS}
      >
        <TileLayer
          url={TILE_URL}
          {...DEFAULT_TILE_OPTIONS}
        />
        {positions.length > 1 && <FitBounds positions={positions} />}
        {primaryPin && <LocateButton center={primaryPin} />}
        {checkInLocation?.latitude && checkInLocation?.longitude && (
          <>
            {showAccuracy && checkInLocation.accuracy && (
              <Circle
                center={[checkInLocation.latitude, checkInLocation.longitude]}
                radius={checkInLocation.accuracy}
                pathOptions={{
                  color: '#009A44',
                  fillColor: '#009A44',
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
            )}
            <Marker
              position={[checkInLocation.latitude, checkInLocation.longitude]}
              icon={checkInIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-[#009A44]">Check-in</strong>
                  <br />
                  {checkInLocation.address || `${checkInLocation.latitude.toFixed(4)}, ${checkInLocation.longitude.toFixed(4)}`}
                  {showAccuracy && checkInLocation.accuracy && (
                    <><br />Accuracy: {checkInLocation.accuracy.toFixed(1)}m</>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
        {checkOutLocation?.latitude && checkOutLocation?.longitude && (
          <>
            {showAccuracy && checkOutLocation.accuracy && (
              <Circle
                center={[checkOutLocation.latitude, checkOutLocation.longitude]}
                radius={checkOutLocation.accuracy}
                pathOptions={{
                  color: '#8A704C',
                  fillColor: '#8A704C',
                  fillOpacity: 0.1,
                  weight: 1,
                }}
              />
            )}
            <Marker
              position={[checkOutLocation.latitude, checkOutLocation.longitude]}
              icon={checkOutIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-[#8A704C]">Check-out</strong>
                  <br />
                  {checkOutLocation.address || `${checkOutLocation.latitude.toFixed(4)}, ${checkOutLocation.longitude.toFixed(4)}`}
                  {showAccuracy && checkOutLocation.accuracy && (
                    <><br />Accuracy: {checkOutLocation.accuracy.toFixed(1)}m</>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
