import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { dispatchOrder } from '../lib/assignment.js';
import { isLocationFresh } from '../lib/location.js';
import { emitEvent } from '../lib/realtime.js';
import { getEmailConfig, saveEmailConfig, sendEmail, sendOrderStatusEmail } from '../lib/email.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [active, newOrders, preparing, outForDelivery, completed, revenueAgg, foods, popularItems] = await Promise.all([
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
    ]);

    res.json({
      active,
      new: newOrders,
      preparing,
      outForDelivery,
      completed,
      revenueKobo: revenueAgg._sum?.totalKobo ?? 0,
      lowStockFoods: foods.filter((f) => f._count.options < 1),
      popularItems,
    });
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
    const { name, slug, description, heroImage, orderingMode, options } = body;
    if (!name || !slug) throw new ApiError(400, 'Name and slug required');

    const food = await prisma.food.create({
      data: {
        name: String(name),
        slug: String(slug),
        description: description ? String(description) : undefined,
        heroImage: heroImage ? String(heroImage) : undefined,
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
    res.json({ food });
  } catch (err) {
    next(err);
  }
});

router.delete('/foods/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.food.update({
      where: { id },
      data: { status: 'ARCHIVED', isAvailable: false },
    });
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
    const zones = await prisma.deliveryZone.findMany({ orderBy: { createdAt: 'desc' } });
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
    res.json({ method });
  } catch (err) {
    next(err);
  }
});

router.delete('/payment-methods/:id', async (req, res, next) => {
  try {
    await prisma.paymentMethodConfig.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/settings', async (_req, res, next) => {
  try {
    const setting = await prisma.restaurantSetting.findFirst();
    res.json({ settings: setting });
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

    const setting = await prisma.restaurantSetting.upsert({
      where: { id: existing?.id ?? 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
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
    const rider = await prisma.rider.update({
      where: { id },
      data: { isApproved: true, isActive: true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
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

router.get('/cooks', async (_req, res, next) => {
  try {
    const cooks = await prisma.cookProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }, _count: { select: { listings: true, orders: true } } },
    });
    res.json({ cooks });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/approve', async (req, res, next) => {
  try {
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN' },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    emitEvent('cook:approved', { cookId: cook.id, displayName: cook.displayName });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.patch('/cooks/:id/reject', async (req, res, next) => {
  try {
    const cook = await prisma.cookProfile.update({
      where: { id: req.params.id },
      data: { profileStatus: 'REJECTED', isActive: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
    });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.get('/cook-listings', async (_req, res, next) => {
  try {
    const listings = await prisma.cookListing.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { cook: true, media: { orderBy: { ordering: 'asc' } } },
    });
    res.json({ listings });
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

router.get('/cook-earnings', async (_req, res, next) => {
  try {
    const [pending, settled] = await Promise.all([
      prisma.cookEarning.aggregate({ where: { status: 'PENDING' }, _sum: { amountKobo: true } }),
      prisma.cookEarning.aggregate({ where: { status: 'SETTLED' }, _sum: { amountKobo: true } }),
    ]);
    res.json({
      pendingKobo: pending._sum.amountKobo ?? 0,
      settledKobo: settled._sum.amountKobo ?? 0,
    });
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
    const { isApproved, isActive, neighborhoodApproval, professionalApproval, operationalStatus } = req.body as Record<string, any>;
    const existing = await prisma.rider.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Rider not found');
    const data: any = {};
    if (isApproved !== undefined) data.isApproved = Boolean(isApproved);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (neighborhoodApproval !== undefined) data.neighborhoodApproval = neighborhoodApproval;
    if (professionalApproval !== undefined) data.professionalApproval = professionalApproval;
    if (operationalStatus !== undefined) data.operationalStatus = operationalStatus;
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

export default router;
