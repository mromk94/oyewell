import { prisma } from '../prisma.js';
import { DeliveryZone, DeliveryZoneType } from '@prisma/client';
import { getMapProvider, type GeoPoint } from './maps.js';

export interface Coords {
  lat: number;
  lng: number;
}

interface Match {
  zone: DeliveryZone;
  priority: number;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: Coords, b: Coords) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function pointInPolygon(point: Coords, polygon: Coords[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersect =
      a.lng > point.lng !== b.lng > point.lng &&
      point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (intersect) inside = !inside;
  }
  return inside;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesToken(text: string, token: string) {
  return normalize(text).includes(normalize(token));
}

export async function geocodeAddress(address: string): Promise<Coords | null> {
  try {
    const provider = getMapProvider();
    const result = await provider.geocode(address);
    if (!result) return null;
    return { lat: result.lat, lng: result.lng };
  } catch {
    return null;
  }
}

function zonePriority(type: DeliveryZoneType): number {
  switch (type) {
    case DeliveryZoneType.AREA:
      return 100;
    case DeliveryZoneType.POLYGON:
      return 90;
    case DeliveryZoneType.RADIUS:
      return 80;
    case DeliveryZoneType.CITY:
      return 70;
    default:
      return 0;
  }
}

export async function findDeliveryZone(address: string, coords?: Coords | null) {
  const zones = await prisma.deliveryZone.findMany({ where: { isActive: true } });
  const matches: Match[] = [];

  for (const zone of zones) {
    const boundary = zone.boundary as Record<string, unknown>;
    let matched = false;

    switch (zone.type) {
      case DeliveryZoneType.CITY: {
        const cities = (boundary.cities as string[]) ?? [];
        if (cities.some((c) => includesToken(address, c))) matched = true;
        break;
      }
      case DeliveryZoneType.AREA: {
        const areas = (boundary.areas as string[]) ?? [];
        if (areas.some((a) => includesToken(address, a))) matched = true;
        break;
      }
      case DeliveryZoneType.RADIUS: {
        if (coords && boundary.lat && boundary.lng && boundary.radiusMeters) {
          const center = {
            lat: Number(boundary.lat),
            lng: Number(boundary.lng),
          };
          const dist = haversineMeters(center, coords);
          if (dist <= Number(boundary.radiusMeters)) matched = true;
        }
        break;
      }
      case DeliveryZoneType.POLYGON: {
        if (coords && Array.isArray(boundary.coordinates)) {
          const polygon = (boundary.coordinates as number[][]).map(([lat, lng]) => ({ lat, lng }));
          if (pointInPolygon(coords, polygon)) matched = true;
        }
        break;
      }
    }

    if (matched) {
      matches.push({ zone, priority: zonePriority(zone.type) });
    }
  }

  if (!matches.length) return null;
  matches.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.zone.feeKobo - b.zone.feeKobo;
  });
  return matches[0].zone;
}

export async function resolveDelivery(address: string, subtotalKobo: number) {
  const coords = await geocodeAddress(address);
  const zone = await findDeliveryZone(address, coords);
  if (!zone) return null;
  if (zone.minOrderKobo && subtotalKobo < zone.minOrderKobo) {
    return { zone, feeKobo: 0, available: false, reason: 'Minimum order not met' };
  }
  return {
    zone,
    feeKobo: zone.feeKobo,
    available: true,
    estimatedMinutes: zone.estimatedMinutes,
  };
}
