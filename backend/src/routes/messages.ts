import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber, content } = req.body as { orderNumber?: string; content?: string };
    if (!orderNumber || !content?.trim()) throw new ApiError(400, 'orderNumber and content required');

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { customer: true, cook: { include: { user: true } }, rider: { include: { user: true } } },
    });
    if (!order) throw new ApiError(404, 'Order not found');

    const userId = req.user!.id;
    const recipient =
      userId === order.customerId
        ? order.cook?.userId ?? order.rider?.userId
        : userId === order.cook?.userId
          ? order.customerId
          : userId === order.rider?.userId
            ? order.customerId
            : null;

    if (!recipient) throw new ApiError(403, 'You cannot message on this order');

    const message = await prisma.message.create({
      data: {
        orderId: order.id,
        senderId: userId,
        recipientId: recipient,
        content: content.trim(),
      },
    });
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
});

router.get('/:orderNumber', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new ApiError(404, 'Order not found');
    const userId = req.user!.id;
    const allowed = [order.customerId, order.cookId, order.riderId].filter(Boolean);
    if (!allowed.includes(userId)) throw new ApiError(403, 'Access denied');

    const messages = await prisma.message.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

export default router;
