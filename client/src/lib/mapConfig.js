// Shared Leaflet map configuration
// CartoDB Positron tiles are lighter and more efficient than default OSM tiles

export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Default map options optimized for performance
export const DEFAULT_MAP_OPTIONS = {
  zoomControl: true,
  updateWhenIdle: true,    // Only update tiles when map stops moving
  updateWhenZooming: false, // Don't update tiles during zoom animation
  preferCanvas: true,       // Use Canvas renderer (faster than SVG for many markers)
  maxZoom: 19,
};

// Default tile layer options
export const DEFAULT_TILE_OPTIONS = {
  attribution: TILE_ATTRIBUTION,
  maxZoom: 19,
  subdomains: 'abcd',
};
