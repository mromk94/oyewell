import { prisma } from '../prisma.js';
import { ApiError } from './errors.js';
import type { AuthRequest } from '../middleware/auth.js';

export type Actor = { user: { id: string; email: string; firstName?: string | null; lastName?: string | null }; region?: { id: string; path: string } | null; isAdmin: boolean } | (any & { isAdmin: false });

export async function loadModeratorOrAdmin(req: AuthRequest) {
  if (!req.user) throw new ApiError(401, 'Unauthorized');
  if (req.user.roles.includes('ADMIN')) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, firstName: true, lastName: true } });
    if (!user) throw new ApiError(401, 'Admin not found');
    return { user, region: null as any, isAdmin: true };
  }
  const employee = await prisma.managementEmployee.findUnique({
    where: { userId: req.user.id },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, region: true, tier: true },
  });
  if (!employee || employee.status !== 'ACTIVE') throw new ApiError(403, 'Active moderator required');
  if (!req.user.roles.includes('MODERATOR')) throw new ApiError(403, 'Moderator required');
  return { ...employee, isAdmin: false };
}
