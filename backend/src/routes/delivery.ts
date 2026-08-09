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
    const { address, items } = body;

    let subtotalKobo = 0;
    const selectedSides = new Map<string, { id: string; name: string; priceKobo: number; count: number }>();

    for (const item of items) {
      const food = await prisma.food.findUnique({
        where: { slug: item.foodSlug },
        include: { options: true },
      });

      if (!food || food.status !== 'PUBLISHED' || !food.isAvailable) {
        throw new ApiError(404, 'Food not available');
      }

      const option = food.options.find((o) => o.id === item.optionId);
      if (!option) {
        throw new ApiError(400, 'Option not found');
      }

      if (item.quantity < 1 || (option.stock !== null && item.quantity > option.stock)) {
        throw new ApiError(400, 'Invalid quantity');
      }

      subtotalKobo += option.priceKobo * item.quantity;

      if (item.sideIds.length) {
        const sides = await prisma.side.findMany({
          where: { id: { in: item.sideIds }, isAvailable: true },
        });
        for (const side of sides) {
          subtotalKobo += side.priceKobo * item.quantity;
          const existing = selectedSides.get(side.id);
          if (existing) {
            existing.count += item.quantity;
          } else {
            selectedSides.set(side.id, { id: side.id, name: side.name, priceKobo: side.priceKobo, count: item.quantity });
          }
        }
      }
    }

    const delivery = await resolveDelivery(address, subtotalKobo);

    if (!delivery || !delivery.available) {
      res.json({
        available: false,
        message: delivery?.reason ?? "Sorry, we don't currently deliver to this location.",
      });
      return;
    }

    const sidesKobo = Array.from(selectedSides.values()).reduce((sum, s) => sum + s.priceKobo * s.count, 0);

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
      sides: Array.from(selectedSides.values()).map((s) => ({ id: s.id, name: s.name, priceKobo: s.priceKobo })),
      sidesKobo,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
