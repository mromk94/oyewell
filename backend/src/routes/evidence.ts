import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { addEvidence, getEvidence, buildOrderTimeline } from '../lib/evidence.js';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/:caseType/:caseId', async (req, res, next) => {
  try {
    const items = await getEvidence(req.params.caseType, req.params.caseId);
    res.json({ evidence: items });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { caseType, caseId, evidenceType, title, description, data, sourceUrl } = req.body as Record<string, any>;
    if (!caseType || !caseId || !evidenceType) throw new ApiError(400, 'caseType, caseId and evidenceType are required');
    const item = await addEvidence({
      caseType,
      caseId,
      evidenceType,
      title,
      description,
      data,
      sourceUrl,
      createdBy: req.user!.id,
    });
    res.status(201).json({ evidence: item });
  } catch (e) {
    next(e);
  }
});

router.get('/timeline/order/:orderId', async (req, res, next) => {
  try {
    const timeline = await buildOrderTimeline(req.params.orderId);
    res.json({ timeline });
  } catch (e) {
    next(e);
  }
});

export default router;
