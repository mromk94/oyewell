import { prisma } from '../prisma.js';
import type { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; roles: string[] };
}

export interface PermissionCheck {
  userId: string;
  key: string;
}

export function requireOwnerOrEmployee(canAccess: (userId: string) => Promise<boolean>) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ok = await canAccess(req.user.id).catch(() => false);
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
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
  return employee.tier.permissions.some((p: { permission: { key: string } }) => p.permission.key === key);
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
  return employee.tier.permissions.map((p: { permission: { key: string; scope: string; description: string | null } }) => p.permission);
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

export async function findModerator(filters: { permission: string; country?: string; city?: string }) {
  const employees = await prisma.managementEmployee.findMany({
    where: { status: 'ACTIVE' },
    include: {
      tier: { include: { permissions: { include: { permission: { select: { key: true } } } } } },
      areas: true,
      user: { select: { id: true } },
    },
  });

  const userIds = employees.map((e) => e.user.id);
  const [openTickets, openDisputes, openReports] = await Promise.all([
    prisma.ticket.groupBy({ by: ['assignedTo'], where: { assignedTo: { in: userIds }, status: { not: 'RESOLVED' } }, _count: { id: true } }),
    prisma.dispute.groupBy({ by: ['assignedTo'], where: { assignedTo: { in: userIds }, status: { not: 'RESOLVED' } }, _count: { id: true } }),
    prisma.report.groupBy({ by: ['assignedTo'], where: { assignedTo: { in: userIds }, status: { not: 'RESOLVED' } }, _count: { id: true } }),
  ]);
  const loadMap = new Map<string, number>();
  for (const group of [...openTickets, ...openDisputes, ...openReports]) {
    if (!group.assignedTo) continue;
    loadMap.set(group.assignedTo, (loadMap.get(group.assignedTo) ?? 0) + group._count.id);
  }

  const eligible = employees.filter((e) =>
    e.tier.permissions.some((p: { permission: { key: string } }) => p.permission.key === filters.permission) &&
    (filters.country == null || e.areas.some((a) => a.country === filters.country || a.scope === 'GLOBAL')) &&
    (filters.city == null || e.areas.some((a: any) => a.city === filters.city || a.scope === 'GLOBAL' || a.scope === 'COUNTRY' || a.scope === 'STATE'))
  );

  if (eligible.length === 0) return null;
  eligible.sort((a, b) => (loadMap.get(a.user.id) ?? 0) - (loadMap.get(b.user.id) ?? 0));
  return eligible[0].user.id;
}
