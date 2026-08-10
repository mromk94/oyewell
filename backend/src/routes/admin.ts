import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
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
      data: { isApproved: true },
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

export default router;
