import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/covered', async (_req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      where: { isCovered: true },
      orderBy: [{ path: 'asc' }],
      select: { id: true, name: true, code: true, type: true, path: true },
    });
    res.json({ regions });
  } catch (err) {
    next(err);
  }
});

export default router;
