export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const estimateETA = (lat1: number, lon1: number, lat2: number, lon2: number, speedKmh: number = 25) => {
  const dist = haversineDistance(lat1, lon1, lat2, lon2);
  return Math.max(1, Math.round((dist / speedKmh) * 60));
};

export const getCapacityStatus = (current: number, total: number) => {
  const percent = (current / total) * 100;
  if (percent >= 90) return { label: 'Full', color: 'red', percent };
  if (percent >= 75) return { label: 'Nearly Full', color: 'orange', percent };
  if (percent >= 50) return { label: 'Filling', color: 'yellow', percent };
  return { label: 'Available', color: 'green', percent };
};

export const formatDistance = (km: number) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};
