import { prisma } from '../prisma.js';

const DEFAULT_FLAGS: Record<string, boolean> = {
  neighborhood_delivery: true,
  professional_delivery: true,
  delivery_type_switching: true,
};

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (flag) return flag.enabled;
  return DEFAULT_FLAGS[key] ?? false;
}
