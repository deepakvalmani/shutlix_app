export const searchPlaces = async (query: string, limit: number = 5) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!res.ok) {
        throw new Error(`Nominatim API returned ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      label: item.display_name,
      sublabel: item.type,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (err) {
    console.error("Nominatim search failed:", err);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!res.ok) {
        throw new Error(`Nominatim API returned ${res.status}`);
    }

    const data = await res.json();
    return {
      label: data.display_name,
      address: data.address,
    };
  } catch (err) {
    console.error("Nominatim reverse geocode failed:", err);
    return { label: "Unknown location", address: {} };
  }
};

export const geocodeQuery = async (query: string) => {
    const results = await searchPlaces(query, 1);
    return results[0] || null;
};
