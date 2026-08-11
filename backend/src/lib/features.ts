import { prisma } from '../prisma.js';

const DEFAULT_FLAGS: Record<string, boolean> = {
  neighborhood_delivery: true,
  professional_delivery: false,
  delivery_type_switching: true,
  future_errands: false,
};

const FEATURE_CACHE_TTL_MS = Number(process.env.FEATURE_CACHE_TTL_MS) || 60_000;
const featureCache = new Map<string, { value: boolean; expiresAt: number }>();

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const cached = featureCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  const value = flag ? flag.enabled : (DEFAULT_FLAGS[key] ?? false);
  featureCache.set(key, { value, expiresAt: Date.now() + FEATURE_CACHE_TTL_MS });
  return value;
}

export function clearFeatureCache() {
  featureCache.clear();
}
