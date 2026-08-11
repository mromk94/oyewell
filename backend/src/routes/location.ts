import { Router } from 'express';
import { reverseGeocode, validateLocation } from '../lib/location.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';

const router = Router();

router.get('/reverse', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const point = validateLocation({ lat, lng });
    if (!point) throw new ApiError(400, 'lat and lng must be valid numbers');
    const result = await reverseGeocode(point);
    res.json({ location: result });
  } catch (err) {
    next(err);
  }
});

router.get('/addresses', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
});

router.post('/addresses', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { label, address, latitude, longitude, isDefault } = req.body as Record<string, any>;
    if (!address) throw new ApiError(400, 'Address is required');
    const data = {
      userId: req.user!.id,
      label: label ? String(label) : 'Other',
      address: String(address),
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      isDefault: Boolean(isDefault),
    };
    if (data.isDefault) {
      await prisma.userAddress.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    const created = await prisma.userAddress.create({ data });
    res.json({ address: created });
  } catch (err) {
    next(err);
  }
});

router.put('/addresses/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.userAddress.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw new ApiError(404, 'Address not found');
    const { label, address, latitude, longitude, isDefault } = req.body as Record<string, any>;
    if (isDefault === true) {
      await prisma.userAddress.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    const updated = await prisma.userAddress.update({
      where: { id },
      data: {
        label: label != null ? String(label) : undefined,
        address: address != null ? String(address) : undefined,
        latitude: latitude != null ? Number(latitude) : undefined,
        longitude: longitude != null ? Number(longitude) : undefined,
        isDefault: isDefault != null ? Boolean(isDefault) : undefined,
      },
    });
    res.json({ address: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/addresses/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.userAddress.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw new ApiError(404, 'Address not found');
    await prisma.userAddress.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
