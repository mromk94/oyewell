import { ApiError } from './errors.js';
import { prisma } from '../prisma.js';

export type RegionRelation = 'cook' | 'rider' | 'order';

export function regionWhere(employee: any, relation: RegionRelation = 'rider') {
  const region = employee?.region;
  if (!region) return {};
  const path = { path: { startsWith: region.path } };
  if (relation === 'cook') return { cook: { region: path } };
  if (relation === 'order') return { order: { cook: { region: path } } };
  return { region: path };
}

export function assertCanModerate(employee: any, targetPath?: string | null) {
  const region = employee?.region;
  if (!region) return; // main admin / no region can moderate everything
  if (!targetPath || !targetPath.startsWith(region.path)) {
    throw new ApiError(403, 'Target is outside your region');
  }
}

export async function resolveRegionByName(name: string | undefined) {
  if (!name || name.trim() === '') return null;
  const normalized = name.trim();
  const region = await prisma.region.findFirst({
    where: {
      isCovered: true,
      OR: [
        { name: { equals: normalized, mode: 'insensitive' } },
        { code: { equals: normalized, mode: 'insensitive' } },
      ],
    },
  });
  if (region) return region;
  const parts = normalized.split(/[,.\-/]+/).map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const matched = await prisma.region.findFirst({
      where: {
        isCovered: true,
        OR: [
          { name: { equals: part, mode: 'insensitive' } },
          { code: { equals: part, mode: 'insensitive' } },
        ],
      },
    });
    if (matched) return matched;
  }
  return null;
}

export function assertCanServe(actor: { region?: { id: string; path: string } | null }, target: { region?: { id: string; path: string } | null }) {
  if (!actor.region) return;
  if (!target.region) return;
  if (!target.region.path.startsWith(actor.region.path)) throw new ApiError(403, 'You cannot serve outside your region');
}

export function assertHigherRegion(actor: { region?: { id: string; path: string } | null }, target: { region?: { id: string; path: string } | null }) {
  if (!actor.region) return; // admin (or unscoped main admin) has full authority
  if (!target.region) throw new ApiError(403, 'Target is not assigned to a region');
  if (target.region.id === actor.region.id) throw new ApiError(403, 'You cannot act on a peer in the same region');
  if (!target.region.path.startsWith(actor.region.path)) throw new ApiError(403, 'Target is outside your region');
}
