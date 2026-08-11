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
    const { address, items, deliveryType, lat, lng } = body;

    let subtotalKobo = 0;
    const selectedSides = new Map<string, { id: string; name: string; priceKobo: number; count: number }>();
    const sourceIds: string[] = [];
    const providedCoords = lat != null && lng != null ? { lat, lng } : undefined;

    for (const item of items) {
      if ('cookListingId' in item) {
        const listing = await prisma.cookListing.findUnique({
          where: { id: item.cookListingId },
          include: { cook: { select: { id: true, profileStatus: true, kitchenStatus: true } } },
        });
        if (!listing || listing.status !== 'APPROVED' || !listing.isActive) {
          throw new ApiError(404, 'Cook listing not available');
        }
        if (listing.cook.profileStatus !== 'APPROVED' || listing.cook.kitchenStatus !== 'OPEN') {
          throw new ApiError(400, 'Cook kitchen is not open');
        }
        if (listing.stock < item.quantity) {
          throw new ApiError(400, 'Not enough stock');
        }
        sourceIds.push(listing.cookId ?? 'restaurant');
        subtotalKobo += listing.priceKobo * item.quantity;
        continue;
      }

      const food = await prisma.food.findUnique({
        where: { slug: item.foodSlug },
        include: { options: true, cook: { select: { id: true } } },
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

      sourceIds.push(food.cookId ?? 'restaurant');
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

    const delivery = await resolveDelivery(address, subtotalKobo, deliveryType, sourceIds, providedCoords);

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
      platformFeeKobo: delivery.platformFeeKobo ?? 0,
      platformFee: formatKobo(delivery.platformFeeKobo ?? 0),
      deliveryFeeKobo: delivery.feeKobo,
      deliveryFee: formatKobo(delivery.feeKobo),
      totalKobo: delivery.totalKobo ?? subtotalKobo + delivery.feeKobo,
      total: formatKobo(delivery.totalKobo ?? subtotalKobo + delivery.feeKobo),
      sides: Array.from(selectedSides.values()).map((s) => ({ id: s.id, name: s.name, priceKobo: s.priceKobo })),
      sidesKobo,
      lat: delivery.coords?.lat,
      lng: delivery.coords?.lng,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
