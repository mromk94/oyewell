import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

router.use(requireAuth, requireAdmin);

const MODERATOR_PERMISSION_KEYS = [
  'tickets:read', 'tickets:write',
  'disputes:read', 'disputes:write',
  'reports:read', 'reports:write',
  'approvals:read', 'approvals:write',
];

async function ensureModeratorTier() {
  const existing = await prisma.adminTier.findUnique({
    where: { key: 'community-moderator' },
    include: { permissions: { include: { permission: { select: { key: true } } } } },
  });
  if (existing) return existing;
  const permissions = await prisma.permission.findMany({
    where: { key: { in: MODERATOR_PERMISSION_KEYS } },
  });
  const permissionIds = permissions.map((p: { id: string }) => p.id);
  const tier = await prisma.adminTier.create({
    data: {
      key: 'community-moderator',
      name: 'Community Moderator',
      description: 'Handles tickets, disputes, reports and approvals',
      permissions: {
        create: permissionIds.map((id: string) => ({ permission: { connect: { id } } })),
      },
    },
    include: { permissions: { include: { permission: { select: { key: true } } } } },
  });
  return tier;
}

router.get('/', async (_req, res, next) => {
  try {
    const employees = await prisma.managementEmployee.findMany({
      where: { tier: { key: 'community-moderator' } },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, roles: true } },
        tier: true,
        region: true,
        areas: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ moderators: employees });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { email, firstName, lastName, employeeId, department, regionId } = req.body as Record<string, any>;
    if (!email || !employeeId) throw new ApiError(400, 'email and employeeId are required');
    const tier = await ensureModeratorTier();
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const hashed = bcrypt.hashSync(password, 10);
    const user = await prisma.user.upsert({
      where: { email: String(email) },
      update: {
        roles: { push: 'MODERATOR' },
      },
      create: {
        email: String(email),
        firstName: firstName ? String(firstName) : undefined,
        lastName: lastName ? String(lastName) : undefined,
        password: hashed,
        role: 'CUSTOMER',
        roles: ['CUSTOMER', 'MODERATOR'],
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: Array.from(new Set([...user.roles, 'MODERATOR'])) } },
    });
    const existing = await prisma.managementEmployee.findUnique({ where: { userId: user.id } });
    if (existing) {
      const updated = await prisma.managementEmployee.update({
        where: { id: existing.id },
        data: { adminTierId: tier.id, employeeId: String(employeeId), department, regionId: regionId ?? null, status: 'ACTIVE' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true, region: true },
      });
      return res.json({ moderator: updated, tempPassword: existing ? undefined : password });
    }
    const moderator = await prisma.managementEmployee.create({
      data: {
        userId: user.id,
        adminTierId: tier.id,
        employeeId: String(employeeId),
        department,
        regionId: regionId ?? null,
        status: 'ACTIVE',
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true, region: true },
    });
    res.status(201).json({ moderator, tempPassword: password });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { status, adminTierId, department, limits, regionId } = req.body as Record<string, any>;
    const id = req.params.id;
    const existing = await prisma.managementEmployee.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Moderator not found');
    const data: any = {};
    if (status) data.status = status;
    if (adminTierId) data.adminTierId = adminTierId;
    if (department !== undefined) data.department = department;
    if (limits !== undefined) data.limits = limits;
    if (regionId !== undefined) data.regionId = regionId ?? null;
    const updated = await prisma.managementEmployee.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true, region: true },
    });
    if (status === 'ACTIVE') {
      await prisma.user.update({
        where: { id: updated.userId },
        data: { roles: { set: Array.from(new Set([...(await prisma.user.findUnique({ where: { id: updated.userId } }))?.roles ?? [], 'MODERATOR'])) } },
      });
    } else if (status === 'SUSPENDED' || status === 'INACTIVE' || status === 'INVITED') {
      const u = await prisma.user.findUnique({ where: { id: updated.userId } });
      if (u) {
        await prisma.user.update({
          where: { id: u.id },
          data: { roles: { set: u.roles.filter((r) => r !== 'MODERATOR') } },
        });
      }
    }
    res.json({ moderator: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/audit', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id;
    const employee = await prisma.managementEmployee.findUnique({ where: { id }, include: { user: { select: { id: true } } } });
    if (!employee) throw new ApiError(404, 'Moderator not found');
    const [logs, approvals] = await Promise.all([
      prisma.auditLog.findMany({ where: { actorId: employee.userId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      Promise.all([
        prisma.cookProfile.count({ where: { approvedById: employee.userId } }),
        prisma.food.count({ where: { approvedById: employee.userId } }),
        prisma.cookListing.count({ where: { approvedById: employee.userId } }),
      ]),
    ]);
    res.json({
      logs,
      stats: { joinedAt: employee.createdAt, lastLoginAt: employee.lastLoginAt, cooksApproved: approvals[0], foodsApproved: approvals[1], listingsApproved: approvals[2], balanceKobo: employee.balanceKobo },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/balance', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id;
    const { type, amountKobo, note } = req.body as { type: 'credit' | 'debit'; amountKobo: number; note?: string };
    if (!type || !amountKobo || amountKobo <= 0) throw new ApiError(400, 'type and positive amountKobo required');
    const employee = await prisma.managementEmployee.findUnique({ where: { id } });
    if (!employee) throw new ApiError(404, 'Moderator not found');
    const delta = type === 'credit' ? amountKobo : -amountKobo;
    const newBalance = Math.max(0, employee.balanceKobo + delta);
    const updated = await prisma.managementEmployee.update({
      where: { id },
      data: { balanceKobo: newBalance },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true, region: true, areas: true },
    });
    await logAudit({
      actorId: req.user!.id,
      action: `ADMIN_MODERATOR_${type.toUpperCase()}`,
      targetId: id,
      targetType: 'MANAGEMENT_EMPLOYEE',
      newState: { balanceKobo: newBalance, delta },
      reason: note,
    });
    res.json({ moderator: updated });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/bank', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id;
    const { bankName, bankAccountNumber, bankAccountName } = req.body as Record<string, any>;
    const employee = await prisma.managementEmployee.findUnique({ where: { id }, include: { user: { select: { firstName: true, lastName: true } } } });
    if (!employee) throw new ApiError(404, 'Moderator not found');
    const expected = `${employee.user.firstName ?? ''} ${employee.user.lastName ?? ''}`.trim();
    if (bankAccountName && bankAccountName !== expected) throw new ApiError(400, `Bank account name must match the moderator's name: ${expected}`);
    const updated = await prisma.managementEmployee.update({
      where: { id },
      data: { bankName, bankAccountNumber, bankAccountName },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true, region: true, areas: true },
    });
    res.json({ moderator: updated });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id;
    const existing = await prisma.managementEmployee.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Moderator not found');
    const user = await prisma.user.findUnique({ where: { id: existing.userId } });
    if (user) {
      const roles = Array.from(new Set(user.roles)).filter((r) => r !== 'MODERATOR');
      await prisma.user.update({
        where: { id: user.id },
        data: { roles: { set: roles } },
      });
    }
    await prisma.managementEmployee.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
