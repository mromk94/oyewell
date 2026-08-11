import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { requireAuth, requireRider, type AuthRequest } from '../middleware/auth.js';
import { serializeOrder } from '../lib/order.js';
import { isRiderEligibleForType } from '../lib/assignment.js';
import { validateLocation, haversineMeters } from '../lib/location.js';
import { ApiError } from '../lib/errors.js';
import { formatKobo } from '../lib/money.js';
import { emitEvent } from '../lib/realtime.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../lib/config.js';

const router = Router();

router.post('/apply', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { deliveryMode, vehicle, operatingArea, serviceRadiusMeters, onboardingData } = req.body as Record<string, any>;
    if (!deliveryMode || !['WALK', 'BICYCLE', 'MOTORCYCLE', 'CAR'].includes(String(deliveryMode))) {
      throw new ApiError(400, 'Valid delivery mode is required');
    }
    const radius = Number(serviceRadiusMeters) || 5000;

    const dataRecord = onboardingData && typeof onboardingData === 'object' ? onboardingData : {};
    await validateRiderOnboarding(dataRecord);

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
        kycStatus: dataRecord.idDocumentUrl || dataRecord.facePhotoUrl ? 'SUBMITTED' : 'NOT_STARTED',
        neighborhoodApproval: 'PENDING',
        professionalApproval: 'NOT_APPLIED',
        isActive: true,
        isApproved: false,
        onboardingData: dataRecord,
      },
      update: {
        vehicle: vehicle ? String(vehicle) : undefined,
        deliveryMode: String(deliveryMode) as any,
        operatingArea: operatingArea ? String(operatingArea) : undefined,
        serviceRadiusMeters: radius,
        kycStatus: dataRecord.idDocumentUrl || dataRecord.facePhotoUrl ? 'SUBMITTED' : 'NOT_STARTED',
        neighborhoodApproval: 'PENDING',
        onboardingData: dataRecord,
      },
    });
    res.status(201).json({ rider });
  } catch (e) {
    next(e);
  }
});

function isNigeria(record: Record<string, any>) {
  const raw = (record.country as string) ?? '';
  return /^(nigeria|ng|nig)$/i.test(raw.trim());
}

async function validateRiderOnboarding(record: Record<string, any>) {
  const fields = await prisma.riderOnboardingField.findMany({ where: { active: true }, orderBy: { order: 'asc' } });
  if (!fields.length) return; // no custom config yet, fall through to hard-coded defaults

  for (const f of fields) {
    if (!f.required) continue;
    const value = record[f.key];
    if (f.gatingRule) {
      const [gateKey, gateValue] = f.gatingRule.split('=');
      if (String(record[gateKey] ?? '') !== gateValue) continue;
    }
    if (value === undefined || value === null || value === '') {
      throw new ApiError(400, `${f.label} is required`);
    }
  }

  // Minimum hard-coded safety rules
  const hasId = record.idDocumentUrl || record.facePhotoUrl;
  if (!hasId) throw new ApiError(400, 'A government-issued ID or a clear face photo is required');
  if (isNigeria(record)) {
    if (!record.bvn && !record.nin) throw new ApiError(400, 'Nigerian riders must provide a BVN or NIN');
  }
}

router.get('/application', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    res.json({ rider });
  } catch (e) {
    next(e);
  }
});

router.get('/onboarding/fields', async (_req, res, next) => {
  try {
    const fields = await prisma.riderOnboardingField.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
    res.json({ fields });
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
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true, cookListing: { include: { cook: true } } },
    });
    const filtered = orders.filter((order) =>
      isRiderEligibleForType(rider, (order.deliveryType as any) ?? 'NEIGHBORHOOD'),
    );
    res.json({ orders: filtered.map((o) => serializeOrder(o, true)) });
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
      include: { items: true, sides: true, deliveryZone: true, statusHistory: true, cookListing: { include: { cook: true } } },
    });
    res.json({ orders: orders.map((o) => serializeOrder(o, true)) });
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
    res.json({ order: serializeOrder(updated, true) });
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

router.post('/orders/:orderNumber/pickup', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { code } = req.body as Record<string, string>;
    if (!code) throw new ApiError(400, 'Pickup code is required');
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { orderNumber, riderId: rider.id } });
      if (!order) throw new ApiError(404, 'Order not assigned to you');
      if (order.status !== 'OUT_FOR_DELIVERY') throw new ApiError(400, 'Order is not ready for pickup');
      if (!order.cookReadyAt) throw new ApiError(400, 'Cook has not marked the order ready yet');
      if (order.deliveryCode !== String(code)) throw new ApiError(400, 'Invalid pickup code');
      return await tx.order.update({
        where: { id: order.id },
        data: {
          riderStatus: 'PICKED_UP',
          statusHistory: {
            create: { status: 'PICKED_UP', note: `Picked up by ${rider.id}`, actor: req.user!.email },
          },
        },
        include: { items: true, sides: true, deliveryZone: true, statusHistory: true },
      });
    });
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      riderStatus: updated.riderStatus,
    });
    res.json({ order: serializeOrder(updated, true) });
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
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      riderStatus: updated.riderStatus,
      deliveredAt: updated.deliveredAt,
    });
    res.json({ order: serializeOrder(updated, true) });
  } catch (e) {
    next(e);
  }
});

router.post('/location', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body as Record<string, any>;
    const point = validateLocation({ lat: latitude, lng: longitude, accuracy: accuracy != null ? Number(accuracy) : undefined });
    if (!point) throw new ApiError(400, 'latitude, longitude and accuracy must be valid');
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    if (!rider.available || rider.operationalStatus !== 'ONLINE') {
      throw new ApiError(409, 'Go online and set yourself as available before reporting location');
    }

    const existing = await prisma.riderLocation.findUnique({ where: { riderId: rider.id } });
    if (existing) {
      const distanceM = haversineMeters({ lat: existing.latitude, lng: existing.longitude }, point);
      const timeMs = Date.now() - existing.updatedAt.getTime();
      if (timeMs > 0) {
        const speedMps = distanceM / (timeMs / 1000);
        if (speedMps > 50) {
          throw new ApiError(400, 'Location update rejected: unrealistic movement');
        }
      }
    }

    const location = await prisma.riderLocation.upsert({
      where: { riderId: rider.id },
      create: { riderId: rider.id, latitude: point.lat, longitude: point.lng, accuracy: point.accuracy },
      update: { latitude: point.lat, longitude: point.lng, accuracy: point.accuracy },
    });
    emitEvent('rider:location', {
      riderId: rider.id,
      lat: point.lat,
      lng: point.lng,
      updatedAt: location.updatedAt,
    });
    res.json({ location: { ...location, accuracy: accuracy != null ? Number(accuracy) : undefined } });
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

router.get('/payouts', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const payouts = await prisma.riderPayoutRequest.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ payouts });
  } catch (e) {
    next(e);
  }
});

router.post('/withdraw', requireAuth, requireRider, async (req: AuthRequest, res, next) => {
  try {
    const { idempotencyKey } = req.body as { idempotencyKey?: string };
    const rider = await prisma.rider.findUnique({ where: { userId: req.user!.id } });
    if (!rider) throw new ApiError(404, 'Rider not found');
    if (idempotencyKey) {
      const existing = await prisma.riderPayoutRequest.findUnique({ where: { idempotencyKey } });
      if (existing) return res.json({ payout: existing });
    }
    const [delivered, paid] = await Promise.all([
      prisma.order.aggregate({ where: { riderId: rider.id, status: 'DELIVERED' }, _sum: { riderFeeKobo: true } }),
      prisma.order.aggregate({ where: { riderId: rider.id, status: 'DELIVERED', riderPaid: true }, _sum: { riderFeeKobo: true } }),
    ]);
    const total = delivered._sum.riderFeeKobo || 0;
    const paidOut = paid._sum.riderFeeKobo || 0;
    const pending = total - paidOut;
    if (pending <= 0) throw new ApiError(400, 'No pending earnings to withdraw');
    const existing = await prisma.riderPayoutRequest.findFirst({
      where: { riderId: rider.id, status: 'PENDING' },
    });
    if (existing) throw new ApiError(400, 'You already have a pending withdrawal request');
    const payout = await prisma.riderPayoutRequest.create({
      data: { riderId: rider.id, amountKobo: pending, status: 'PENDING', idempotencyKey: idempotencyKey || undefined },
    });
    res.json({ payout });
  } catch (e) {
    next(e);
  }
});

export default router;
