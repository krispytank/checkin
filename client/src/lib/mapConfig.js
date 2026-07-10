// Shared Leaflet map configuration
// OSM tiles with performance-tuned options

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Default map options optimized for performance
export const DEFAULT_MAP_OPTIONS = {
  zoomControl: true,
  updateWhenIdle: true,
  preferCanvas: true,
  maxZoom: 19,
};

// Default tile layer options
export const DEFAULT_TILE_OPTIONS = {
  attribution: TILE_ATTRIBUTION,
  maxZoom: 19,
};
