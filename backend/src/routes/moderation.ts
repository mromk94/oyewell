import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { createReport, getReports, assignReport, resolveReport, blockUser, isBlocked } from '../lib/moderation.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/reports', async (req: AuthRequest, res, next) => {
  try {
    const { targetId, targetType, reason, details, evidence } = req.body as Record<string, any>;
    if (!targetId || !targetType || !reason) throw new ApiError(400, 'targetId, targetType and reason are required');
    const report = await createReport({
      reporterId: req.user!.id,
      targetId,
      targetType,
      reason,
      details,
      evidence,
    });
    res.status(201).json({ report });
  } catch (e) {
    next(e);
  }
});

router.get('/reports', async (req: AuthRequest, res, next) => {
  try {
    const { status, assignedTo } = req.query as Record<string, any>;
    const reports = await getReports({ ...(status && { status }), ...(assignedTo && { assignedTo }) });
    res.json({ reports });
  } catch (e) {
    next(e);
  }
});

router.patch('/reports/:id/assign', async (req: AuthRequest, res, next) => {
  try {
    const { assignedTo } = req.body as Record<string, any>;
    if (!assignedTo) throw new ApiError(400, 'assignedTo is required');
    const report = await assignReport(req.params.id, assignedTo);
    res.json({ report });
  } catch (e) {
    next(e);
  }
});

router.patch('/reports/:id/resolve', async (req: AuthRequest, res, next) => {
  try {
    const { resolution } = req.body as Record<string, any>;
    if (!resolution) throw new ApiError(400, 'resolution is required');
    const report = await resolveReport(req.params.id, resolution);
    res.json({ report });
  } catch (e) {
    next(e);
  }
});

router.post('/blocks', async (req: AuthRequest, res, next) => {
  try {
    const { blockedId, reason } = req.body as Record<string, any>;
    if (!blockedId) throw new ApiError(400, 'blockedId is required');
    const block = await blockUser({ blockerId: req.user!.id, blockedId, reason });
    res.status(201).json({ block });
  } catch (e) {
    next(e);
  }
});

router.get('/blocks/:blockedId', async (req: AuthRequest, res, next) => {
  try {
    const blocked = await isBlocked(req.user!.id, req.params.blockedId);
    res.json({ blocked });
  } catch (e) {
    next(e);
  }
});

export default router;
