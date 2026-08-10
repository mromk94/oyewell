import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';
import { distanceKm } from '../lib/maps.js';

const router = Router();

const COOK_SELECT = {
  id: true,
  displayName: true,
  profilePhoto: true,
  bio: true,
  latitude: true,
  longitude: true,
  cuisineSpecialty: true,
  kitchenStatus: true,
  rating: true,
} as const;

const LISTING_INCLUDE = {
  cook: { select: COOK_SELECT },
  media: { orderBy: { ordering: 'asc' as const } },
} as const;

router.get('/', async (req, res, next) => {
  try {
    const status = (req.query.status as string) ?? 'APPROVED';
    const cuisine = req.query.cuisine as string | undefined;
    const cookId = req.query.cookId as string | undefined;
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const where: any = {
      status,
      isActive: true,
      stock: { gt: 0 },
      cook: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true },
    };
    if (cuisine) where.cuisine = { contains: cuisine, mode: 'insensitive' };
    if (cookId) where.cookId = cookId;

    const [listings, total] = await Promise.all([
      prisma.cookListing.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: LISTING_INCLUDE,
      }),
      prisma.cookListing.count({ where }),
    ]);
    res.json({ listings, total, skip, take });
  } catch (err) {
    next(err);
  }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm) || 10, 0.5), 50);
    if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError(400, 'lat and lng are required');

    const listings = await prisma.cookListing.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        stock: { gt: 0 },
        cook: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true, latitude: { not: null }, longitude: { not: null } },
      },
      include: LISTING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const withDistance = listings
      .map((l) => {
        const cook = l.cook;
        const dist = cook.latitude && cook.longitude ? distanceKm({ lat, lng }, { lat: cook.latitude, lng: cook.longitude }) : Infinity;
        return { ...l, distanceKm: dist };
      })
      .filter((l) => l.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ listings: withDistance });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const listing = await prisma.cookListing.findUnique({
      where: { id: req.params.id },
      include: LISTING_INCLUDE,
    });
    if (!listing || listing.status !== 'APPROVED' || !listing.isActive) {
      throw new ApiError(404, 'Listing not found');
    }
    res.json({ listing });
  } catch (err) {
    next(err);
  }
});

router.get('/cooks/:id', async (req, res, next) => {
  try {
    const cook = await prisma.cookProfile.findUnique({
      where: { id: req.params.id },
      include: {
        listings: { where: { status: 'APPROVED', isActive: true, stock: { gt: 0 } }, include: { media: { orderBy: { ordering: 'asc' as const } } } },
        reviews: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!cook || cook.profileStatus !== 'APPROVED' || !cook.isActive) throw new ApiError(404, 'Cook not found');
    res.json({ cook });
  } catch (err) {
    next(err);
  }
});

export default router;
