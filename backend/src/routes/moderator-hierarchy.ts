import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { logAudit } from '../lib/audit.js';
import { assertHigherRegion } from '../lib/region.js';
import { loadModeratorOrAdmin } from '../lib/moderator-actor.js';

const router = Router();


router.use(requireAuth);

router.get('/moderators', async (req: AuthRequest, res, next) => {
  try {
    const actor = await loadModeratorOrAdmin(req);
    const where: any = { tier: { key: 'community-moderator' } };
    if (actor.region) {
      where.region = { path: { startsWith: actor.region.path } };
    }
    const moderators = await prisma.managementEmployee.findMany({
      where,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, region: true, tier: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ moderators: moderators.filter((m) => actor.isAdmin || m.regionId !== actor.region?.id) });
  } catch (e) {
    next(e);
  }
});

router.post('/moderators/:id/action', async (req: AuthRequest, res, next) => {
  try {
    const actor = await loadModeratorOrAdmin(req);
    const { id } = req.params;
    const { action, note } = req.body as { action: 'SUSPEND' | 'INACTIVE' | 'DELETE' | 'BAN'; note?: string };
    if (!action) throw new ApiError(400, 'action is required');
    const target = await prisma.managementEmployee.findUnique({ where: { id }, include: { region: true, user: { select: { id: true, email: true } } } });
    if (!target) throw new ApiError(404, 'Moderator not found');
    assertHigherRegion(actor, target);
    const approval = await prisma.approval.create({
      data: {
        type: 'SPECIAL',
        targetId: id,
        targetType: 'MANAGEMENT_EMPLOYEE',
        status: 'SUBMITTED',
        submittedBy: actor.user.id,
        submittedAt: new Date(),
        note: note || undefined,
        data: { action, requesterId: actor.user.id, requesterRegionId: actor.region?.id },
      },
    });
    res.status(201).json({ approval });
  } catch (e) {
    next(e);
  }
});

router.get('/actions', async (req: AuthRequest, res, next) => {
  try {
    const actor = await loadModeratorOrAdmin(req);
    const approvals = await prisma.approval.findMany({
      where: { type: 'SPECIAL', targetType: 'MANAGEMENT_EMPLOYEE', status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const targetIds = [...new Set(approvals.map((a) => a.targetId))];
    const targets = await prisma.managementEmployee.findMany({
      where: { id: { in: targetIds } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, region: true },
    });
    const targetMap = new Map(targets.map((t) => [t.id, t]));
    const visible = approvals
      .map((a) => ({ ...a, target: targetMap.get(a.targetId) }))
      .filter((a: any) => {
        if (actor.isAdmin) return true;
        if (!a.target?.region) return false;
        if (a.target.region.path === actor.region?.path) return false;
        return a.target.region.path.startsWith(actor.region?.path ?? '');
      });
    res.json({ actions: visible });
  } catch (e) {
    next(e);
  }
});

router.post('/actions/:actionId/resolve', async (req: AuthRequest, res, next) => {
  try {
    const actor = await loadModeratorOrAdmin(req);
    const { actionId } = req.params;
    const { decision, note } = req.body as { decision: 'approve' | 'reject'; note?: string };
    if (!decision) throw new ApiError(400, 'decision is required');
    const approval = await prisma.approval.findUnique({ where: { id: actionId } });
    if (!approval || approval.type !== 'SPECIAL' || approval.targetType !== 'MANAGEMENT_EMPLOYEE') throw new ApiError(404, 'Action request not found');
    if (approval.status !== 'SUBMITTED' && approval.status !== 'UNDER_REVIEW') throw new ApiError(400, 'Action already resolved');
    const target = await prisma.managementEmployee.findUnique({ where: { id: approval.targetId }, include: { user: true, region: true } });
    if (!target) throw new ApiError(404, 'Target not found');
    assertHigherRegion(actor, target);

    if (decision === 'approve') {
      const action = (approval.data as any)?.action ?? 'SUSPEND';
      if (action === 'DELETE') {
        const roles = (target.user.roles ?? []).filter((r: string) => r !== 'MODERATOR');
        await prisma.user.update({ where: { id: target.userId }, data: { roles: { set: roles } } });
        await prisma.managementEmployee.delete({ where: { id: target.id } });
      } else {
        const status = action === 'SUSPEND' ? 'SUSPENDED' : action === 'BAN' ? 'SUSPENDED' : action === 'INACTIVE' ? 'INACTIVE' : 'SUSPENDED';
        await prisma.managementEmployee.update({ where: { id: target.id }, data: { status } });
        if (status !== 'INACTIVE') {
          const roles = (target.user.roles ?? []).filter((r: string) => r !== 'MODERATOR');
          await prisma.user.update({ where: { id: target.userId }, data: { roles: { set: roles } } });
        }
      }
    }

    const updated = await prisma.approval.update({
      where: { id: actionId },
      data: {
        status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        reviewedBy: actor.user.id,
        reviewedAt: new Date(),
        note: note || approval.note,
      },
    });

    await logAudit({
      actorId: actor.user.id,
      action: `MODERATOR_${decision.toUpperCase()}_ACTION`,
      targetId: target.id,
      targetType: 'MANAGEMENT_EMPLOYEE',
      reason: note,
      newState: { approvalStatus: updated.status, moderatorAction: (approval.data as any)?.action },
    });

    res.json({ approval: updated });
  } catch (e) {
    next(e);
  }
});

export default router;
