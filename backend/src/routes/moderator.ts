import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { logAudit } from '../lib/audit.js';
import { regionWhere, assertCanModerate } from '../lib/region.js';

const router = Router();

async function requireModerator(req: AuthRequest, res: any, next: any) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const employee = await prisma.managementEmployee.findUnique({
    where: { userId: req.user.id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, roles: true } },
      tier: { include: { permissions: { include: { permission: { select: { key: true } } } } } },
      region: true,
      areas: true,
    },
  });
  if (!employee || employee.status !== 'ACTIVE' || !req.user.roles.includes('MODERATOR')) {
    return res.status(403).json({ error: 'Forbidden: active moderator required' });
  }
  (req as any).employee = employee;
  next();
}

router.post('/apply', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const { city, district, area, employeeId, department } = req.body as any;
    const existing = await prisma.managementEmployee.findUnique({ where: { userId: user.id } });
    if (existing) throw new ApiError(400, 'Application already exists');
    let tier = await prisma.adminTier.findUnique({ where: { key: 'community-moderator' } });
    if (!tier) {
      const permissions = await prisma.permission.findMany({ where: { key: { in: ['tickets:read','tickets:write','disputes:read','disputes:write','reports:read','reports:write','approvals:read','approvals:write'] } } });
      tier = await prisma.adminTier.create({
        data: { key: 'community-moderator', name: 'Community Moderator', description: 'Moderator tier' },
      });
      if (!tier) throw new ApiError(500, 'Could not create tier');
      await prisma.adminTierPermission.createMany({ data: permissions.map((p: any) => ({ adminTierId: tier!.id, permissionId: p.id })) });
    }
    const employee = await prisma.managementEmployee.create({
      data: {
        userId: user.id,
        employeeId: employeeId ?? `${Date.now()}`,
        adminTierId: tier!.id,
        department: department ?? 'Community',
        status: 'INACTIVE',
        areas: { create: [{ scope: 'COMMUNITY', city, district, area }] },
      },
    });
    res.json({ ok: true, employee });
  } catch (e) {
    next(e);
  }
});

router.use(requireAuth, requireModerator);

router.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    res.json({
      employee: {
        ...employee,
        permissions: employee.tier.permissions.map((p: any) => p.permission.key),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/dashboard', async (req: AuthRequest, res, next) => {
  try {
    const [openTickets, inProgressTickets, openDisputes, underReviewDisputes, openReports, underReviewReports, pendingCooks, pendingFoods, pendingListings, pendingRiders] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' as any } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' as any } }),
      prisma.dispute.count({ where: { status: 'OPEN' as any } }),
      prisma.dispute.count({ where: { status: 'UNDER_REVIEW' as any } }),
      prisma.report.count({ where: { status: 'OPEN' as any } }),
      prisma.report.count({ where: { status: 'UNDER_REVIEW' as any } }),
      await prisma.cookProfile.count({ where: { profileStatus: 'PENDING_APPROVAL' as any } }),
      await prisma.food.count({ where: { status: 'PENDING_REVIEW' as any } }),
      prisma.cookListing.count({ where: { status: 'PENDING_REVIEW' as any } }),
      prisma.rider.count({ where: { isApproved: false } }),
    ]);
    res.json({
      tickets: { open: openTickets, inProgress: inProgressTickets },
      disputes: { open: openDisputes, underReview: underReviewDisputes },
      reports: { open: openReports, underReview: underReviewReports },
      approvals: { pendingCooks, pendingFoods, pendingListings, pendingRiders },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/tickets', async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query as { status?: string };
    const where = status ? { status: status as any } : {};
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ tickets });
  } catch (e) {
    next(e);
  }
});

router.patch('/tickets/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { status, resolution, assignedTo } = req.body as Record<string, any>;
    const id = req.params.id;
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    const data: any = {};
    if (status) data.status = status;
    if (resolution) data.resolution = resolution;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (Object.keys(data).length === 0) throw new ApiError(400, 'No update fields provided');
    const updated = await prisma.ticket.update({
      where: { id },
      data,
    });
    await logAudit({
      actorId: employee.user.id,
      action: 'MODERATOR_UPDATE_TICKET',
      targetId: id,
      targetType: 'TICKET',
      newState: data,
    });
    res.json({ ticket: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/disputes', async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query as { status?: string };
    const where = status ? { status: status as any } : {};
    const disputes = await prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ disputes });
  } catch (e) {
    next(e);
  }
});

router.patch('/disputes/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { status, resolution, refundKobo, assignedTo } = req.body as Record<string, any>;
    const id = req.params.id;
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    const data: any = {};
    if (status) data.status = status;
    if (resolution) data.resolution = resolution;
    if (refundKobo !== undefined) data.refundKobo = Number(refundKobo);
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (Object.keys(data).length === 0) throw new ApiError(400, 'No update fields provided');
    const updated = await prisma.dispute.update({
      where: { id },
      data,
    });
    await logAudit({
      actorId: employee.user.id,
      action: 'MODERATOR_UPDATE_DISPUTE',
      targetId: id,
      targetType: 'DISPUTE',
      newState: data,
    });
    res.json({ dispute: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/reports', async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query as { status?: string };
    const where = status ? { status: status as any } : {};
    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ reports });
  } catch (e) {
    next(e);
  }
});

router.patch('/reports/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { status, resolution, assignedTo } = req.body as Record<string, any>;
    const id = req.params.id;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new ApiError(404, 'Report not found');
    const data: any = {};
    if (status) data.status = status;
    if (resolution) data.resolution = resolution;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (Object.keys(data).length === 0) throw new ApiError(400, 'No update fields provided');
    const updated = await prisma.report.update({
      where: { id },
      data,
    });
    await logAudit({
      actorId: employee.user.id,
      action: 'MODERATOR_UPDATE_REPORT',
      targetId: id,
      targetType: 'REPORT',
      newState: data,
    });
    res.json({ report: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/approvals/cooks', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const cooks = await prisma.cookProfile.findMany({
      where: { profileStatus: 'PENDING_APPROVAL', ...regionWhere(employee) },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, region: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ cooks });
  } catch (e) {
    next(e);
  }
});

router.patch('/approvals/cooks/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { action, note } = req.body as { action: 'approve' | 'reject' | 'more-info'; note?: string };
    const id = req.params.id;
    const cook = await prisma.cookProfile.findUnique({ where: { id }, include: { region: true } });
    if (!cook) throw new ApiError(404, 'Cook not found');
    assertCanModerate(employee, cook.region?.path);
    const profileStatus = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'PENDING_APPROVAL';
    const approvedData = action === 'approve' ? { approvedById: employee.user.id, approvedAt: new Date() } : {};
    const updated = await prisma.cookProfile.update({
      where: { id },
      data: { profileStatus, ...approvedData },
    });
    await logAudit({
      actorId: employee.user.id,
      action: `MODERATOR_COOK_${action.toUpperCase()}`,
      targetId: id,
      targetType: 'COOK',
      reason: note,
      newState: { profileStatus },
    });
    res.json({ cook: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/approvals/foods', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const foods = await prisma.food.findMany({
      where: { status: 'PENDING_REVIEW' as any, ...regionWhere(employee, 'cook') },
      include: { options: true, cook: { include: { region: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ foods });
  } catch (e) {
    next(e);
  }
});

router.patch('/approvals/foods/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { action } = req.body as { action: 'approve' | 'reject' };
    const id = req.params.id;
    const food = await prisma.food.findUnique({ where: { id }, include: { cook: { include: { region: true } } } });
    if (!food) throw new ApiError(404, 'Food not found');
    assertCanModerate(employee, food.cook?.region?.path);
    const status = (action === 'approve' ? 'PUBLISHED' : 'REJECTED') as any;
    const isAvailable = action === 'approve';
    const approvedFood = action === 'approve' ? { approvedById: employee.user.id, approvedAt: new Date() } : {};
    const updated = await prisma.food.update({
      where: { id },
      data: { status, isAvailable, ...approvedFood },
    });
    await logAudit({
      actorId: employee.user.id,
      action: `MODERATOR_FOOD_${action.toUpperCase()}`,
      targetId: id,
      targetType: 'FOOD',
      newState: { status, isAvailable },
    });
    res.json({ food: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/approvals/listings', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const listings = await prisma.cookListing.findMany({
      where: { status: 'PENDING_REVIEW', ...regionWhere(employee, 'cook') },
      include: { cook: { include: { region: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ listings });
  } catch (e) {
    next(e);
  }
});

router.patch('/approvals/listings/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { action } = req.body as { action: 'approve' | 'reject' };
    const id = req.params.id;
    const listing = await prisma.cookListing.findUnique({ where: { id }, include: { cook: { include: { region: true } } } });
    if (!listing) throw new ApiError(404, 'Listing not found');
    assertCanModerate(employee, listing.cook?.region?.path);
    const status = (action === 'approve' ? 'APPROVED' : 'REJECTED') as any;
    const isActive = action === 'approve';
    const approvedListing = action === 'approve' ? { approvedById: employee.user.id, approvedAt: new Date() } : {};
    const updated = await prisma.cookListing.update({
      where: { id },
      data: { status, isActive, ...approvedListing },
    });
    await logAudit({
      actorId: employee.user.id,
      action: `MODERATOR_LISTING_${action.toUpperCase()}`,
      targetId: id,
      targetType: 'COOK_LISTING',
      newState: { status, isActive },
    });
    res.json({ listing: updated });
  } catch (e) {
    next(e);
  }
});

router.get('/approvals/riders', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const riders = await prisma.rider.findMany({
      where: { isApproved: false, ...regionWhere(employee) },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, region: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ riders });
  } catch (e) {
    next(e);
  }
});

router.patch('/approvals/riders/:id', async (req: AuthRequest, res, next) => {
  try {
    const employee = (req as any).employee;
    const { action } = req.body as { action: 'approve' | 'reject' };
    const id = req.params.id;
    const rider = await prisma.rider.findUnique({ where: { id }, include: { region: true } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    assertCanModerate(employee, rider.region?.path);
    const isApproved = action === 'approve';
    const updated = await prisma.rider.update({
      where: { id },
      data: { isApproved, neighborhoodApproval: isApproved ? 'APPROVED' : 'REJECTED' },
    });
    await logAudit({
      actorId: employee.user.id,
      action: `MODERATOR_RIDER_${action.toUpperCase()}`,
      targetId: id,
      targetType: 'RIDER',
      newState: { isApproved },
    });
    res.json({ rider: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
