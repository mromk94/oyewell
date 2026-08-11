import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { runDataRetention } from '../lib/retention.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/reports', async (_req, res, next) => {
  try {
    const [openTickets, resolvedTickets, openDisputes, resolvedDisputes, refunds, cooksPending, cooksApproved, reportsByType] = await Promise.all([
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.dispute.count({ where: { status: 'RESOLVED' } }),
      prisma.dispute.aggregate({ where: { status: 'RESOLVED' }, _sum: { refundKobo: true } }),
      prisma.cookProfile.count({ where: { profileStatus: 'PENDING_APPROVAL' } }),
      prisma.cookProfile.count({ where: { profileStatus: 'APPROVED' } }),
      prisma.report.groupBy({ by: ['targetType'], _count: { id: true } }),
    ]);
    res.json({
      support: { openTickets, resolvedTickets },
      disputes: { openDisputes, resolvedDisputes, refundKobo: refunds._sum.refundKobo ?? 0 },
      community: { pendingApplications: cooksPending, approvedApplications: cooksApproved, approvalRate: cooksPending + cooksApproved === 0 ? 0 : cooksApproved / (cooksPending + cooksApproved) },
      moderation: reportsByType,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/data-retention', async (req: AuthRequest, res, next) => {
  try {
    const { messageDays, auditLogDays, ticketDays, disputeDays } = req.body as Record<string, any>;
    const deleted = await runDataRetention({
      messageDays: messageDays ? Number(messageDays) : undefined,
      auditLogDays: auditLogDays ? Number(auditLogDays) : undefined,
      ticketDays: ticketDays ? Number(ticketDays) : undefined,
      disputeDays: disputeDays ? Number(disputeDays) : undefined,
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'DATA_RETENTION_RUN',
      targetType: 'SYSTEM',
      newState: deleted,
    });
    res.json({ deleted });
  } catch (e) {
    next(e);
  }
});

router.get('/dashboard', async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayOrders, pendingCooks, pendingListings, pendingRiders, openDisputes, openTickets, openReports, newCooks, newRiders, activeDeliveries] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.cookProfile.count({ where: { profileStatus: 'PENDING_APPROVAL' } }),
      prisma.cookListing.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.rider.count({ where: { isApproved: false } }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.cookProfile.count({ where: { createdAt: { gte: today } } }),
      prisma.rider.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: { in: ['PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } } }),
    ]);
    res.json({
      today: { orders: todayOrders, newCooks, newRiders },
      attention: { pendingApprovals: pendingCooks + pendingListings + pendingRiders, openDisputes, openTickets, openReports },
      delivery: { activeDeliveries },
    });
  } catch (e) {
    next(e);
  }
});

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

router.get('/employees/:id', async (req, res, next) => {
  try {
    const employee = await prisma.managementEmployee.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!employee) throw new ApiError(404, 'Employee not found');
    res.json({ employee });
  } catch (e) {
    next(e);
  }
});

router.patch('/employees/:id', async (req: AuthRequest, res, next) => {
  try {
    const { adminTierId, department, limits, status } = req.body as Record<string, any>;
    const employee = await prisma.managementEmployee.update({
      where: { id: req.params.id },
      data: {
        ...(adminTierId !== undefined && { adminTierId }),
        ...(department !== undefined && { department }),
        ...(limits !== undefined && { limits }),
        ...(status !== undefined && { status }),
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, tier: true },
    });
    res.json({ employee });
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

router.get('/employees/:id/areas', async (req, res, next) => {
  try {
    const areas = await prisma.moderatorArea.findMany({
      where: { employeeId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ areas });
  } catch (e) {
    next(e);
  }
});

router.post('/employees/:id/areas', async (req: AuthRequest, res, next) => {
  try {
    const { scope, country, region, city, district, area, latitude, longitude, radiusMeters } = req.body as Record<string, any>;
    if (!scope) throw new ApiError(400, 'scope is required');
    const created = await prisma.moderatorArea.create({
      data: {
        employeeId: req.params.id,
        scope,
        country,
        region,
        city,
        district,
        area,
        latitude,
        longitude,
        radiusMeters,
      },
    });
    res.status(201).json({ area: created });
  } catch (e) {
    next(e);
  }
});

router.delete('/areas/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.moderatorArea.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
