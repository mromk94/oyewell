import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber, rating, comment, target } = req.body as { orderNumber?: string; rating?: number; comment?: string; target?: 'cook' | 'rider' };
    if (!orderNumber) throw new ApiError(400, 'orderNumber is required');
    if (typeof rating !== 'number' || rating < 1 || rating > 5) throw new ApiError(400, 'rating must be 1-5');

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { customer: true, review: true },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.customerId !== req.user!.id) throw new ApiError(403, 'You can only review your own orders');
    if (order.status !== 'DELIVERED') throw new ApiError(400, 'You can only review delivered orders');
    if (order.review) throw new ApiError(409, 'Order already reviewed');

    const cookId = target === 'cook' ? order.cookId : undefined;
    const listingId = target === 'cook' ? order.cookListingId : undefined;
    const riderId = target === 'rider' ? order.riderId : undefined;

    if (!cookId && !riderId && !listingId) {
      throw new ApiError(400, 'No review target available for this order');
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        customerId: req.user!.id,
        cookId,
        listingId,
        riderId,
        rating,
        comment: comment?.trim() || undefined,
      },
    });

    if (cookId) {
      const stats = await prisma.review.aggregate({
        where: { cookId },
        _avg: { rating: true },
        _count: { rating: true },
      });
      await prisma.cookProfile.update({
        where: { id: cookId },
        data: { rating: stats._avg.rating ?? 0 },
      });
    }

    res.json({ review });
  } catch (err) {
    next(err);
  }
});

router.get('/cook/:cookId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { cookId: req.params.cookId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

router.get('/listing/:listingId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { listingId: req.params.listingId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

export default router;
