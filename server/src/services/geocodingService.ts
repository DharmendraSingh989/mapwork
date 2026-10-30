export interface GeocodingResult {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
  importance?: number;
  bounds?: [number, number, number, number]; // [minLat, maxLat, minLng, maxLng]
}

export async function searchGeocoding(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "MapForge-Geospatial-Application/1.0 (academic-demonstration)"
      }
    });

    if (!res.ok) {
      console.warn(`Geocoding HTTP error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data: any[] = await res.json();
    return data.map((item) => ({
      placeId: item.place_id ? item.place_id.toString() : String(Math.random()),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.class || "location",
      importance: item.importance,
      bounds: item.boundingbox ? item.boundingbox.map(Number) : undefined
    }));
  } catch (error) {
    console.warn("Geocoding fetch error:", error);
    return [];
  }
}
