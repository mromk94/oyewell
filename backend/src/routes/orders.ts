import { Router } from 'express';
import { createOrder, serializeOrder } from '../lib/order.js';
import { resolveDelivery } from '../lib/delivery.js';
import { prisma } from '../prisma.js';
import { createOrderSchema } from '../lib/validation.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { afterOrderTransition } from '../lib/order-state.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/config.js';

const router = Router();

function getCustomerId(req: { headers: { authorization?: string } }): string | undefined {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return undefined;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return undefined;
  }
}

router.post('/', async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const customerId = getCustomerId(req);
    const result = await createOrder({ ...body, customerId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:orderNumber', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: {
        items: true,
        sides: true,
        payment: { include: { attempts: { orderBy: { createdAt: 'desc' }, take: 1 } } },
        deliveryZone: true,
        statusHistory: true,
        rider: { include: { location: true } },
      },
    });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (order.payment) {
      const method = await prisma.paymentMethodConfig.findFirst({
        where: { provider: order.payment.provider, enabled: true },
      });
      if (method) {
        (order.payment as any).method = method;
      }
    }
    res.json({ order: serializeOrder(order, 'CUSTOMER', true) });
  } catch (err) {
    next(err);
  }
});

router.post('/:orderNumber/switch-delivery-type', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { deliveryType } = req.body as { deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL' };
    if (!deliveryType) throw new ApiError(400, 'deliveryType is required');
    const order = await prisma.order.findUnique({ where: { orderNumber }, include: { deliveryZone: true } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.customerId !== req.user!.id && !req.user!.roles.includes('ADMIN')) throw new ApiError(403, 'Not authorized');
    if (['OUT_FOR_DELIVERY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new ApiError(400, 'Cannot switch delivery type at this stage');
    }
    const delivery = await resolveDelivery(order.address, order.subtotalKobo, deliveryType as any);
    if (!delivery || !delivery.available) throw new ApiError(400, 'Delivery type not available for this address');
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryType,
        deliveryFeeKobo: delivery.feeKobo,
        totalKobo: order.subtotalKobo + delivery.feeKobo,
        deliveryZoneId: delivery.zone?.id ?? order.deliveryZoneId,
        statusHistory: { create: { status: 'DELIVERY_TYPE_CHANGED', note: `Switched to ${deliveryType}`, actor: req.user!.email } },
      },
      include: { items: true, sides: true, payment: true, statusHistory: true, deliveryZone: true },
    });
    res.json({ order: serializeOrder(updated, 'CUSTOMER', true) });
  } catch (err) {
    next(err);
  }
});

router.post('/:orderNumber/cancel', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const user = req.user!;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { payment: true, statusHistory: true },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    const isCustomer = user.id === order.customerId;
    const isCook = user.roles.includes('COOK') && order.cookId ? await prisma.cookProfile.findFirst({ where: { id: order.cookId, userId: user.id } }) : null;
    const isRider = user.roles.includes('RIDER') && order.riderId ? await prisma.rider.findFirst({ where: { id: order.riderId, userId: user.id } }) : null;
    const isAdmin = user.roles.includes('ADMIN');
    if (!isCustomer && !isCook && !isRider && !isAdmin) throw new ApiError(403, 'Not authorized to cancel this order');
    if (order.status === 'CANCELLED') throw new ApiError(400, 'Order is already cancelled');
    if (order.status === 'DELIVERED') throw new ApiError(400, 'Delivered orders cannot be cancelled');
    const cancellableByCustomer = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COOK_ACCEPTED'];
    const cancellableByCook = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'COOK_ACCEPTED', 'PREPARING'];
    const cancellableByRider = ['OUT_FOR_DELIVERY'];
    const canCancel =
      (isCustomer && cancellableByCustomer.includes(order.status)) ||
      (isCook && cancellableByCook.includes(order.status)) ||
      (isRider && cancellableByRider.includes(order.status)) ||
      isAdmin;
    if (!canCancel) throw new ApiError(400, 'This order cannot be cancelled at its current stage');
    const refundKobo = order.paymentStatus === 'PAID' && order.payment ? order.payment.amountKobo : 0;
    const [updated] = await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : 'CANCELLED',
          riderFeeKobo: 0,
          statusHistory: { create: { status: 'CANCELLED', note: `Cancelled by ${isAdmin ? 'admin' : isCook ? 'cook' : isRider ? 'rider' : 'customer'}`, actor: user.email } },
        },
        include: { items: true, sides: true, payment: true, statusHistory: true },
      }),
      ...(order.customerId && refundKobo > 0
        ? [prisma.user.update({ where: { id: order.customerId }, data: { balanceKobo: { increment: refundKobo } } })]
        : []),
    ]);
    afterOrderTransition(updated as any, { actor: user.email, previousStatus: order.status, note: 'Order cancelled' });
    res.json({ order: serializeOrder(updated as any, 'CUSTOMER', true) });
  } catch (err) {
    next(err);
  }
});

export default router;
