import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/tiers', async (_req, res, next) => {
  try {
    const tiers = await prisma.adminTier.findMany({
      include: { permissions: { include: { permission: { select: { key: true, scope: true, description: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json({ tiers });
  } catch (e) {
    next(e);
  }
});

router.post('/tiers', async (req: AuthRequest, res, next) => {
  try {
    const { key, name, description, permissionIds } = req.body as Record<string, any>;
    if (!key || !name) throw new ApiError(400, 'key and name are required');
    const tier = await prisma.adminTier.create({
      data: {
        key,
        name,
        description,
        permissions: {
          create: (permissionIds ?? []).map((id: string) => ({ permission: { connect: { id } } })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
    res.status(201).json({ tier });
  } catch (e) {
    next(e);
  }
});

router.get('/permissions', async (_req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { scope: 'asc' } });
    res.json({ permissions });
  } catch (e) {
    next(e);
  }
});

router.post('/permissions', async (req: AuthRequest, res, next) => {
  try {
    const { key, scope, description } = req.body as Record<string, any>;
    if (!key || !scope) throw new ApiError(400, 'key and scope are required');
    const permission = await prisma.permission.create({
      data: { key, scope, description },
    });
    res.status(201).json({ permission });
  } catch (e) {
    next(e);
  }
});

router.get('/employees', async (_req, res, next) => {
  try {
    const employees = await prisma.managementEmployee.findMany({
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ employees });
  } catch (e) {
    next(e);
  }
});

router.post('/employees', async (req: AuthRequest, res, next) => {
  try {
    const { userId, adminTierId, employeeId, department, limits } = req.body as Record<string, any>;
    if (!userId || !adminTierId || !employeeId) throw new ApiError(400, 'userId, adminTierId and employeeId are required');
    const employee = await prisma.managementEmployee.create({
      data: {
        userId,
        adminTierId,
        employeeId,
        department,
        limits: limits ?? {},
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true },
    });
    res.status(201).json({ employee });
  } catch (e) {
    next(e);
  }
});

export default router;
