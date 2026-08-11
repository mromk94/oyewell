import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { applyMapSettingsFromDB } from '../lib/map-settings.js';
import { cache } from '../lib/cache.js';
import { logAudit } from '../lib/audit.js';
import { dispatchOrder, findEligibleRiders } from '../lib/assignment.js';
import { isLocationFresh } from '../lib/location.js';
import { emitEvent } from '../lib/realtime.js';
import bcrypt from 'bcryptjs';
import { createApproval } from '../lib/approval.js';
import { getEmailConfig, saveEmailConfig, sendEmail, sendOrderStatusEmail } from '../lib/email.js';

const router = Router();

router.use(requireAuth, requireAdmin);

const DASHBOARD_CACHE_KEY = 'admin:dashboard';
const DASHBOARD_TTL = 15;

router.get('/dashboard', async (_req, res, next) => {
  try {
    const data = await cache.getOrSet(
      DASHBOARD_CACHE_KEY,
      async () => {
        const [active, newOrders, preparing, outForDelivery, completed, revenueAgg, foods, popularItems, ridersOnline, ordersByZone] = await Promise.all([
          prisma.order.count({
            where: { status: { in: ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'] } },
          }),
          prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
          prisma.order.count({ where: { status: 'PREPARING' } }),
          prisma.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
          prisma.order.count({ where: { status: 'DELIVERED' } }),
          prisma.order.aggregate({
            where: { paymentStatus: 'PAID' },
            _sum: { totalKobo: true },
          }),
          prisma.food.findMany({
            where: { status: 'PUBLISHED' },
            include: { _count: { select: { options: true } } },
          }),
          prisma.orderItem.groupBy({
            by: ['foodName'],
            _count: { id: true },
            take: 5,
            orderBy: { _count: { id: 'desc' } },
          }),
          prisma.rider.count({ where: { isApproved: true, isActive: true, available: true, operationalStatus: 'ONLINE' } }),
          prisma.order.groupBy({
            by: ['deliveryZoneId'],
            where: { status: 'OUT_FOR_DELIVERY' },
            _count: { id: true },
          }),
        ]);

        return {
          active,
          new: newOrders,
          preparing,
          outForDelivery,
          completed,
          revenueKobo: revenueAgg._sum?.totalKobo ?? 0,
          lowStockFoods: foods.filter((f) => f._count.options < 1),
          popularItems,
          ridersOnline,
          ordersByZone,
        };
      },
      { ttlSeconds: DASHBOARD_TTL, jitter: true },
    );
    res.setHeader('Cache-Control', `private, max-age=${DASHBOARD_TTL}, stale-while-revalidate=${DASHBOARD_TTL}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/foods', async (_req, res, next) => {
  try {
    const foods = await prisma.food.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { displayOrder: 'asc' },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });
    res.json({ foods });
  } catch (err) {
    next(err);
  }
});

router.post('/foods', async (req: AuthRequest, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { name, slug, description, heroImage, galleryImages, videos, orderingMode, options } = body;
    if (!name || !slug) throw new ApiError(400, 'Name and slug required');

    const food = await prisma.food.create({
      data: {
        name: String(name),
        slug: String(slug),
        description: description ? String(description) : undefined,
        heroImage: heroImage ? String(heroImage) : undefined,
        galleryImages: Array.isArray(galleryImages) ? galleryImages.map(String) : [],
        videos: Array.isArray(videos) ? videos.map(String) : [],
        orderingMode: String(orderingMode) as 'PLATE' | 'PORTION' | 'PIECE',
        status: 'DRAFT',
        options: {
          create: ((options as any[]) ?? []).map((o: any, i: number) => ({
            label: String(o.label),
            value: o.value ? String(o.value) : undefined,
            priceKobo: Number(o.priceKobo),
            stock: o.stock !== undefined ? Number(o.stock) : null,
            displayOrder: i,
          })),
        },
      },
      include: { options: true },
    });
    await Promise.all([cache.del('foods:public'), cache.delPattern('foods:slug:')]);
    res.status(201).json({ food });
  } catch (err) {
    next(err);
  }
});

router.patch('/foods/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.slug !== undefined) data.slug = String(body.slug);
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.heroImage !== undefined) data.heroImage = body.heroImage ? String(body.heroImage) : null;
    if (body.galleryImages !== undefined) data.galleryImages = Array.isArray(body.galleryImages) ? body.galleryImages.map(String) : [];
    if (body.videos !== undefined) data.videos = Array.isArray(body.videos) ? body.videos.map(String) : [];
    if (body.orderingMode !== undefined) data.orderingMode = String(body.orderingMode) as any;
    if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);
    if (body.featured !== undefined) data.featured = Boolean(body.featured);
    if (body.status !== undefined) data.status = String(body.status) as any;
    if (body.displayOrder !== undefined) data.displayOrder = Number(body.displayOrder);

    if (Array.isArray(body.options)) {
      data.options = {
        deleteMany: {},
        create: (body.options as any[]).map((o: any, i: number) => ({
          label: String(o.label ?? ''),
          value: o.value ? String(o.value) : null,
          priceKobo: Number(o.priceKobo),
          stock: o.stock !== undefined && o.stock !== null ? Number(o.stock) : null,
          isAvailable: o.isAvailable !== undefined ? Boolean(o.isAvailable) : true,
          displayOrder: i,
        })),
      };
    }

    const food = await prisma.food.update({
      where: { id },
      data,
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });
    await Promise.all([cache.del('foods:public'), cache.del(`foods:slug:${food.slug}`), cache.delPattern('foods:slug:')]);
    res.json({ food });
  } catch (err) {
    next(err);
  }
});

router.delete('/foods/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const food = await prisma.food.update({
      where: { id },
      data: { status: 'ARCHIVED', isAvailable: false },
    });
    await Promise.all([cache.del('foods:public'), cache.del(`foods:slug:${food.slug}`), cache.delPattern('foods:slug:')]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { take: 10 },
          sides: { take: 10 },
          deliveryZone: true,
          rider: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } } },
          payment: {
            include: {
              attempts: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      }),
      prisma.order.count(),
    ]);
    res.json({ orders, total, skip, limit });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };
    if (!status) throw new ApiError(400, 'Status required');

    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status },
        include: { customer: true },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          actor: `admin:${req.user!.email}`,
          note: 'Status updated from admin dashboard',
        },
      });
      return updated;
    });
    sendOrderStatusEmail(order).catch(() => {});
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/verify-payment', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { accepted, note } = req.body as { accepted?: boolean; note?: string };
    if (typeof accepted !== 'boolean') throw new ApiError(400, 'accepted boolean required');

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { payment: true },
      });
      if (!order || !order.payment) throw new ApiError(404, 'Order or payment not found');

      const paymentStatus = accepted ? 'SUCCESS' : 'FAILED';
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: paymentStatus },
      });
      await tx.paymentAttempt.create({
        data: {
          paymentId: order.payment.id,
          status: paymentStatus,
          providerRef: 'admin-verification',
          payload: { note: note ?? '', actor: req.user!.email },
        },
      });

      const newOrderStatus = accepted ? 'CONFIRMED' : 'CANCELLED';
      const newPaymentStatus = accepted ? 'PAID' : 'FAILED';
      const updated = await tx.order.update({
        where: { id },
        data: { status: newOrderStatus, paymentStatus: newPaymentStatus },
        include: { customer: true },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: newOrderStatus,
          actor: `admin:${req.user!.email}`,
          note: `Payment ${accepted ? 'accepted' : 'rejected'}. ${note ?? ''}`,
        },
      });
      return updated;
    });
    sendOrderStatusEmail(result).catch(() => {});
    res.json({ ok: true, order: result });
  } catch (err) {
    next(err);
  }
});

router.get('/delivery-zones', async (_req, res, next) => {
  try {
    const zones = await prisma.deliveryZone.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            orders: { where: { status: { in: ['PAID', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'PICKED_UP'] } } },
          },
        },
      },
    });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

router.post('/delivery-zones', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const zone = await prisma.deliveryZone.create({
      data: {
        name: String(body.name),
        type: String(body.type) as any,
        boundary: body.boundary as any,
        feeKobo: Number(body.feeKobo),
        minOrderKobo: body.minOrderKobo !== undefined ? Number(body.minOrderKobo) : null,
        estimatedMinutes: body.estimatedMinutes !== undefined ? Number(body.estimatedMinutes) : null,
      },
    });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
});

router.delete('/delivery-zones/:id', async (req, res, next) => {
  try {
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/payment-methods', async (_req, res, next) => {
  try {
    const methods = await prisma.paymentMethodConfig.findMany({ orderBy: { name: 'asc' } });
    res.json({ methods });
  } catch (err) {
    next(err);
  }
});

router.post('/payment-methods', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.name || !body.provider) throw new ApiError(400, 'Name and provider are required');
    const method = await prisma.paymentMethodConfig.create({
      data: {
        name: String(body.name),
        provider: String(body.provider),
        publicKey: body.publicKey ? String(body.publicKey) : null,
        config: body.config !== undefined ? (body.config as any) : null,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : false,
      },
    });
    await cache.del('payments:methods:public');
    res.status(201).json({ method });
  } catch (err) {
    next(err);
  }
});

router.put('/payment-methods/:id', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.provider !== undefined) data.provider = String(body.provider);
    if (body.publicKey !== undefined) data.publicKey = body.publicKey ? String(body.publicKey) : null;
    if (body.config !== undefined) data.config = body.config as any;
    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);

    const method = await prisma.paymentMethodConfig.update({
      where: { id: req.params.id },
      data,
    });
    await cache.del('payments:methods:public');
    res.json({ method });
  } catch (err) {
    next(err);
  }
});

router.delete('/payment-methods/:id', async (req, res, next) => {
  try {
    await prisma.paymentMethodConfig.delete({ where: { id: req.params.id } });
    await cache.del('payments:methods:public');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const SETTINGS_CACHE_KEY = 'admin:settings';
const SETTINGS_TTL = 60;

router.get('/settings', async (_req, res, next) => {
  try {
    const data = await cache.getOrSet(SETTINGS_CACHE_KEY, async () => {
      const setting = await prisma.restaurantSetting.findFirst();
      return { settings: setting };
    }, { ttlSeconds: SETTINGS_TTL, jitter: true });
    res.setHeader('Cache-Control', `public, max-age=${SETTINGS_TTL}, stale-while-revalidate=${SETTINGS_TTL}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const existing = await prisma.restaurantSetting.findFirst();
    const data: any = {};
    if (body.name !== undefined) data.name = String(body.name);
    if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone ? String(body.contactPhone) : null;
    if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail ? String(body.contactEmail) : null;
    if (body.latitude !== undefined) data.latitude = body.latitude === null || body.latitude === '' ? null : Number(body.latitude);
    if (body.longitude !== undefined) data.longitude = body.longitude === null || body.longitude === '' ? null : Number(body.longitude);
    if (body.mapSettings !== undefined) {
      data.mapSettings = typeof body.mapSettings === 'object' ? (body.mapSettings as Record<string, unknown>) : {};
    }

    const setting = await prisma.restaurantSetting.upsert({
      where: { id: existing?.id ?? 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
    await applyMapSettingsFromDB();
    await cache.del(SETTINGS_CACHE_KEY);
    res.json({ settings: setting });
  } catch (err) {
    next(err);
  }
});

router.get('/sides', async (_req, res, next) => {
  try {
    const sides = await prisma.side.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ sides });
  } catch (err) {
    next(err);
  }
});

router.post('/sides', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const side = await prisma.side.create({
      data: {
        name: String(body.name),
        description: body.description ? String(body.description) : undefined,
        priceKobo: Number(body.priceKobo),
        isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : true,
      },
    });
    res.status(201).json({ side });
  } catch (err) {
    next(err);
  }
});

router.patch('/sides/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;
    const side = await prisma.side.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name) : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
        priceKobo: body.priceKobo !== undefined ? Number(body.priceKobo) : undefined,
        isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : undefined,
      },
    });
    res.json({ side });
  } catch (err) {
    next(err);
  }
});

router.delete('/sides/:id', async (req, res, next) => {
  try {
    await prisma.side.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/customers', async (_req, res, next) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
    });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

router.patch('/customers/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role?: string };
    if (!role || !['CUSTOMER', 'ADMIN'].includes(role)) {
      throw new ApiError(400, 'Valid role (CUSTOMER or ADMIN) required');
    }
    const user = await prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/customers/:id/orders', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payment: true },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/email-config', async (_req, res, next) => {
  try {
    const config = await getEmailConfig();
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

router.put('/email-config', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data = {
      host: String(body.host ?? ''),
      port: Number(body.port ?? 587),
      secure: Boolean(body.secure ?? false),
      user: String(body.user ?? ''),
      pass: String(body.pass ?? ''),
      from: String(body.from ?? ''),
      enabled: Boolean(body.enabled ?? false),
    };
    const config = await saveEmailConfig(data);
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

router.post('/email-config/test', async (req, res, next) => {
  try {
    const { to, subject, text } = req.body as Record<string, string>;
    if (!to || !subject || !text) throw new ApiError(400, 'to, subject and text are required');
    const result = await sendEmail({ to, subject, text });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/riders/locations', async (_req, res, next) => {
  try {
    const riders = await prisma.rider.findMany({
      where: { isApproved: true, isActive: true, available: true, operationalStatus: 'ONLINE' },
      include: { user: { select: { id: true, firstName: true, lastName: true } }, location: true },
    });
    res.json({
      riders: riders
        .filter((r) => r.location && isLocationFresh(r.location.updatedAt))
        .map((r) => ({
          id: r.id,
          name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
          lat: r.location!.latitude,
          lng: r.location!.longitude,
          updatedAt: r.location!.updatedAt,
        })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/riders', async (_req, res, next) => {
  try {
    const riders = await prisma.rider.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ riders });
  } catch (err) {
    next(err);
  }
});

router.get('/riders/pending', async (_req, res, next) => {
  try {
    const riders = await prisma.rider.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ riders });
  } catch (err) {
    next(err);
  }
});

router.post('/riders/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body as Record<string, any>;
    const rider = await prisma.$transaction(async (tx) => {
      const current = await tx.rider.findUnique({ where: { id }, include: { user: true } });
      if (!current) throw new ApiError(404, 'Rider not found');
      const roles = Array.from(new Set([...current.user.roles, 'RIDER']));
      const [, updatedRider] = await Promise.all([
        tx.user.update({
          where: { id: current.userId },
          data: { role: 'RIDER', roles: { set: roles } },
        }),
        tx.rider.update({
          where: { id },
          data: { isApproved: true, isActive: true, neighborhoodApproval: 'APPROVED' },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
        }),
      ]);
      return updatedRider;
    });
    await createApproval({
      type: 'RIDER',
      targetId: rider.id,
      targetType: 'Rider',
      submittedBy: rider.userId,
      data: { decision: 'APPROVED' },
      note,
    });
    await logAudit({
      actorId: (req as AuthRequest).user!.id,
      action: 'RIDER_APPROVED',
      targetId: rider.id,
      targetType: 'Rider',
      reason: note,
      newState: { isApproved: true, isActive: true, neighborhoodApproval: 'APPROVED' },
      ip: req.ip ?? undefined,
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/riders/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as Record<string, any>;
    const rider = await prisma.$transaction(async (tx) => {
      const current = await tx.rider.findUnique({ where: { id }, include: { user: true } });
      if (!current) throw new ApiError(404, 'Rider not found');
      const newRoles = current.user.roles.filter((r) => r !== 'RIDER');
      if (newRoles.length === 0) newRoles.push('CUSTOMER');
      const newRole = newRoles.includes('ADMIN') ? 'ADMIN' : 'CUSTOMER';
      const rolesSet = Array.from(new Set(newRoles));
      const previousData = current.onboardingData && typeof current.onboardingData === 'object' ? (current.onboardingData as Record<string, any>) : {};
      const updatedOnboardingData = { ...previousData, __rejectionReason: reason || null, __rejectedAt: new Date().toISOString() };
      const [, updatedRider] = await Promise.all([
        tx.user.update({
          where: { id: current.userId },
          data: { role: newRole as any, roles: { set: rolesSet } },
        }),
        tx.rider.update({
          where: { id },
          data: { isApproved: false, isActive: false, neighborhoodApproval: 'REJECTED', onboardingData: updatedOnboardingData },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
        }),
      ]);
      return updatedRider;
    });
    await createApproval({
      type: 'RIDER',
      targetId: rider.id,
      targetType: 'Rider',
      submittedBy: rider.userId,
      data: { decision: 'REJECTED' },
      note: reason,
    });
    await logAudit({
      actorId: (req as AuthRequest).user!.id,
      action: 'RIDER_REJECTED',
      targetId: rider.id,
      targetType: 'Rider',
      reason,
      newState: { isApproved: false, isActive: false, neighborhoodApproval: 'REJECTED' },
      ip: req.ip ?? undefined,
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/riders/:id/pause', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rider = await prisma.rider.update({
      where: { id },
      data: { isActive: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/riders/:id/suspend', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rider = await prisma.rider.update({
      where: { id },
      data: { isActive: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/riders/:id/ban', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rider = await prisma.rider.update({
      where: { id },
      data: { isApproved: false, isActive: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/riders/:id/restore', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rider = await prisma.rider.update({
      where: { id },
      data: { isActive: true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/riders', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, vehicle, bankName, bankAccountName, bankAccountNumber } = req.body as Record<string, string>;
    if (!email || !password) throw new ApiError(400, 'Email and password are required');
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'Email already in use');
    const hashed = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, phone, role: 'RIDER' },
    });
    const rider = await prisma.rider.create({
      data: { userId: user.id, vehicle, bankName, bankAccountName, bankAccountNumber },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:orderNumber/assign-rider', async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { riderId, riderFeeKobo } = req.body as { riderId?: string; riderFeeKobo?: number };
    if (!riderId) throw new ApiError(400, 'riderId is required');
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { rider: { include: { user: { select: { email: true } } } } },
    });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new ApiError(400, 'Cannot assign a delivered or cancelled order');
    }
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    if (!rider || !rider.isApproved) throw new ApiError(400, 'Rider not found or not approved');

    const feeKobo = Number.isFinite(Number(riderFeeKobo)) && Number(riderFeeKobo) >= 0 ? Number(riderFeeKobo) : 0;
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        riderId: rider.id,
        riderStatus: 'ASSIGNED',
        status: 'OUT_FOR_DELIVERY',
        riderFeeKobo: feeKobo,
        riderPaid: false,
        statusHistory: {
          create: {
            status: 'OUT_FOR_DELIVERY',
            note: `Manually assigned to ${rider.user?.email ?? rider.id}${feeKobo ? ` with rider fee ${feeKobo} kobo` : ''}`,
            actor: req.user!.email,
          },
        },
      },
      include: { items: true, sides: true, deliveryZone: true, rider: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } } }, statusHistory: true },
    });
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      riderId: updated.riderId,
      riderStatus: updated.riderStatus,
      riderFeeKobo: updated.riderFeeKobo,
    });
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:orderNumber/eligible-riders', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new ApiError(404, 'Order not found');
    const eligible = await findEligibleRiders(order.id);
    res.json({
      riders: eligible.map((r) => ({
        id: r.id,
        firstName: r.user?.firstName,
        lastName: r.user?.lastName,
        email: r.user?.email,
        phone: r.user?.phone,
        vehicle: r.vehicle,
        distanceMeters: r.distanceMeters,
        estimatedMinutes: r.estimatedMinutes,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:orderNumber/dispatch', async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new ApiError(400, 'Cannot dispatch a delivered or cancelled order');
    }
    const eligible = await dispatchOrder(order.id, (riderId, ring) => {
      emitEvent('rider:dispatch', { orderId: order.id, orderNumber, riderId, ring });
    });
    res.json({ dispatched: eligible.length > 0, riders: eligible.map((r) => ({ id: r.id, distanceMeters: r.distanceMeters, estimatedMinutes: r.estimatedMinutes })) });
  } catch (err) {
    next(err);
  }
});

router.get('/cooks/locations', async (_req, res, next) => {
  try {
    const cooks = await prisma.cookProfile.findMany({
      where: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true },
      include: { _count: { select: { listings: true } } },
    });
    res.json({
      cooks: cooks
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({
          id: c.id,
          name: c.displayName,
          lat: c.latitude,
          lng: c.longitude,
          listings: c._count.listings,
        })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/cooks', async (_req, res, next) => {
  try {
    const cooks = await prisma.cookProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        _count: { select: { listings: true, orders: true } },
        listings: { select: { id: true, status: true, isActive: true, featured: true } },
      },
    });
    res.json({ cooks });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/approve', async (req: AuthRequest, res, next) => {
  try {
    const { note } = req.body as Record<string, any>;
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    await createApproval({
      type: 'COOK',
      targetId: cook.id,
      targetType: 'CookProfile',
      submittedBy: cook.userId,
      data: { decision: 'APPROVED' },
      note,
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_APPROVED',
      targetId: cook.id,
      targetType: 'CookProfile',
      reason: note,
      newState: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN' },
      ip: req.ip ?? undefined,
    });
    emitEvent('cook:approved', { cookId: cook.id, displayName: cook.displayName });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/reject', async (req: AuthRequest, res, next) => {
  try {
    const { note } = req.body as Record<string, any>;
    const before = await prisma.cookProfile.findUnique({ where: { id: req.params.id }, include: { user: { select: { id: true } } } });
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { profileStatus: 'REJECTED', isActive: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    await createApproval({
      type: 'COOK',
      targetId: cook.id,
      targetType: 'CookProfile',
      submittedBy: before?.userId,
      data: { decision: 'REJECTED' },
      note,
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_REJECTED',
      targetId: cook.id,
      targetType: 'CookProfile',
      reason: note,
      oldState: { profileStatus: before?.profileStatus },
      newState: { profileStatus: 'REJECTED', isActive: false },
      ip: req.ip ?? undefined,
    });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.get('/cook-listings', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
    const skip = parseInt(req.query.skip as string, 10) || 0;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { cook: { displayName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.cookListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { cook: true, media: { orderBy: { ordering: 'asc' } }, _count: { select: { likes: true, views: true } } },
      }),
      prisma.cookListing.count({ where }),
    ]);

    res.json({
      listings: listings.map((l) => ({
        ...l,
        likeCount: l._count?.likes ?? 0,
        viewCount: l._count?.views ?? 0,
      })),
      total,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/request-more-info', async (req: AuthRequest, res, next) => {
  try {
    const { reason, fields } = req.body as Record<string, any>;
    const before = await prisma.cookProfile.findUnique({ where: { id: req.params.id }, include: { user: { select: { id: true } } } });
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { profileStatus: 'PENDING_APPROVAL' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    await createApproval({
      type: 'COOK',
      targetId: cook.id,
      targetType: 'CookProfile',
      submittedBy: before?.userId,
      data: { decision: 'MORE_INFO', fields },
      note: reason,
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_MORE_INFO_REQUESTED',
      targetId: cook.id,
      targetType: 'CookProfile',
      reason,
      oldState: { profileStatus: before?.profileStatus },
      newState: { profileStatus: 'PENDING_APPROVAL' },
      ip: req.ip ?? undefined,
    });
    res.json({ cook, request: { reason, fields } });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/approve-packaging', async (req: AuthRequest, res, next) => {
  try {
    const { approved, note } = req.body as Record<string, any>;
    const before = await prisma.cookProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true } } },
    });
    if (!before) throw new ApiError(404, 'Cook not found');
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { packagingApproved: approved === true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    await createApproval({
      type: 'PACKAGING',
      targetId: cook.id,
      targetType: 'CookProfile',
      submittedBy: cook.userId,
      data: { decision: approved ? 'APPROVED' : 'REJECTED' },
      note,
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_PACKAGING_REVIEWED',
      targetId: cook.id,
      targetType: 'CookProfile',
      reason: note,
      oldState: { packagingApproved: before?.packagingApproved },
      newState: { packagingApproved: approved === true },
      ip: req.ip ?? undefined,
    });
    res.json({ cook, packaging: { approved, note } });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/ban', async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body as Record<string, any>;
    const before = await prisma.cookProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true } } },
    });
    if (!before) throw new ApiError(404, 'Cook not found');
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { banned: true, banReason: reason || null, isActive: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_BANNED',
      targetId: cook.id,
      targetType: 'CookProfile',
      reason,
      oldState: { banned: before?.banned, isActive: before?.isActive },
      newState: { banned: true, banReason: reason || null, isActive: false },
      ip: req.ip ?? undefined,
    });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/restore', async (req: AuthRequest, res, next) => {
  try {
    const before = await prisma.cookProfile.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true } } },
    });
    if (!before) throw new ApiError(404, 'Cook not found');
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { banned: false, banReason: null, isActive: true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_RESTORED',
      targetId: cook.id,
      targetType: 'CookProfile',
      oldState: { banned: before?.banned, isActive: before?.isActive },
      newState: { banned: false, banReason: null, isActive: true },
      ip: req.ip ?? undefined,
    });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.post('/cooks/:id/grant-visibility', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id;
    const cook = await prisma.cookProfile.findUnique({ where: { id } });
    if (!cook) throw new ApiError(404, 'Cook not found');

    const [updated, _] = await prisma.$transaction([
      prisma.cookProfile.update({
        where: { id },
        data: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true },
      }),
      prisma.cookListing.updateMany({
        where: { cookId: id, status: 'PENDING_REVIEW' },
        data: { status: 'APPROVED', isActive: true },
      }),
    ]);

    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_VISIBILITY_GRANTED',
      targetId: cook.id,
      targetType: 'CookProfile',
      newState: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true },
      ip: req.ip ?? undefined,
    });

    res.json({ cook: updated });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/boost', async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id;
    const { featured = true, reason } = req.body as Record<string, any>;
    const cook = await prisma.cookProfile.findUnique({ where: { id }, include: { listings: { where: { status: 'APPROVED', isActive: true } } } });
    if (!cook) throw new ApiError(404, 'Cook not found');

    const listingIds = cook.listings.map((l) => l.id);
    if (listingIds.length) {
      await prisma.cookListing.updateMany({
        where: { id: { in: listingIds } },
        data: { featured: featured === true },
      });
    }

    await logAudit({
      actorId: req.user!.id,
      action: featured === true ? 'COOK_BOOSTED' : 'COOK_UNBOOSTED',
      targetId: cook.id,
      targetType: 'CookProfile',
      reason,
      newState: { featured },
      ip: req.ip ?? undefined,
    });

    res.json({ cook: { id: cook.id, featured: featured === true, affectedListings: listingIds.length } });
  } catch (err) {
    next(err);
  }
});

router.patch('/cook-listings/:id/approve', async (req, res, next) => {
  try {
    const listing = await prisma.cookListing.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', isActive: true },
      include: { cook: true, media: { orderBy: { ordering: 'asc' } } },
    });
    emitEvent('listing:approved', { listingId: listing.id, title: listing.title });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

router.patch('/cook-listings/:id/reject', async (req, res, next) => {
  try {
    const listing = await prisma.cookListing.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', isActive: false },
      include: { cook: true, media: { orderBy: { ordering: 'asc' } } },
    });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

router.patch('/cook-listings/:id/featured', async (req, res, next) => {
  try {
    const { featured } = req.body as { featured?: boolean };
    const listing = await prisma.cookListing.update({
      where: { id: req.params.id },
      data: { featured: featured === true },
      include: { cook: true, media: { orderBy: { ordering: 'asc' } } },
    });
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

router.get('/cook-earnings', async (_req, res, next) => {
  try {
    const [pending, settled, rows] = await Promise.all([
      prisma.cookEarning.aggregate({ where: { status: 'PENDING' }, _sum: { amountKobo: true } }),
      prisma.cookEarning.aggregate({ where: { status: 'SETTLED' }, _sum: { amountKobo: true } }),
      prisma.cookEarning.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: {
          cook: { include: { user: { select: { email: true, phone: true } } } },
          order: { select: { orderNumber: true } },
        },
      }),
    ]);

    const byCook: Record<string, any> = {};
    for (const e of rows) {
      if (!byCook[e.cookId]) {
        byCook[e.cookId] = {
          ...e.cook,
          pendingKobo: 0,
          settledKobo: 0,
          earnings: [],
        };
      }
      if (e.status === 'PENDING') byCook[e.cookId].pendingKobo += e.amountKobo;
      if (e.status === 'SETTLED') byCook[e.cookId].settledKobo += e.amountKobo;
      byCook[e.cookId].earnings.push(e);
    }

    res.json({
      pendingKobo: pending._sum.amountKobo ?? 0,
      settledKobo: settled._sum.amountKobo ?? 0,
      cooks: Object.values(byCook),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/cook-earnings/:cookId/settle', async (req: AuthRequest, res, next) => {
  try {
    const cookId = req.params.cookId;
    const before = await prisma.cookEarning.aggregate({ where: { cookId, status: 'PENDING' }, _sum: { amountKobo: true } });
    const result = await prisma.cookEarning.updateMany({
      where: { cookId, status: 'PENDING' },
      data: { status: 'SETTLED', settledAt: new Date() },
    });
    await logAudit({
      actorId: req.user!.id,
      action: 'COOK_EARNINGS_SETTLED',
      targetId: cookId,
      targetType: 'CookProfile',
      newState: { settledCount: result.count, settledKobo: before._sum.amountKobo ?? 0 },
      ip: req.ip ?? undefined,
    });
    res.json({ ok: true, settled: result.count, amountKobo: before._sum.amountKobo ?? 0 });
  } catch (err) {
    next(err);
  }
});

router.get('/delivery-pricing-rules', async (_req, res, next) => {
  try {
    const rules = await prisma.deliveryPricingRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { zone: { select: { id: true, name: true } } },
    });
    res.json({ rules });
  } catch (err) {
    next(err);
  }
});

router.post('/delivery-pricing-rules', async (req, res, next) => {
  try {
    const { deliveryZoneId, deliveryType, baseFeeKobo, perMeterKobo, minOrderKobo, estimatedMinutes, enabled } = req.body as Record<string, unknown>;
    if (!deliveryZoneId || !deliveryType) throw new ApiError(400, 'Zone and delivery type required');
    const rule = await prisma.deliveryPricingRule.upsert({
      where: { deliveryZoneId_deliveryType: { deliveryZoneId: String(deliveryZoneId), deliveryType: String(deliveryType) as any } },
      create: {
        deliveryZoneId: String(deliveryZoneId),
        deliveryType: String(deliveryType) as any,
        baseFeeKobo: Number(baseFeeKobo ?? 0),
        perMeterKobo: Number(perMeterKobo ?? 0),
        minOrderKobo: Number(minOrderKobo ?? 0),
        estimatedMinutes: estimatedMinutes !== undefined ? Number(estimatedMinutes) : null,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
      },
      update: {
        baseFeeKobo: Number(baseFeeKobo ?? 0),
        perMeterKobo: Number(perMeterKobo ?? 0),
        minOrderKobo: Number(minOrderKobo ?? 0),
        estimatedMinutes: estimatedMinutes !== undefined ? Number(estimatedMinutes) : null,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
      },
      include: { zone: { select: { id: true, name: true } } },
    });
    res.status(201).json({ rule });
  } catch (err) {
    next(err);
  }
});

router.delete('/delivery-pricing-rules/:id', async (req, res, next) => {
  try {
    await prisma.deliveryPricingRule.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const DEFAULT_PROFESSIONAL_REQUIREMENTS = [
  { id: 'vehicle', label: 'Registered vehicle with valid papers', required: true },
  { id: 'insurance', label: 'Vehicle insurance', required: true },
  { id: 'license', label: 'Valid driver\'s license', required: true },
  { id: 'inspection', label: 'Physical vehicle inspection', required: true },
  { id: 'uniform', label: 'Branded packaging/uniform', required: false },
];

const DEFAULT_PACKAGING_REQUIREMENTS = [
  { id: 'sealed', label: 'Tamper-evident seal', required: true },
  { id: 'hot', label: 'Insulated bag for hot food', required: true },
  { id: 'cold', label: 'Cold pack for chilled items', required: false },
  { id: 'fragile', label: 'Fragile item padding', required: false },
];

router.get('/professional-requirements', async (_req, res, next) => {
  try {
    res.json({ requirements: DEFAULT_PROFESSIONAL_REQUIREMENTS });
  } catch (err) {
    next(err);
  }
});

router.get('/packaging-requirements', async (_req, res, next) => {
  try {
    res.json({ requirements: DEFAULT_PACKAGING_REQUIREMENTS });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/dispatch', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new ApiError(404, 'Order not found');
    const eligible = await dispatchOrder(order.id, (riderId, ring) => {
      emitEvent('order:dispatch', { orderId: order.id, orderNumber: order.orderNumber, riderId, ring });
    });
    res.json({ eligible: eligible.map((r) => ({ id: r.id, distanceMeters: r.distanceMeters })) });
  } catch (err) {
    next(err);
  }
});

router.post('/orders/:id/expand-dispatch', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new ApiError(404, 'Order not found');
    const { radiusMeters } = req.body as { radiusMeters?: number };
    const maxRadius = Math.min(Number(radiusMeters || 20000), 50000);
    const eligible = await dispatchOrder(order.id, (riderId, ring) => {
      emitEvent('order:dispatch', { orderId: order.id, orderNumber: order.orderNumber, riderId, ring: ring + maxRadius });
    }, maxRadius);
    res.json({ expanded: true, maxRadiusMeters: maxRadius, eligible: eligible.map((r) => ({ id: r.id, distanceMeters: r.distanceMeters })) });
  } catch (err) {
    next(err);
  }
});

router.get('/riders', async (_req, res, next) => {
  try {
    const riders = await prisma.rider.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        location: { select: { latitude: true, longitude: true } },
        _count: { select: { orders: true, payoutRequests: true } },
      },
    });
    res.json({ riders });
  } catch (err) {
    next(err);
  }
});

router.get('/riders/:id', async (req, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        location: true,
        inspections: true,
        payoutRequests: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { orders: true } },
      },
    });
    if (!rider) throw new ApiError(404, 'Rider not found');
    res.json({ rider });
  } catch (err) {
    next(err);
  }
});

router.patch('/riders/:id', async (req, res, next) => {
  try {
    const { isApproved, isActive, neighborhoodApproval, professionalApproval, operationalStatus, onboardingData } = req.body as Record<string, any>;
    const existing = await prisma.rider.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Rider not found');
    const data: any = {};
    if (isApproved !== undefined) data.isApproved = Boolean(isApproved);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (neighborhoodApproval !== undefined) data.neighborhoodApproval = neighborhoodApproval;
    if (professionalApproval !== undefined) data.professionalApproval = professionalApproval;
    if (operationalStatus !== undefined) data.operationalStatus = operationalStatus;
    if (onboardingData !== undefined) data.onboardingData = onboardingData;
    data.updatedAt = new Date();
    const updated = await prisma.rider.update({
      where: { id: req.params.id },
      data,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    res.json({ rider: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/delivery-analytics', async (_req, res, next) => {
  try {
    const [total, delivered, cancelled, assigned, totalEarnings, riderFees, pendingPayouts, professional, neighborhood] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { NOT: { riderId: null } } }),
      prisma.cookEarning.aggregate({ _sum: { amountKobo: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { riderFeeKobo: true } }),
      prisma.riderPayoutRequest.aggregate({ _sum: { amountKobo: true } }),
      prisma.rider.count({ where: { professionalApproval: 'APPROVED', isActive: true } }),
      prisma.rider.count({ where: { neighborhoodApproval: 'APPROVED', isActive: true } }),
    ]);
    const completionRate = total > 0 ? Math.round((delivered / total) * 1000) / 1000 : 0;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 1000) / 1000 : 0;
    const acceptanceRate = total > 0 ? Math.round((assigned / total) * 1000) / 1000 : 0;
    res.json({
      total,
      delivered,
      cancelled,
      assigned,
      completionRate,
      cancellationRate,
      acceptanceRate,
      cookEarningsKobo: totalEarnings._sum.amountKobo || 0,
      riderFeesKobo: riderFees._sum.riderFeeKobo || 0,
      pendingPayoutsKobo: pendingPayouts._sum.amountKobo || 0,
      activeProfessionalRiders: professional,
      activeNeighborhoodRiders: neighborhood,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/delivery-control-center', async (_req, res, next) => {
  try {
    const [liveOrders, riders, pendingApplications, pendingPayouts, recentApplications, activeProfessional, activeNeighborhood] = await Promise.all([
      prisma.order.count({ where: { status: { in: ['OUT_FOR_DELIVERY', 'PICKED_UP', 'READY_FOR_PICKUP', 'READY_FOR_DISPATCH'] } } }),
      prisma.rider.count(),
      prisma.rider.count({ where: { isApproved: false } }),
      prisma.riderPayoutRequest.count({ where: { status: 'PENDING' } }),
      prisma.rider.findMany({ where: { isApproved: false }, take: 20, orderBy: { createdAt: 'desc' }, include: { user: { select: { email: true, firstName: true, lastName: true, phone: true } } } }),
      prisma.rider.count({ where: { isApproved: true, isActive: true, available: true, professionalApproval: 'APPROVED' } }),
      prisma.rider.count({ where: { isApproved: true, isActive: true, available: true, neighborhoodApproval: 'APPROVED' } }),
    ]);
    res.json({
      liveOrders,
      totalPartners: riders,
      pendingApplications,
      pendingPayouts,
      activeProfessional,
      activeNeighborhood,
      recentApplications,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/delivery-safety-report', async (_req, res, next) => {
  try {
    const [recentFailed, recentCancelled, highCompletionRiders, repeatedCustomers] = await Promise.all([
      prisma.orderStatusHistory.findMany({
        where: { status: 'DELIVERY_CODE_FAILED' },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, riderId: true, customerId: true, address: true } } },
      }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.rider.findMany({
        take: 20,
        orderBy: { orders: { _count: 'desc' } },
        include: { _count: { select: { orders: true } } },
      }),
      prisma.$queryRaw`
        SELECT "customerId", "riderId", COUNT(*) as count
        FROM "Order"
        WHERE "riderId" IS NOT NULL AND "customerId" IS NOT NULL
        GROUP BY "customerId", "riderId"
        HAVING COUNT(*) > 2
        ORDER BY count DESC
        LIMIT 20
      ` as any,
    ]);
    res.json({
      recentFailedVerifications: recentFailed.length,
      cancelledOrders: recentCancelled,
      topRiders: highCompletionRiders.map((r) => ({ id: r.id, orders: r._count.orders })),
      repeatedCustomerRiderPairs: repeatedCustomers,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/payout-requests', async (_req, res, next) => {
  try {
    const requests = await prisma.riderPayoutRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rider: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } } },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

router.post('/payouts/:id/settle', async (req, res, next) => {
  try {
    const { status } = req.body as { status?: 'SETTLED' | 'REJECTED' };
    if (!status || !['SETTLED', 'REJECTED'].includes(status)) throw new ApiError(400, 'status must be SETTLED or REJECTED');
    const updated = await prisma.riderPayoutRequest.update({
      where: { id: req.params.id },
      data: { status, settledAt: status === 'SETTLED' ? new Date() : null },
    });
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/feature-flags', async (_req, res, next) => {
  try {
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    res.json({ flags });
  } catch (err) {
    next(err);
  }
});

router.put('/feature-flags/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { enabled, rollout } = req.body as { enabled?: boolean; rollout?: number };
    const flag = await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled: enabled ?? false, rollout: rollout ?? 0 },
      update: { enabled: enabled ?? false, rollout: rollout ?? 0 },
    });
    res.json({ flag });
  } catch (err) {
    next(err);
  }
});

const DEFAULT_RIDER_ONBOARDING_FIELDS = [
  { key: 'country', label: 'Country of operation', type: 'select', required: true, order: 1, options: ['Nigeria', 'Ghana', 'Kenya', 'Other'] },
  { key: 'state', label: 'State/Region', type: 'text', required: true, order: 2 },
  { key: 'lga', label: 'LGA/City', type: 'text', required: true, order: 3 },
  { key: 'riderAddress', label: 'Residential address', type: 'textarea', required: true, order: 4 },
  { key: 'idDocumentUrl', label: 'Government-issued ID', type: 'file', required: false, order: 5 },
  { key: 'facePhotoUrl', label: 'Clear photo of face', type: 'file', required: false, order: 6 },
  { key: 'guarantorName', label: 'Guarantor name', type: 'text', required: true, order: 7 },
  { key: 'guarantorAddress', label: 'Guarantor address', type: 'textarea', required: true, order: 8 },
  { key: 'guarantorPhone', label: 'Guarantor phone', type: 'text', required: true, order: 9 },
  { key: 'bvn', label: 'BVN', type: 'text', required: false, order: 10, gatingRule: 'country=Nigeria' },
  { key: 'nin', label: 'NIN', type: 'text', required: false, order: 11, gatingRule: 'country=Nigeria' },
];

async function ensureDefaultRiderOnboardingFields() {
  const existing = await prisma.riderOnboardingField.count();
  if (existing) return;
  await prisma.riderOnboardingField.createMany({
    data: DEFAULT_RIDER_ONBOARDING_FIELDS as any,
    skipDuplicates: true,
  });
}

router.get('/rider-onboarding/fields', async (_req, res, next) => {
  try {
    await ensureDefaultRiderOnboardingFields();
    const fields = await prisma.riderOnboardingField.findMany({ orderBy: { order: 'asc' } });
    res.json({ fields });
  } catch (err) {
    next(err);
  }
});

router.post('/rider-onboarding/fields', async (req, res, next) => {
  try {
    const { key, label, type, required, active, order, gatingRule, options } = req.body as Record<string, any>;
    if (!key || !label || !type) throw new ApiError(400, 'key, label and type are required');
    const field = await prisma.riderOnboardingField.create({
      data: { key: String(key), label: String(label), type: String(type), required: Boolean(required), active: active !== false, order: Number(order) || 0, gatingRule: gatingRule ? String(gatingRule) : null, options: Array.isArray(options) ? options.map(String) : [] },
    });
    res.status(201).json({ field });
  } catch (err) {
    next(err);
  }
});

router.patch('/rider-onboarding/fields/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, type, required, active, order, gatingRule, options } = req.body as Record<string, any>;
    const data: any = {};
    if (label !== undefined) data.label = String(label);
    if (type !== undefined) data.type = String(type);
    if (required !== undefined) data.required = Boolean(required);
    if (active !== undefined) data.active = Boolean(active);
    if (order !== undefined) data.order = Number(order);
    if (gatingRule !== undefined) data.gatingRule = gatingRule ? String(gatingRule) : null;
    if (options !== undefined) data.options = Array.isArray(options) ? options.map(String) : [];
    const field = await prisma.riderOnboardingField.update({ where: { id }, data });
    res.json({ field });
  } catch (err) {
    next(err);
  }
});

router.delete('/rider-onboarding/fields/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.riderOnboardingField.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/riders/:id/audit', async (req, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    if (!rider) throw new ApiError(404, 'Rider not found');
    const fields = await prisma.riderOnboardingField.findMany({ orderBy: { order: 'asc' } });
    res.json({ rider, fields });
  } catch (err) {
    next(err);
  }
});

router.delete('/riders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const rider = await tx.rider.findUnique({ where: { id }, include: { user: true } });
      if (!rider) throw new ApiError(404, 'Rider not found');
      await tx.order.updateMany({ where: { riderId: id }, data: { riderId: null, riderStatus: 'UNASSIGNED' } });
      await tx.review.updateMany({ where: { riderId: id }, data: { riderId: null } });
      await tx.dispute.updateMany({ where: { riderId: id }, data: { riderId: null } });
      await tx.genericTask.updateMany({ where: { riderId: id }, data: { riderId: null } });
      await tx.rider.delete({ where: { id } });
      const newRoles = rider.user.roles.filter((r) => r !== 'RIDER');
      if (newRoles.length === 0) newRoles.push('CUSTOMER');
      const newRole = newRoles.includes('ADMIN') ? 'ADMIN' : 'CUSTOMER';
      await tx.user.update({
        where: { id: rider.userId },
        data: { role: newRole as any, roles: { set: newRoles } },
      });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/cooks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const cook = await tx.cookProfile.findUnique({ where: { id }, include: { user: true } });
      if (!cook) throw new ApiError(404, 'Cook not found');
      await tx.cookProfile.delete({ where: { id } });
      const newRoles = cook.user.roles.filter((r) => r !== 'COOK');
      if (newRoles.length === 0) newRoles.push('CUSTOMER');
      const newRole = newRoles.includes('ADMIN') ? 'ADMIN' : 'CUSTOMER';
      await tx.user.update({
        where: { id: cook.userId },
        data: { role: newRole as any, roles: { set: newRoles } },
      });
    });
    res.json({ ok: true });
  } catch (err) {
    if ((err as any).code === 'P2003') {
      throw new ApiError(409, 'Cannot delete cook with linked orders or other records');
    }
    next(err);
  }
});

router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id }, include: { rider: true, cookProfile: true } });
    if (!user) throw new ApiError(404, 'User not found');
    await prisma.$transaction(async (tx) => {
      if (user.rider) await tx.rider.delete({ where: { id: user.rider.id } });
      if (user.cookProfile) await tx.cookProfile.delete({ where: { id: user.cookProfile.id } });
      await tx.order.updateMany({ where: { customerId: id }, data: { customerId: null } });
      await tx.user.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (err) {
    if ((err as any).code === 'P2003') {
      throw new ApiError(409, 'Cannot delete user with linked records (reviews, tickets, disputes or addresses)');
    }
    next(err);
  }
});

export default router;
