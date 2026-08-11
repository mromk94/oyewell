import { prisma } from '../prisma.js';
import { geocode } from './location.js';

/**
 * A lightweight neighborhood service.
 * A neighborhood is an arbitrary human-readable string (e.g. "Yaba", "Ikeja GRA")
 * that groups cooks and riders for discovery and dispatch.
 */

export function geoBucket(lat: number, lng: number, precision = 1) {
  const factor = 10 ** precision;
  return `${Math.round(lat * factor) / factor},${Math.round(lng * factor) / factor}`;
}

export function normalizeNeighborhood(raw?: string | null) {
  if (!raw) return null;
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function neighborhoodFromInput(input: { neighborhood?: string | null; operatingArea?: string | null; address?: string | null }) {
  return normalizeNeighborhood(input.neighborhood ?? input.operatingArea ?? undefined) ?? null;
}

export async function resolveNeighborhood(input: { address?: string; lat?: number; lng?: number }): Promise<string | null> {
  if (input.address) {
    const result = await geocode(input.address);
    if (result) return geoBucket(result.lat, result.lng, 1);
  }
  if (input.lat != null && input.lng != null) {
    return geoBucket(input.lat, input.lng, 1);
  }
  return null;
}

export async function assignCookNeighborhood(cookId: string, neighborhood: string | null) {
  return prisma.cookProfile.update({
    where: { id: cookId },
    data: { neighborhood: normalizeNeighborhood(neighborhood) ?? null },
  });
}

export async function assignRiderNeighborhood(riderId: string, neighborhood: string | null) {
  return prisma.rider.update({
    where: { id: riderId },
    data: { neighborhood: normalizeNeighborhood(neighborhood) ?? null },
  });
}

export async function assignUserAddressNeighborhood(addressId: string, neighborhood: string | null) {
  return prisma.userAddress.update({
    where: { id: addressId },
    data: { neighborhood: normalizeNeighborhood(neighborhood) ?? null },
  });
}

export async function listNeighborhoods() {
  const cooks = await prisma.cookProfile.groupBy({
    by: ['neighborhood'],
    where: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true, neighborhood: { not: null } },
    _count: { id: true },
  });
  const riders = await prisma.rider.groupBy({
    by: ['neighborhood'],
    where: { isApproved: true, isActive: true, available: true, neighborhood: { not: null } },
    _count: { id: true },
  });

  const merged: Record<string, { name: string; cooks: number; riders: number }> = {};
  for (const c of cooks) {
    const n = c.neighborhood!;
    if (!merged[n]) merged[n] = { name: n, cooks: 0, riders: 0 };
    merged[n].cooks = c._count.id;
  }
  for (const r of riders) {
    const n = r.neighborhood!;
    if (!merged[n]) merged[n] = { name: n, cooks: 0, riders: 0 };
    merged[n].riders = r._count.id;
  }

  return Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));
}

export async function findCooksInNeighborhood(neighborhood: string) {
  return prisma.cookProfile.findMany({
    where: { neighborhood: normalizeNeighborhood(neighborhood), profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true },
    include: { listings: { where: { status: 'APPROVED', isActive: true, stock: { gt: 0 } } } },
    orderBy: { rating: 'desc' },
  });
}

export async function findRidersInNeighborhood(neighborhood: string) {
  return prisma.rider.findMany({
    where: { neighborhood: normalizeNeighborhood(neighborhood), isApproved: true, isActive: true, available: true },
    include: { user: { select: { firstName: true, lastName: true, phone: true } } },
    orderBy: { operationalStatus: 'asc' },
  });
}
