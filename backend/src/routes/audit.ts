import { Router } from 'express';
import { getAuditLogs } from '../lib/audit.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const { actorId, action, targetId, targetType, reference, from, to, skip, take } = req.query as Record<string, string | undefined>;
    const logs = await getAuditLogs({
      actorId,
      action,
      targetId,
      targetType,
      reference,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
    res.json({ logs });
  } catch (e) {
    next(e);
  }
});

export default router;
