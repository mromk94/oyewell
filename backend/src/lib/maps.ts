import { ApiError } from './errors.js';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapGeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface MapProvider {
  name: string;
  geocode(address: string): Promise<GeoPoint | null>;
  isPointInZone(point: GeoPoint, boundary: unknown): boolean;
}

function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

class MockMapProvider implements MapProvider {
  name = 'MOCK';

  async geocode(address: string) {
    // Local fallback: return a deterministic coordinate based on the address hash
    const hash = Array.from(address).reduce((h, c) => h + c.charCodeAt(0), 0);
    return {
      lat: 6.5 + (hash % 1000) / 10000,
      lng: 3.3 + (hash % 1000) / 10000,
      formattedAddress: address,
    };
  }

  isPointInZone(point: GeoPoint, boundary: unknown): boolean {
    if (Array.isArray(boundary)) {
      const coords = boundary as GeoPoint[];
      if (coords.length >= 3) return pointInPolygon(point, coords);
      if (coords.length === 1) {
        // radius zone: { center, radiusKm }
        const zone = (boundary as any)[0];
        if (zone.radiusKm && zone.center) {
          return distanceKm(point, zone.center) <= zone.radiusKm;
        }
      }
    }
    return true;
  }
}

class GoogleMapsProvider implements MapProvider {
  name = 'GOOGLE';
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  async geocode(address: string) {
    if (!this.apiKey) throw new ApiError(500, 'GOOGLE_MAPS_API_KEY not configured');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as { results: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[] };
    if (!data.results.length) return null;
    return {
      lat: data.results[0].geometry.location.lat,
      lng: data.results[0].geometry.location.lng,
      formattedAddress: data.results[0].formatted_address,
    };
  }

  isPointInZone(point: GeoPoint, boundary: unknown): boolean {
    return new MockMapProvider().isPointInZone(point, boundary);
  }
}

class MapboxProvider implements MapProvider {
  name = 'MAPBOX';
  private accessToken?: string;

  constructor() {
    this.accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  }

  async geocode(address: string) {
    if (!this.accessToken) throw new ApiError(500, 'MAPBOX_ACCESS_TOKEN not configured');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.accessToken}`;
    const res = await fetch(url);
    const data = (await res.json()) as { features: { center: [number, number]; place_name: string }[] };
    if (!data.features.length) return null;
    return {
      lat: data.features[0].center[1],
      lng: data.features[0].center[0],
      formattedAddress: data.features[0].place_name,
    };
  }

  isPointInZone(point: GeoPoint, boundary: unknown): boolean {
    return new MockMapProvider().isPointInZone(point, boundary);
  }
}

export function getMapProvider(): MapProvider {
  const provider = process.env.GEO_PROVIDER ?? 'MOCK';
  switch (provider.toUpperCase()) {
    case 'GOOGLE':
      return new GoogleMapsProvider();
    case 'MAPBOX':
      return new MapboxProvider();
    default:
      return new MockMapProvider();
  }
}
