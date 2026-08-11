import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';
import { serializeOrder } from '../lib/order.js';
import { dispatchOrder } from '../lib/assignment.js';
import { emitEvent } from '../lib/realtime.js';
import { resolveNeighborhood, normalizeNeighborhood } from '../lib/neighborhood.js';

const router = Router();

router.post('/apply', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { displayName, bio, latitude, longitude, neighborhood: neighborhoodInput, serviceRadiusKm, cuisineSpecialty, profilePhoto, categories, signatureDishes, capacity, prepTime, availability, packagingPhotos, safetyAcknowledgements } = req.body as Record<string, any>;
    if (!displayName) throw new ApiError(400, 'Display name is required');
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { cookProfile: true } });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.cookProfile) throw new ApiError(409, 'Cook application already exists');

    const existing = await prisma.cookProfile.findFirst({ where: { displayName: { equals: displayName, mode: 'insensitive' } } });
    if (existing) throw new ApiError(409, 'Display name already in use');

    const latNum = latitude != null ? Number(latitude) : null;
    const lngNum = longitude != null ? Number(longitude) : null;
    let neighborhood = normalizeNeighborhood(neighborhoodInput) ?? null;
    if (!neighborhood && latNum != null && lngNum != null) {
      neighborhood = normalizeNeighborhood(await resolveNeighborhood({ lat: latNum, lng: lngNum })) ?? null;
    }

    const cook = await prisma.$transaction(async (tx) => {
      const profile = await tx.cookProfile.create({
        data: {
          userId: user.id,
          displayName,
          bio,
          latitude: latNum,
          longitude: lngNum,
          neighborhood,
          serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : 5,
          cuisineSpecialty,
          profilePhoto,
          categories: categories ?? [],
          signatureDishes: signatureDishes ?? [],
          capacity,
          prepTime,
          availability: availability ?? {},
          packagingPhotos: packagingPhotos ?? [],
          safetyAcknowledgements: safetyAcknowledgements ?? [],
          profileStatus: 'PENDING_APPROVAL',
          kitchenStatus: 'PENDING_APPROVAL',
        },
      });
      const nextRoles = Array.from(new Set([...user.roles, 'COOK']));
      await tx.user.update({ where: { id: user.id }, data: { roles: { set: nextRoles } } });
      return profile;
    });

    res.status(201).json({ cook });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const cook = await prisma.cookProfile.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, roles: true } } },
    });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.put('/me', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { displayName, bio, latitude, longitude, neighborhood: neighborhoodInput, serviceRadiusKm, cuisineSpecialty, profilePhoto, categories, signatureDishes, capacity, prepTime, availability, packagingPhotos, safetyAcknowledgements, onboardingStep } = req.body as Record<string, any>;

    const latNum = latitude != null ? Number(latitude) : undefined;
    const lngNum = longitude != null ? Number(longitude) : undefined;
    let neighborhood = normalizeNeighborhood(neighborhoodInput) ?? undefined;
    if (!neighborhood && latNum != null && lngNum != null) {
      neighborhood = (await resolveNeighborhood({ lat: latNum, lng: lngNum })) ?? undefined;
      if (neighborhood) neighborhood = normalizeNeighborhood(neighborhood) ?? undefined;
    }

    const cook = await prisma.cookProfile.update({
      where: { userId: req.user!.id },
      data: {
        displayName,
        bio,
        latitude: latNum,
        longitude: lngNum,
        neighborhood,
        serviceRadiusKm: serviceRadiusKm != null ? Number(serviceRadiusKm) : undefined,
        cuisineSpecialty,
        profilePhoto,
        categories: categories ?? undefined,
        signatureDishes: signatureDishes ?? undefined,
        capacity,
        prepTime,
        availability,
        packagingPhotos: packagingPhotos ?? undefined,
        safetyAcknowledgements,
        onboardingStep,
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, roles: true } } },
    });
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

router.post('/me/kitchen-status', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body as { status?: string };
    const allowed = ['OPEN', 'CLOSED', 'PAUSED'];
    if (!status || !allowed.includes(status)) throw new ApiError(400, 'Status must be OPEN, CLOSED or PAUSED');
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    if (cook.profileStatus !== 'APPROVED') throw new ApiError(403, 'Cook is not approved');
    if (cook.kitchenStatus === 'SUSPENDED' || cook.kitchenStatus === 'ADMIN_DISABLED' || cook.kitchenStatus === 'PENDING_APPROVAL') {
      throw new ApiError(403, 'Kitchen cannot be changed while in enforced state');
    }
    const updated = await prisma.cookProfile.update({
      where: { userId: req.user!.id },
      data: { kitchenStatus: status as any },
      include: { user: { select: { id: true, email: true } } },
    });
    res.json({ cook: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/me/listings', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id }, include: { listings: { include: { media: true } } } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    res.json({ listings: cook.listings });
  } catch (err) {
    next(err);
  }
});

router.post('/me/listings', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    if (cook.profileStatus !== 'APPROVED') throw new ApiError(403, 'Cook not approved');

    const { title, description, priceKobo, portionDescription, prepTimeMinutesMin, prepTimeMinutesMax, quantity, stock, ingredients, allergens, cuisine, media } = req.body as any;
    if (!title) throw new ApiError(400, 'Title is required');
    if (typeof priceKobo !== 'number' || priceKobo < 0) throw new ApiError(400, 'priceKobo must be a positive number');

    const listing = await prisma.$transaction(async (tx) => {
      const created = await tx.cookListing.create({
        data: {
          cookId: cook.id,
          title,
          description,
          priceKobo,
          portionDescription,
          prepTimeMinutesMin,
          prepTimeMinutesMax,
          quantity: quantity ?? stock ?? 0,
          stock: stock ?? quantity ?? 0,
          ingredients,
          allergens,
          cuisine,
          status: 'PENDING_REVIEW',
          isActive: false,
        },
        include: { media: true },
      });
      if (Array.isArray(media) && media.length) {
        await tx.cookListingMedia.createMany({
          data: media.map((m: any, i: number) => ({
            listingId: created.id,
            type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
            url: String(m.url),
            thumbnailUrl: m.thumbnailUrl ? String(m.thumbnailUrl) : null,
            ordering: i,
            width: m.width ? Number(m.width) : null,
            height: m.height ? Number(m.height) : null,
            duration: m.duration ? Number(m.duration) : null,
            metadata: m.metadata ?? {},
          })),
        });
      }
      return tx.cookListing.findUnique({ where: { id: created.id }, include: { media: true } });
    });

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
});

router.patch('/me/listings/:id', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const listing = await prisma.cookListing.findFirst({ where: { id, cookId: cook.id } });
    if (!listing) throw new ApiError(404, 'Listing not found');

    const allowed = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAUSED', 'SOLD_OUT', 'ARCHIVED'];
    const body = req.body as any;
    const data: any = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.description !== undefined) data.description = body.description;
    if (typeof body.priceKobo === 'number') data.priceKobo = body.priceKobo;
    if (body.portionDescription !== undefined) data.portionDescription = body.portionDescription;
    if (body.prepTimeMinutesMin !== undefined) data.prepTimeMinutesMin = body.prepTimeMinutesMin;
    if (body.prepTimeMinutesMax !== undefined) data.prepTimeMinutesMax = body.prepTimeMinutesMax;
    if (typeof body.quantity === 'number') data.quantity = body.quantity;
    if (typeof body.stock === 'number') data.stock = body.stock;
    if (body.ingredients !== undefined) data.ingredients = body.ingredients;
    if (body.allergens !== undefined) data.allergens = body.allergens;
    if (body.cuisine !== undefined) data.cuisine = body.cuisine;

    const resubmitting = body.resubmit === true;

    if (body.status !== undefined) {
      if (!allowed.includes(body.status)) throw new ApiError(400, 'Invalid status');
      if (!resubmitting) {
        data.status = body.status;
        data.isActive = body.status === 'APPROVED';
      }
    }

    if (resubmitting) {
      data.status = 'PENDING_REVIEW';
      data.isActive = false;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(body.media)) {
        await tx.cookListingMedia.deleteMany({ where: { listingId: id } });
        if (body.media.length) {
          await tx.cookListingMedia.createMany({
            data: body.media.map((m: any, i: number) => ({
              listingId: id,
              type: m.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
              url: String(m.url),
              thumbnailUrl: m.thumbnailUrl ? String(m.thumbnailUrl) : null,
              ordering: i,
              width: m.width ? Number(m.width) : null,
              height: m.height ? Number(m.height) : null,
              duration: m.duration ? Number(m.duration) : null,
              metadata: m.metadata ?? {},
            })),
          });
        }
      }
      return tx.cookListing.update({
        where: { id },
        data,
        include: { media: true },
      });
    });
    res.json({ listing: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/listings/:id', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const listing = await prisma.cookListing.findFirst({ where: { id, cookId: cook.id } });
    if (!listing) throw new ApiError(404, 'Listing not found');
    await prisma.$transaction(async (tx) => {
      await tx.cookListingMedia.deleteMany({ where: { listingId: id } });
      await tx.cookListingLike.deleteMany({ where: { listingId: id } });
      await tx.cookListingView.deleteMany({ where: { listingId: id } });
      await tx.cookListing.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (err) {
    if ((err as any).code === 'P2003') {
      throw new ApiError(409, 'Cannot delete listing with linked orders or reviews');
    }
    next(err);
  }
});

router.get('/me/orders', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const orders = await prisma.order.findMany({
      where: { cookId: cook.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, sides: true, payment: true, statusHistory: true },
    });
    res.json({ orders: orders.map((o) => serializeOrder(o)) });
  } catch (err) {
    next(err);
  }
});

router.post('/me/orders/:orderNumber/accept', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const order = await prisma.order.findFirst({ where: { orderNumber, cookId: cook.id } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAID' && order.status !== 'CONFIRMED') {
      throw new ApiError(400, 'Order cannot be accepted');
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'COOK_ACCEPTED',
        cookAcceptedAt: new Date(),
        statusHistory: { create: { status: 'COOK_ACCEPTED', note: 'Cook accepted', actor: req.user!.email } },
      },
      include: { items: true, sides: true, payment: true, statusHistory: true },
    });
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      cookId: updated.cookId,
      cookAcceptedAt: updated.cookAcceptedAt,
      cookReadyAt: updated.cookReadyAt,
    });
    res.json({ order: serializeOrder(updated) });
  } catch (err) {
    next(err);
  }
});

router.post('/me/orders/:orderNumber/preparing', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const order = await prisma.order.findFirst({ where: { orderNumber, cookId: cook.id } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'COOK_ACCEPTED') throw new ApiError(400, 'Order must be accepted first');
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PREPARING',
        statusHistory: { create: { status: 'PREPARING', note: 'Cook started preparing', actor: req.user!.email } },
      },
      include: { items: true, sides: true, payment: true, statusHistory: true },
    });
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      cookId: updated.cookId,
      cookAcceptedAt: updated.cookAcceptedAt,
      cookReadyAt: updated.cookReadyAt,
    });
    res.json({ order: serializeOrder(updated) });
  } catch (err) {
    next(err);
  }
});

router.post('/me/orders/:orderNumber/ready', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const { orderNumber } = req.params;
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const order = await prisma.order.findFirst({ where: { orderNumber, cookId: cook.id } });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'PREPARING') throw new ApiError(400, 'Order must be preparing first');
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'READY_FOR_PICKUP',
        cookReadyAt: new Date(),
        statusHistory: { create: { status: 'READY_FOR_PICKUP', note: 'Food is ready', actor: req.user!.email } },
      },
      include: { items: true, sides: true, payment: true, statusHistory: true },
    });
    emitEvent('order:status', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      cookId: updated.cookId,
      cookAcceptedAt: updated.cookAcceptedAt,
      cookReadyAt: updated.cookReadyAt,
    });
    dispatchOrder(updated.id, (riderId, ring) => {
      emitEvent('order:dispatch', { orderId: updated.id, orderNumber: updated.orderNumber, riderId, ring });
    }).catch(() => {});
    res.json({ order: serializeOrder(updated, true) });
  } catch (err) {
    next(err);
  }
});

router.get('/me/earnings', requireAuth, requireRole('COOK'), async (req: AuthRequest, res, next) => {
  try {
    const cook = await prisma.cookProfile.findUnique({ where: { userId: req.user!.id } });
    if (!cook) throw new ApiError(404, 'Cook profile not found');
    const [total, settled] = await Promise.all([
      prisma.cookEarning.aggregate({ where: { cookId: cook.id }, _sum: { amountKobo: true } }),
      prisma.cookEarning.aggregate({ where: { cookId: cook.id, status: 'SETTLED' }, _sum: { amountKobo: true } }),
    ]);
    res.json({
      totalKobo: total._sum.amountKobo ?? 0,
      settledKobo: settled._sum.amountKobo ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
