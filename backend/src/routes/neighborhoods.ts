import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import {
  listNeighborhoods,
  findCooksInNeighborhood,
  findRidersInNeighborhood,
  resolveNeighborhood,
  normalizeNeighborhood,
} from '../lib/neighborhood.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const neighborhoods = await listNeighborhoods();
    res.json({ neighborhoods });
  } catch (err) {
    next(err);
  }
});

router.post('/resolve', async (req, res, next) => {
  try {
    const { address, lat, lng } = req.body as Record<string, any>;
    const neighborhood = await resolveNeighborhood({
      address: typeof address === 'string' ? address : undefined,
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
    });
    if (!neighborhood) throw new ApiError(400, 'Could not resolve neighborhood');
    res.json({ neighborhood });
  } catch (err) {
    next(err);
  }
});

router.get('/:name/cooks', async (req, res, next) => {
  try {
    const name = normalizeNeighborhood(req.params.name);
    if (!name) throw new ApiError(400, 'Invalid neighborhood');
    const cooks = await findCooksInNeighborhood(name);
    res.json({ neighborhood: name, cooks });
  } catch (err) {
    next(err);
  }
});

router.get('/:name/riders', async (req, res, next) => {
  try {
    const name = normalizeNeighborhood(req.params.name);
    if (!name) throw new ApiError(400, 'Invalid neighborhood');
    const riders = await findRidersInNeighborhood(name);
    res.json({ neighborhood: name, riders });
  } catch (err) {
    next(err);
  }
});

export default router;
