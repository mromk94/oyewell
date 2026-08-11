import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { distanceMeters, geocode, LOCAL_SEARCH_RINGS_METERS } from '../lib/location.js';

const router = Router();

const COOK_PUBLIC_SELECT = {
  id: true,
  displayName: true,
  profilePhoto: true,
  bio: true,
  cuisineSpecialty: true,
  kitchenStatus: true,
  rating: true,
} as const;

const COOK_SELECT = {
  ...COOK_PUBLIC_SELECT,
  latitude: true,
  longitude: true,
} as const;

function stripCookLocation(listing: any) {
  if (!listing.cook) return listing;
  const { latitude, longitude, ...publicCook } = listing.cook;
  return { ...listing, cook: publicCook };
}

const LISTING_INCLUDE = {
  cook: { select: COOK_SELECT },
  media: { orderBy: { ordering: 'asc' as const } },
  _count: { select: { likes: true, views: true } },
} as const;

function serializeListing(listing: any) {
  const { _count, ...rest } = listing;
  return {
    ...rest,
    likeCount: _count?.likes ?? 0,
    viewCount: _count?.views ?? 0,
  };
}

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
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: LISTING_INCLUDE,
      }),
      prisma.cookListing.count({ where }),
    ]);
    res.json({ listings: listings.map(stripCookLocation).map(serializeListing), total, skip, take });
  } catch (err) {
    next(err);
  }
});
router.get('/around-me', async (req, res, next) => {
  try {
    const minResults = Math.max(Number(req.query.minResults) || 3, 1);
    const customRadiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : null;

    let lat = Number(req.query.lat);
    let lng = Number(req.query.lng);
    const address = req.query.address as string | undefined;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      if (!address) throw new ApiError(400, 'lat/lng or address is required');
      const geocoded = await geocode(address);
      if (!geocoded) throw new ApiError(400, 'Could not geocode address');
      lat = geocoded.lat;
      lng = geocoded.lng;
    }

    const listings = await prisma.cookListing.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        stock: { gt: 0 },
        cook: { profileStatus: 'APPROVED', kitchenStatus: 'OPEN', isActive: true, latitude: { not: null }, longitude: { not: null } },
      },
      include: LISTING_INCLUDE,
      take: 100,
    });

    const withDistance = listings
      .map((l) => {
        const cook = l.cook;
        const distMeters = cook.latitude && cook.longitude ? distanceMeters({ lat, lng }, { lat: cook.latitude, lng: cook.longitude }) : Infinity;
        return { ...l, distanceMeters: distMeters, distanceKm: distMeters / 1000 };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Local-first discovery rings
    const rings = customRadiusKm ? [customRadiusKm * 1000] : LOCAL_SEARCH_RINGS_METERS;
    const ringLabels = ['Around you', 'Nearby', 'More options'];
    const sections: { label: string; radiusMeters: number; listings: typeof withDistance }[] = [];
    let lastEnd = 0;

    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const bucket = withDistance.filter((l) => l.distanceMeters > lastEnd && l.distanceMeters <= r);
      if (bucket.length) {
        sections.push({ label: ringLabels[i] ?? `Within ${r}m`, radiusMeters: r, listings: bucket });
      }
      lastEnd = r;
    }

    // Fallback: if overall nearby is insufficient, also include closest options beyond the last ring
    const fallback = withDistance.length < minResults;
    if (fallback && withDistance.length > 0) {
      const best = withDistance.slice(0, Math.min(minResults, withDistance.length));
      sections.push({ label: 'Closest available', radiusMeters: best[best.length - 1]?.distanceMeters ?? 0, listings: best });
    }

    res.json({
      sections: sections.map((s) => ({ ...s, listings: s.listings.map(stripCookLocation).map(serializeListing) })),
      fallback,
      center: { lat, lng },
      total: withDistance.length,
    });
  } catch (err) {
    next(err);
  }
});

// Keep old path for backward compatibility
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
      take: 100,
    });

    const withDistance = listings
      .map((l) => {
        const cook = l.cook;
        const distMeters = cook.latitude && cook.longitude ? distanceMeters({ lat, lng }, { lat: cook.latitude, lng: cook.longitude }) : Infinity;
        return { ...l, distanceMeters: distMeters, distanceKm: distMeters / 1000 };
      })
      .filter((l) => l.distanceMeters <= radiusKm * 1000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    res.json({ listings: withDistance.map(stripCookLocation).map(serializeListing) });
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
    res.json({ listing: serializeListing(stripCookLocation(listing)) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/like', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const listingId = req.params.id;
    const userId = req.user!.id;
    const existing = await prisma.cookListingLike.findUnique({
      where: { listingId_userId: { listingId, userId } },
    });
    if (existing) {
      await prisma.cookListingLike.delete({ where: { id: existing.id } });
      const likeCount = await prisma.cookListingLike.count({ where: { listingId } });
      res.json({ liked: false, likeCount });
    } else {
      await prisma.cookListingLike.create({ data: { listingId, userId } });
      const likeCount = await prisma.cookListingLike.count({ where: { listingId } });
      res.json({ liked: true, likeCount });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/:id/view', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const listingId = req.params.id;
    const { viewerId } = req.body as { viewerId?: string };
    if (!viewerId || typeof viewerId !== 'string') throw new ApiError(400, 'viewerId is required');
    await prisma.cookListingView.upsert({
      where: { listingId_viewerId: { listingId, viewerId } },
      create: { listingId, viewerId, userId: req.user?.id },
      update: { createdAt: new Date() },
    });
    const viewCount = await prisma.cookListingView.count({ where: { listingId } });
    res.json({ ok: true, viewCount });
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
    res.json({ cook: { ...cook, latitude: undefined, longitude: undefined } });
  } catch (err) {
    next(err);
  }
});

export default router;
