import { Router } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const sides = await prisma.side.findMany({
      where: { isAvailable: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, description: true, priceKobo: true, isAvailable: true },
    });
    res.json({ sides });
  } catch (err) {
    next(err);
  }
});

export default router;
