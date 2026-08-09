import { Router } from 'express';
import { prisma } from '../prisma.js';
import { resolveDelivery } from '../lib/delivery.js';
import { formatKobo } from '../lib/money.js';
import { ApiError } from '../lib/errors.js';
import { deliveryCheckSchema } from '../lib/validation.js';

const router = Router();

router.post('/check', async (req, res, next) => {
  try {
    const body = deliveryCheckSchema.parse(req.body);
    const { address, foodSlug, optionId, quantity, sideIds } = body;

    const food = await prisma.food.findUnique({
      where: { slug: foodSlug },
      include: { options: true },
    });

    if (!food || food.status !== 'PUBLISHED' || !food.isAvailable) {
      throw new ApiError(404, 'Food not available');
    }

    const option = food.options.find((o) => o.id === optionId);
    if (!option) {
      throw new ApiError(400, 'Option not found');
    }

    if (quantity < 1 || (option.stock !== null && quantity > option.stock)) {
      throw new ApiError(400, 'Invalid quantity');
    }

    const sides = sideIds.length
      ? await prisma.side.findMany({
          where: { id: { in: sideIds }, isAvailable: true },
        })
      : [];
    const sidesKobo = sides.reduce((sum, s) => sum + s.priceKobo, 0);
    const subtotalKobo = option.priceKobo * quantity + sidesKobo;
    const delivery = await resolveDelivery(address, subtotalKobo);

    if (!delivery || !delivery.available) {
      res.json({
        available: false,
        message: delivery?.reason ?? "Sorry, we don't currently deliver to this location.",
      });
      return;
    }

    res.json({
      available: true,
      message: `Delivery available in ${delivery.zone.name}`,
      zone: {
        id: delivery.zone.id,
        name: delivery.zone.name,
        feeKobo: delivery.feeKobo,
        estimatedMinutes: delivery.estimatedMinutes,
      },
      subtotalKobo,
      subtotal: formatKobo(subtotalKobo),
      deliveryFeeKobo: delivery.feeKobo,
      deliveryFee: formatKobo(delivery.feeKobo),
      totalKobo: subtotalKobo + delivery.feeKobo,
      total: formatKobo(subtotalKobo + delivery.feeKobo),
      sides: sides.map((s) => ({ id: s.id, name: s.name, priceKobo: s.priceKobo })),
      sidesKobo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
