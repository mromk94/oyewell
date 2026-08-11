import { prisma } from '../prisma.js';

export interface PermissionCheck {
  userId: string;
  key: string;
}

export async function hasPermission({ userId, key }: PermissionCheck): Promise<boolean> {
  const employee = await prisma.managementEmployee.findUnique({
    where: { userId },
    include: {
      tier: {
        include: {
          permissions: {
            include: { permission: { select: { key: true } } },
          },
        },
      },
    },
  });
  if (!employee || employee.status !== 'ACTIVE') return false;
  return employee.tier.permissions.some((p) => p.permission.key === key);
}

export async function requirePermission({ userId, key }: PermissionCheck): Promise<void> {
  const ok = await hasPermission({ userId, key });
  if (!ok) throw new Error('Permission denied');
}

export async function getEmployeePermissions(userId: string) {
  const employee = await prisma.managementEmployee.findUnique({
    where: { userId },
    include: {
      tier: {
        include: {
          permissions: {
            include: { permission: { select: { key: true, scope: true, description: true } } },
          },
        },
      },
    },
  });
  if (!employee || employee.status !== 'ACTIVE') return [];
  return employee.tier.permissions.map((p) => p.permission);
}

export async function getEmployeeLimits(userId: string): Promise<Record<string, number> | null> {
  const employee = await prisma.managementEmployee.findUnique({
    where: { userId },
    select: { status: true, limits: true },
  });
  if (!employee || employee.status !== 'ACTIVE') return null;
  if (typeof employee.limits !== 'object' || employee.limits === null) return {};
  return employee.limits as Record<string, number>;
}

export async function isWithinLimit(userId: string, key: string, amount: number): Promise<boolean> {
  const limits = await getEmployeeLimits(userId);
  if (!limits) return false;
  if (limits[key] === undefined) return true;
  return amount <= (limits[key] ?? 0);
}
