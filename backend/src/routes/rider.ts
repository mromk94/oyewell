import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { requireAuth, requireRider, type AuthRequest } from '../middleware/auth.js';
import { serializeOrder } from '../lib/order.js';
import { isRiderEligibleForType } from '../lib/assignment.js';
import { ApiError } from '../lib/errors.js';
import { formatKobo } from '../lib/money.js';
import { emitEvent } from '../lib/realtime.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as any;
const router = Router();

router.post('/apply', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { deliveryMode, vehicle, operatingArea, serviceRadiusMeters, kycSubmitted } = req.body as Record<string, unknown>;
    if (!deliveryMode || !['WALK', 'BICYCLE', 'MOTORCYCLE', 'CAR'].includes(String(deliveryMode))) {
      throw new ApiError(400, 'Valid delivery mode is required');
    }
    const radius = Number(serviceRadiusMeters) || 5000;
    const existing = await prisma.rider.findUnique({ where: { userId } });
    if (existing && ['APPROVED', 'PENDING'].includes(existing.neighborhoodApproval)) {
      throw new ApiError(409, 'You have already applied or are already approved');
    }
    const rider = await prisma.rider.upsert({
      where: { userId },
      create: {
        userId,
        vehicle: vehicle ? String(vehicle) : undefined,
        deliveryMode: String(deliveryMode) as any,
        operatingArea: operatingArea ? String(operatingArea) : undefined,
        serviceRadiusMeters: radius,
        kycStatus: kycSubmitted ? 'SUBMITTED' : 'NOT_STARTED',
        neighborhoodApproval: 'PENDING',
        professionalApproval: 'NOT_APPLIED',
        isActive: true,
        isApproved: false,
      },
      update: {
        vehicle: vehicle ? String(vehicle) : undefined,
        deliveryMode: String(deliveryMode) as any,
        operatingArea: operatingArea ? String(operatingArea) : undefined,
        serviceRadiusMeters: radius,
        kycStatus: kycSubmitted ? 'SUBMITTED' : 'NOT_STARTED',
        neighborhoodApproval: 'PENDING',
      },
    });
    res.status(201).json({ rider });
  } catch (e) {
    next(e);
  }
});

router.get('/application', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    res.json({ rider });
  } catch (e) {
    next(e);
  }
});

router.post('/professional/apply', requireRider, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { documents, preferredDate, vehicle, deliveryMode } = req.body as Record<string, unknown>;
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new ApiError(400, 'At least one document is required');
    }
    const mode = ['WALK', 'BICYCLE', 'MOTORCYCLE', 'CAR'].includes(String(deliveryMode)) ? String(deliveryMode) : undefined;
    const scheduledAt = preferredDate ? new Date(String(preferredDate)) : null;

    const rider = await prisma.$transaction(async (tx) => {
      const current = await tx.rider.findUnique({ where: { userId } });
      if (!current) throw new ApiError(404, 'Rider not found');
      if (current.professionalApproval === 'APPROVED') throw new ApiError(409, 'Already a professional partner');
      if (current.professionalApproval === 'PENDING') throw new ApiError(409, 'Professional upgrade already requested');

      const updated = await tx.rider.update({
        where: { userId },
        data: {
          professionalApproval: 'PENDING',
          professionalUpgradeStatus: 'PENDING_INSPECTION',
          vehicle: vehicle ? String(vehicle) : undefined,
          deliveryMode: mode as any,
        },
      });

      await tx.riderInspection.create({
        data: {
          riderId: updated.id,
          scheduledAt,
          result: 'PENDING',
          photos: documents.filter((d) => typeof d === 'string') as string[],
          notes: 'Professional upgrade inspection requested',
        },
      });

      return updated;
    });

    res.json({ rider });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as Record<string, string>;
    if (!email || !password) throw new ApiError(400, 'Email and password are required');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== 'RIDER' || !bcrypt.compareSync(password, user.password)) {
      throw new ApiError(401, 'Invalid credentials');
    }
    const rider = await prisma.rider.findUnique({ where: { userId: user.id } });
    if (!rider || !rider.isApproved) {
      throw new ApiError(403, 'Your rider registration is pending admin approval');
    }
    const roles = user.roles.length ? user.roles : [user.role];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, roles }, JWT_SECRET, {
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
          roles,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, vehicle, bankName, bankAccountName, bankAccountNumber } = req.body as Record<string, string>;
    if (!email || !password) throw new ApiError(400, 'Email and password are required');
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'Email already in use');
    const hashed = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, phone, role: 'RIDER', roles: ['RIDER'] },
    });
    const rider = await prisma.rider.create({
      data: { userId: user.id, vehicle, bankName, bankAccountName, bankAccountNumber, isApproved: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.', rider });
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

router.put('/me/availability', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { available } = req.body as { available?: boolean };
    if (typeof available !== 'boolean') throw new ApiError(400, 'available must be a boolean');
    const rider = await prisma.rider.update({
      where: { userId: req.user!.id },
      data: { available },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ rider });
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

router.get('/available', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    if (!rider.isApproved || !rider.isActive || !rider.available) {
      throw new ApiError(403, 'You are not currently eligible to accept deliveries');
    }
    const orders = await prisma.order.findMany({
      where: {
        riderId: null,
        paymentStatus: 'SUCCESS',
        status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'READY_FOR_DISPATCH'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
    });
    const filtered = orders.filter((order) =>
      isRiderEligibleForType(rider, (order.deliveryType as any) ?? 'NEIGHBORHOOD'),
    );
    res.json({ orders: filtered.map(serializeOrder) });
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

router.post('/orders/:orderNumber/claim', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (!isRiderEligibleForType(rider, (order.deliveryType as any) ?? 'NEIGHBORHOOD')) {
      throw new ApiError(403, 'You are not eligible for this delivery tier');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderNumber },
        include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
      });
      if (!order) throw new ApiError(404, 'Order not found');
      if (order.riderId) throw new ApiError(409, 'Order already assigned');
      if (order.paymentStatus !== 'SUCCESS') throw new ApiError(400, 'Order not paid');
      if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
        throw new ApiError(400, 'Order already delivered or cancelled');
      }
      const claimed = await tx.order.update({
        where: { id: order.id, riderId: null },
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
      return claimed;
    }, { isolationLevel: 'Serializable' });

    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      riderStatus: updated.riderStatus,
      riderId: updated.riderId,
    });
    res.json({ order: serializeOrder(updated) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        next(new ApiError(409, 'This delivery has already been claimed by another partner'));
        return;
      }
    }
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
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      riderStatus: updated.riderStatus,
      deliveredAt: updated.deliveredAt,
    });
    res.json({ order: serializeOrder(updated) });
  } catch (e) {
    next(e);
  }
});

router.post('/location', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { latitude, longitude } = req.body as { latitude?: number; longitude?: number };
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new ApiError(400, 'latitude and longitude are required');
    }
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const location = await prisma.riderLocation.upsert({
      where: { riderId: rider.id },
      create: { riderId: rider.id, latitude, longitude },
      update: { latitude, longitude },
    });
    res.json({ location });
  } catch (e) {
    next(e);
  }
});

router.get('/me/location', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const location = await prisma.riderLocation.findUnique({ where: { riderId: rider.id } });
    res.json({ location });
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
