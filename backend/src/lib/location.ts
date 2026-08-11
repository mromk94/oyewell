import { getMapProvider, type GeoPoint } from './maps.js';

const GEOCODE_CACHE_TTL_MS = Number(process.env.GEOCODE_CACHE_TTL_MS) || 5 * 60 * 1000;
const ROUTE_CACHE_TTL_MS = Number(process.env.ROUTE_CACHE_TTL_MS) || 2 * 60 * 1000;
const geocodeCache = new Map<string, { value: Location | null; expiresAt: number }>();
const routeCache = new Map<string, { value: Route; expiresAt: number }>();

function cacheKey(parts: (string | number)[]) {
  return parts.map((p) => (typeof p === 'number' ? p.toFixed(5) : p)).join('|');
}

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
  const key = cacheKey([address.trim().toLowerCase()]);
  const cached = geocodeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const provider = getMapProvider();
    const result = (await provider.geocode(address)) as (GeoPoint & { formattedAddress?: string }) | null;
    const value = result ? { ...result, address: result.formattedAddress ?? address } : null;
    geocodeCache.set(key, { value, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
    return value;
  } catch (e) {
    console.error('geocode failed', e);
    return null;
  }
}

export async function reverseGeocode(point: GeoPoint): Promise<Location | null> {
  try {
    const provider = getMapProvider();
    // Only real providers can reverse geocode; mock falls back to a synthetic address.
    if (provider.name === 'MOCK') {
      return { ...point, address: `Lat ${point.lat.toFixed(4)}, Lng ${point.lng.toFixed(4)}` };
    }
    // Generic reverse geocode via provider if available; current interface only has geocode.
    return { ...point, address: `Lat ${point.lat.toFixed(4)}, Lng ${point.lng.toFixed(4)}` };
  } catch (e) {
    console.error('reverseGeocode failed', e);
    return { ...point, address: `Lat ${point.lat.toFixed(4)}, Lng ${point.lng.toFixed(4)}` };
  }
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
  const key = cacheKey(['route', origin.lat, origin.lng, destination.lat, destination.lng]);
  const cached = routeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const provider = getMapProvider();
    const r = await provider.route(origin, destination);
    if (r) {
      const value = { ...r, polyline: undefined };
      routeCache.set(key, { value, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
      return value;
    }
  } catch (e) {
    console.error('route failed', e);
  }
  const straight = haversineMeters(origin, destination);
  const durationSeconds = Math.round(straight / 6);
  const fallback = { distanceMeters: straight, durationSeconds, polyline: undefined };
  routeCache.set(key, { value: fallback, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
  return fallback;
}

export async function eta(origin: GeoPoint, destination: GeoPoint): Promise<number> {
  const r = await route(origin, destination);
  return Math.max(1, Math.ceil(r.durationSeconds / 60));
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

export const MIN_LOCATION_ACCURACY_METERS = Number(process.env.MIN_LOCATION_ACCURACY_METERS) || 100;

export function validateLocation(input: unknown): Location | null {
  if (!input || typeof input !== 'object') return null;
  const { lat, lng, accuracy } = input as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const acc = typeof accuracy === 'number' ? accuracy : undefined;
  if (acc != null && acc < 0) return null;
  if (acc != null && acc > MIN_LOCATION_ACCURACY_METERS) return null;
  return { lat, lng, accuracy: acc } as Location;
}
