/**
 * Haversine formula — straight-line distance between two lat/lng points
 * Returns distance in kilometers
 */
export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Estimate ETA (minutes) from shuttle to stop
 * Uses average shuttle speed of 25 km/h on campus
 */
export const estimateETA = (shuttleLat, shuttleLng, stopLat, stopLng, speedKmh = 25) => {
  const distKm = haversineDistance(shuttleLat, shuttleLng, stopLat, stopLng);
  const minutes = (distKm / speedKmh) * 60;
  return Math.max(1, Math.round(minutes));
};

/**
 * Format ETA for display
 */
export const formatETA = (minutes) => {
  if (minutes <= 0) return 'Arriving now';
  if (minutes === 1) return '1 min away';
  if (minutes < 60) return `${minutes} min away`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m away` : `${h}h away`;
};

/**
 * Format walking distance for display
 */
export const formatDistance = (km) => {
  if (km < 0.1) return `${Math.round(km * 1000)}m away`;
  return `${km.toFixed(1)} km away`;
};

/**
 * Get capacity status based on occupancy percentage
 */
export const getCapacityStatus = (current, total) => {
  if (!total) return { label: 'Unknown', color: 'gray', percent: 0, tailwindClass: 'bg-gray-500', textClass: 'text-gray-400' };
  const percent = (current / total) * 100;

  if (percent >= 100) return {
    label: 'Full',
    color: 'red',
    percent: 100,
    tailwindClass: 'bg-red-500',
    textClass: 'text-red-400',
    badgeClass: 'badge-red',
  };
  if (percent >= 80) return {
    label: 'Nearly full',
    color: 'orange',
    percent,
    tailwindClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    badgeClass: 'badge-orange',
  };
  if (percent >= 50) return {
    label: 'Filling up',
    color: 'yellow',
    percent,
    tailwindClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    badgeClass: 'badge-yellow',
  };
  return {
    label: 'Available',
    color: 'green',
    percent,
    tailwindClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    badgeClass: 'badge-green',
  };
};

/**
 * Interpolate between two positions for smooth marker animation
 */
export const interpolatePosition = (from, to, fraction) => ({
  lat: from.lat + (to.lat - from.lat) * fraction,
  lng: from.lng + (to.lng - from.lng) * fraction,
});

/**
 * Calculate bearing (heading) between two points in degrees
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

/**
 * Creates a custom SVG shuttle marker icon for Google Maps
 */
export const createShuttleMarkerSVG = (heading = 0, color = '#1A56DB', isActive = true) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <g transform="rotate(${heading}, 24, 24)">
        <!-- Shadow -->
        <ellipse cx="24" cy="44" rx="10" ry="3" fill="rgba(0,0,0,0.25)" />
        <!-- Bus body -->
        <rect x="10" y="12" width="28" height="22" rx="5" fill="${color}" />
        <!-- Windshield -->
        <rect x="14" y="8" width="20" height="8" rx="3" fill="rgba(255,255,255,0.85)" />
        <!-- Windows -->
        <rect x="12" y="17" width="7" height="5" rx="2" fill="rgba(255,255,255,0.5)" />
        <rect x="21" y="17" width="7" height="5" rx="2" fill="rgba(255,255,255,0.5)" />
        <rect x="30" y="17" width="6" height="5" rx="2" fill="rgba(255,255,255,0.5)" />
        <!-- Wheels -->
        <circle cx="16" cy="35" r="4" fill="#1a1a2e" stroke="${color}" stroke-width="1.5" />
        <circle cx="32" cy="35" r="4" fill="#1a1a2e" stroke="${color}" stroke-width="1.5" />
        ${isActive ? `<circle cx="24" cy="24" r="3" fill="rgba(255,255,255,0.9)" />` : ''}
      </g>
      ${isActive ? `
        <circle cx="40" cy="8" r="5" fill="#10B981" stroke="#0D2137" stroke-width="1.5" />
      ` : ''}
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};

/**
 * Creates a custom stop marker SVG
 */
export const createStopMarkerSVG = (label = '', color = '#D97706') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <filter id="drop-shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
      </filter>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" filter="url(#drop-shadow)" />
      <circle cx="18" cy="18" r="10" fill="rgba(0,0,0,0.2)" />
      <circle cx="18" cy="18" r="8" fill="white" />
      <text x="18" y="22" text-anchor="middle" font-family="Inter, sans-serif"
        font-size="9" font-weight="700" fill="${color}">${label}</text>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};