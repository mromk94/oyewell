import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { requireAuth, requireRider, type AuthRequest } from '../middleware/auth.js';
import { serializeOrder } from '../lib/order.js';
import { ApiError } from '../lib/errors.js';
import { formatKobo } from '../lib/money.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as any;
const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as Record<string, string>;
    if (!email || !password) throw new ApiError(400, 'Email and password are required');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'RIDER' || !bcrypt.compareSync(password, user.password)) {
      throw new ApiError(401, 'Invalid credentials');
    }
    const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({
      token,
      rider: {
        ...rider,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { rider: true },
    });
    if (!user) throw new ApiError(404, 'User not found');
    res.json({
      rider: user.rider,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.put('/me', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { vehicle, bankName, bankAccountName, bankAccountNumber } = (req.body || {}) as Record<string, string>;
    const rider = await prisma.rider.update({
      where: { userId: req.user!.id },
      data: { vehicle, bankName, bankAccountName, bankAccountNumber },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });
    res.json({ rider });
  } catch (e) {
    next(e);
  }
});

router.get('/orders', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const orders = await prisma.order.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
    });
    res.json({ orders: orders.map(serializeOrder) });
  } catch (e) {
    next(e);
  }
});

router.get('/available', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        riderId: null,
        paymentStatus: 'SUCCESS',
        status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
    });
    res.json({ orders: orders.map(serializeOrder) });
  } catch (e) {
    next(e);
  }
});

router.post('/orders/:orderNumber/claim', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.riderId) throw new ApiError(409, 'Order already assigned');
    if (order.paymentStatus !== 'SUCCESS') throw new ApiError(400, 'Order not paid');
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new ApiError(400, 'Order already delivered or cancelled');
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        riderId: rider.id,
        riderStatus: 'ASSIGNED',
        status: 'OUT_FOR_DELIVERY',
        statusHistory: {
          create: { status: 'OUT_FOR_DELIVERY', note: `Assigned to rider ${rider.id}`, actor: req.user!.email },
        },
      },
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
    });
    res.json({ order: serializeOrder(updated) });
  } catch (e) {
    next(e);
  }
});

router.post('/orders/:orderNumber/verify', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { code } = req.body as Record<string, string>;
    if (!code) throw new ApiError(400, 'Delivery code is required');
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const order = await prisma.order.findFirst({ where: { orderNumber, riderId: rider.id } });
    if (!order) throw new ApiError(404, 'Order not found or not assigned to you');
    if (order.deliveryCode !== String(code)) throw new ApiError(400, 'Invalid delivery code');
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'DELIVERED',
        riderStatus: 'DELIVERED',
        deliveredAt: new Date(),
        deliveredCodeVerifiedAt: new Date(),
        statusHistory: {
          create: { status: 'DELIVERED', note: 'Delivery code verified', actor: req.user!.email },
        },
      },
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
    });
    res.json({ order: serializeOrder(updated) });
  } catch (e) {
    next(e);
  }
});

router.get('/earnings', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const [delivered, paid] = await Promise.all([
      prisma.order.aggregate({
        where: { riderId: rider.id, status: 'DELIVERED' },
        _sum: { riderFeeKobo: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { riderId: rider.id, status: 'DELIVERED', riderPaid: true },
        _sum: { riderFeeKobo: true },
      }),
    ]);
    const total = delivered._sum.riderFeeKobo || 0;
    const paidOut = paid._sum.riderFeeKobo || 0;
    res.json({
      totalDelivered: delivered._count._all,
      totalEarnings: formatKobo(total),
      paidOut: formatKobo(paidOut),
      pendingPayout: formatKobo(total - paidOut),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
