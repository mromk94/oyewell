import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const q = ((req.query.q as string) ?? '').trim().toLowerCase();
    const type = (req.query.type as string) ?? '';
    const all = await prisma.region.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    let regions = all;
    if (type) regions = regions.filter((r: any) => r.type === type.toUpperCase());
    if (q) regions = regions.filter((r: any) => r.name.toLowerCase().includes(q) || (r.code ?? '').toLowerCase().includes(q));
    res.json({ regions });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { id, type, name, code, parentId, isCovered } = req.body as {
      id: string;
      type: 'CONTINENT' | 'COUNTRY' | 'STATE';
      name: string;
      code?: string;
      parentId?: string;
      isCovered?: boolean;
    };
    if (!id || !type || !name) throw new ApiError(400, 'id, type and name are required');
    let path = `/${id}/`;
    if (parentId) {
      const parent = await prisma.region.findUnique({ where: { id: parentId } });
      if (parent) path = `${parent.path}${id}/`;
    }
    const region = await prisma.region.create({
      data: { id, type, name, code, parentId, path, isCovered: Boolean(isCovered) },
    });
    res.status(201).json({ region });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/coverage', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isCovered } = req.body as { isCovered?: boolean };
    const region = await prisma.region.update({
      where: { id },
      data: { isCovered: isCovered === undefined ? true : Boolean(isCovered) },
    });
    res.json({ region });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/parent', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parentId } = req.body as { parentId?: string };
    let path = `/${id}/`;
    if (parentId) {
      const parent = await prisma.region.findUnique({ where: { id: parentId } });
      if (parent) path = `${parent.path}${id}/`;
    }
    const region = await prisma.region.update({
      where: { id },
      data: { parentId, path },
    });
    res.json({ region });
  } catch (err) {
    next(err);
  }
});

export default router;
