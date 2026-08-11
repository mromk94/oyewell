import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { createDispute, getDisputes, getDispute, assignDispute, resolveDispute, addDisputeTimelineEvent } from '../lib/disputes.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { hasPermission, isWithinLimit } from '../lib/management.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { customerId, status, assignedTo } = req.query as Record<string, any>;
    const disputes = await getDisputes({ customerId, status, assignedTo });
    res.json({ disputes });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const dispute = await getDispute(req.params.id);
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    const isParty = dispute.customerId === req.user!.id || dispute.assignedTo === req.user!.id;
    const isEmployee = await hasPermission({ userId: req.user!.id, key: 'DISPUTE_VIEW' }).catch(() => false);
    if (!isParty && !isEmployee) throw new ApiError(403, 'Forbidden');
    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { type, orderId, cookId, riderId, description, evidence } = req.body as Record<string, any>;
    if (!type) throw new ApiError(400, 'type is required');
    const dispute = await createDispute({
      customerId: req.user!.id,
      type,
      orderId,
      cookId,
      riderId,
      description,
      evidence,
    });
    res.status(201).json({ dispute });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/assign', async (req: AuthRequest, res, next) => {
  try {
    const allowed = await hasPermission({ userId: req.user!.id, key: 'DISPUTE_ASSIGN' });
    if (!allowed) throw new ApiError(403, 'Forbidden');
    const { assignedTo } = req.body as Record<string, any>;
    if (!assignedTo) throw new ApiError(400, 'assignedTo is required');
    const dispute = await assignDispute(req.params.id, assignedTo);
    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/resolve', async (req: AuthRequest, res, next) => {
  try {
    const allowed = await hasPermission({ userId: req.user!.id, key: 'DISPUTE_RESOLVE' });
    if (!allowed) throw new ApiError(403, 'Forbidden');
    const { resolution, refundKobo } = req.body as Record<string, any>;
    if (!resolution) throw new ApiError(400, 'resolution is required');
    const withinLimit = refundKobo == null || await isWithinLimit(req.user!.id, 'REFUND_APPROVE', refundKobo);
    if (!withinLimit) throw new ApiError(403, 'Refund exceeds your authorization limit');
    const dispute = await resolveDispute(req.params.id, resolution, refundKobo);
    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/timeline', async (req: AuthRequest, res, next) => {
  try {
    const { event } = req.body as Record<string, any>;
    if (!event) throw new ApiError(400, 'event is required');
    const dispute = await addDisputeTimelineEvent(req.params.id, event);
    if (!dispute) throw new ApiError(404, 'Dispute not found');
    res.json({ dispute });
  } catch (e) {
    next(e);
  }
});

export default router;
