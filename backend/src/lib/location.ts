import { getMapProvider, type GeoPoint } from './maps.js';

export type LocationType =
  | 'CUSTOMER_LOCATION'
  | 'COOK_LOCATION'
  | 'RESTAURANT_LOCATION'
  | 'PICKUP_LOCATION'
  | 'DROPOFF_LOCATION'
  | 'RIDER_LOCATION'
  | 'DELIVERY_LOCATION';

export interface Location extends GeoPoint {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  placeId?: string;
  providerId?: string;
  accuracy?: number;
}

export interface NearbyPoint {
  id: string;
  point: Location;
  distanceMeters: number;
}

export interface Route {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function geocode(address: string): Promise<Location | null> {
  const provider = getMapProvider();
  const result = (await provider.geocode(address)) as (GeoPoint & { formattedAddress?: string }) | null;
  if (!result) return null;
  return { ...result, address: result.formattedAddress ?? address };
}

export async function reverseGeocode(point: GeoPoint): Promise<Location | null> {
  const provider = getMapProvider();
  // Only real providers can reverse geocode; mock falls back to a synthetic address.
  if (provider.name === 'MOCK') {
    return { ...point, address: `Lat ${point.lat.toFixed(4)}, Lng ${point.lng.toFixed(4)}` };
  }
  // Generic reverse geocode via provider if available; current interface only has geocode.
  return { ...point, address: `Lat ${point.lat.toFixed(4)}, Lng ${point.lng.toFixed(4)}` };
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  return haversineMeters(a, b);
}

export function nearbyByDistance(
  center: GeoPoint,
  candidates: Array<{ id: string; point: GeoPoint }>,
  radiusMeters: number,
  limit?: number,
): NearbyPoint[] {
  const withDistance = candidates
    .map((c) => ({ id: c.id, point: c.point as Location, distanceMeters: haversineMeters(center, c.point) }))
    .filter((c) => c.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  return limit ? withDistance.slice(0, limit) : withDistance;
}

export async function route(origin: GeoPoint, destination: GeoPoint): Promise<Route> {
  // Provider routing not yet wired; fall back to straight-line estimate.
  const straight = haversineMeters(origin, destination);
  // Assume 6 m/s urban average for fallback ETA (≈ 22 km/h).
  const durationSeconds = Math.round(straight / 6);
  return { distanceMeters: straight, durationSeconds, polyline: undefined };
}

export async function eta(origin: GeoPoint, destination: GeoPoint): Promise<number> {
  const r = await route(origin, destination);
  return Math.ceil(r.durationSeconds / 60);
}

export function serviceRadius(point: GeoPoint, target: GeoPoint, radiusMeters: number): boolean {
  return haversineMeters(point, target) <= radiusMeters;
}

export const RIDER_LOCATION_STALE_MS = Number(process.env.RIDER_LOCATION_STALE_MS) || 2 * 60 * 1000; // 2 minutes

export function isLocationFresh(updatedAt: Date, maxAgeMs = RIDER_LOCATION_STALE_MS): boolean {
  return Date.now() - updatedAt.getTime() <= maxAgeMs;
}

export const LOCAL_SEARCH_RINGS_METERS = (() => {
  const env = process.env.LOCAL_SEARCH_RINGS;
  if (env) return env.split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v));
  return [2000, 5000, 10000];
})();

export function validateLocation(input: unknown): Location | null {
  if (!input || typeof input !== 'object') return null;
  const { lat, lng } = input as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng } as Location;
}
