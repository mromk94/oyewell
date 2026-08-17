import { prisma } from '../prisma.js';
import { isFeatureEnabled } from './features.js';
import { DeliveryType, DeliveryZone, DeliveryZoneType } from '@prisma/client';
import { getMapProvider } from './maps.js';
import { eta } from './location.js';

export async function getPlatformFeePercent(): Promise<number> {
  const setting = await prisma.restaurantSetting.findFirst();
  const map = (setting?.mapSettings as Record<string, unknown> | undefined) ?? {};
  const percent = Number(map.platformFeePercent);
  return Number.isFinite(percent) && percent >= 0 ? percent : 5;
}

export function calculatePlatformFeeKobo(subtotalKobo: number, percent: number): number {
  return Math.round((subtotalKobo * percent) / 100);
}

async function getZoneCenter(zone: DeliveryZone): Promise<Coords | null> {
  const boundary = zone.boundary as Record<string, unknown>;
  switch (zone.type) {
    case DeliveryZoneType.RADIUS: {
      const lat = Number(boundary.lat ?? 0);
      const lng = Number(boundary.lng ?? 0);
      if (lat && lng) return { lat, lng };
      return null;
    }
    case DeliveryZoneType.POLYGON: {
      const coords = (boundary.coordinates as number[][]) ?? [];
      if (coords.length === 0) return null;
      const lat = coords.reduce((sum, [x]) => sum + x, 0) / coords.length;
      const lng = coords.reduce((sum, [, y]) => sum + y, 0) / coords.length;
      return { lat, lng };
    }
    default:
      return null;
  }
}

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

export function applyMultiSourceSurcharge(feeKobo: number, sourceIds: string[]) {
  const distinct = new Set(sourceIds.filter(Boolean));
  const extra = Math.max(0, distinct.size - 1);
  if (extra === 0) return feeKobo;
  const percent = Number(process.env.MULTI_SOURCE_SURCHARGE_PERCENT) || 50;
  const multiplier = 1 + extra * (percent / 100);
  return Math.round(feeKobo * multiplier);
}

export async function resolveDelivery(address: string, subtotalKobo: number, type: DeliveryType = DeliveryType.NEIGHBORHOOD, sourceIds?: string[], providedCoords?: Coords) {
  const [neighborhoodEnabled, professionalEnabled] = await Promise.all([
    isFeatureEnabled('neighborhood_delivery'),
    isFeatureEnabled('professional_delivery'),
  ]);
  if (type === DeliveryType.PROFESSIONAL && !professionalEnabled) return null;
  if (type === DeliveryType.NEIGHBORHOOD && !neighborhoodEnabled) return null;
  const effectiveCoords = providedCoords ?? await geocodeAddress(address);
  const zone = await findDeliveryZone(address, effectiveCoords);
  if (!zone) return null;

  const rule = await prisma.deliveryPricingRule.findFirst({
    where: { deliveryZoneId: zone.id, deliveryType: type, enabled: true },
  });

  const minOrderKobo = rule?.minOrderKobo ?? zone.minOrderKobo;
  if (minOrderKobo && subtotalKobo < minOrderKobo) {
    return { zone, feeKobo: 0, platformFeeKobo: 0, totalKobo: subtotalKobo, available: false, reason: 'Minimum order not met' };
  }

  let feeKobo = rule?.baseFeeKobo ?? zone.feeKobo;

  if (rule && rule.perMeterKobo > 0 && effectiveCoords) {
    const center = await getZoneCenter(zone);
    if (center) {
      const distance = haversineMeters(center, effectiveCoords);
      feeKobo += Math.round(rule.perMeterKobo * distance);
    }
  }

  let estimatedMinutes =
    rule?.estimatedMinutes ??
    (type === DeliveryType.PROFESSIONAL && zone.estimatedMinutes
      ? Math.max(10, Math.round(zone.estimatedMinutes * 0.8))
      : zone.estimatedMinutes);

  if (!estimatedMinutes && effectiveCoords) {
    const center = await getZoneCenter(zone);
    if (center) {
      estimatedMinutes = await eta(center, effectiveCoords);
    }
  }

  feeKobo = applyMultiSourceSurcharge(feeKobo, sourceIds ?? []);

  const platformFeePercent = await getPlatformFeePercent();
  const platformFeeKobo = calculatePlatformFeeKobo(subtotalKobo, platformFeePercent);
  const totalKobo = subtotalKobo + platformFeeKobo + feeKobo;

  return {
    zone,
    feeKobo,
    riderFeeKobo: feeKobo,
    platformFeeKobo,
    totalKobo,
    available: true,
    estimatedMinutes,
    coords: effectiveCoords ?? undefined,
  };
}
