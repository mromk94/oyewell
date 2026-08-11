import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { createApproval, reviewApproval, getApprovals, getApproval } from '../lib/approval.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const { type, status, targetId, targetType } = req.query as Record<string, string | undefined>;
    const approvals = await getApprovals({
      ...(type && { type: type as any }),
      ...(status && { status: status as any }),
      ...(targetId && { targetId }),
      ...(targetType && { targetType }),
    });
    res.json({ approvals });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const approval = await getApproval(req.params.id);
    if (!approval) throw new ApiError(404, 'Approval not found');
    res.json({ approval });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { type, targetId, targetType, data, note } = req.body as Record<string, any>;
    if (!type || !targetId || !targetType) throw new ApiError(400, 'type, targetId and targetType are required');
    const approval = await createApproval({
      type,
      targetId,
      targetType,
      submittedBy: req.user?.id,
      data,
      note,
    });
    res.status(201).json({ approval });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { status, note, moreInfo } = req.body as Record<string, any>;
    if (!status) throw new ApiError(400, 'status is required');
    const approval = await reviewApproval({
      approvalId: req.params.id,
      status,
      reviewedBy: req.user!.id,
      note,
      moreInfo,
    });
    res.json({ approval });
  } catch (e) {
    next(e);
  }
});

export default router;
