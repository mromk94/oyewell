import { Router } from 'express';
import { reverseGeocode } from '../lib/location.js';
import { validateLocation } from '../lib/location.js';
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

export default router;
