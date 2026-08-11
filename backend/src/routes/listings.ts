import { Router } from 'express';
import { prisma } from '../prisma.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { distanceMeters, geocode, LOCAL_SEARCH_RINGS_METERS } from '../lib/location.js';
import { cache } from '../lib/cache.js';

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

function roundCoord(coord: number, decimals = 2) {
  return Math.round(coord * 10 ** decimals) / 10 ** decimals;
}

function stripCookLocation(listing: any) {
  if (!listing.cook) return listing;
  const { latitude, longitude, ...publicCook } = listing.cook;
  const point =
    latitude != null && longitude != null
      ? { lat: roundCoord(latitude), lng: roundCoord(longitude) }
      : undefined;
  return { ...listing, cook: publicCook, point };
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

function geoBucket(lat: number, lng: number, precision = 1) {
  const factor = 10 ** precision;
  return `${Math.round(lat * factor) / factor},${Math.round(lng * factor) / factor}`;
}

const LISTINGS_TTL = 30;

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

    const bucket = geoBucket(lat, lng, 2);
    const cacheKey = `listings:around-me:${bucket}:${minResults}:${customRadiusKm ?? 'default'}:${req.query.neighborhood ?? 'all'}`;
    const data = await cache.getOrSet(
      cacheKey,
      async () => {
        const neighborhood = typeof req.query.neighborhood === 'string' ? req.query.neighborhood.trim() : undefined;
        const listings = await prisma.cookListing.findMany({
          where: {
            status: 'APPROVED',
            isActive: true,
            stock: { gt: 0 },
            cook: {
              profileStatus: 'APPROVED',
              kitchenStatus: 'OPEN',
              isActive: true,
              latitude: { not: null },
              longitude: { not: null },
              ...(neighborhood ? { neighborhood } : {}),
            },
          },
          include: LISTING_INCLUDE,
          take: 100,
        });

        const withDistance = listings
          .map((l) => {
            const cook = l.cook;
            const distMeters =
              cook.latitude != null && cook.longitude != null && !Number.isNaN(cook.latitude) && !Number.isNaN(cook.longitude)
                ? distanceMeters({ lat, lng }, { lat: cook.latitude, lng: cook.longitude })
                : Infinity;
            return { ...l, distanceMeters: distMeters, distanceKm: distMeters / 1000 };
          })
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        const rings = customRadiusKm ? [customRadiusKm * 1000] : LOCAL_SEARCH_RINGS_METERS;
        const ringLabels = ['Around you', 'Nearby', 'More options'];
        const sections: { label: string; radiusMeters: number; listings: typeof withDistance }[] = [];
        let lastEnd = -1;

        for (let i = 0; i < rings.length; i++) {
          const r = rings[i];
          const sectionBucket = withDistance
            .filter((l) => l.distanceMeters > lastEnd && l.distanceMeters <= r)
            .sort((a, b) => {
              const featuredDiff = Number(b.featured) - Number(a.featured);
              if (featuredDiff !== 0) return featuredDiff;
              return a.distanceMeters - b.distanceMeters;
            });
          if (sectionBucket.length) {
            sections.push({ label: ringLabels[i] ?? `Within ${r}m`, radiusMeters: r, listings: sectionBucket });
          }
          lastEnd = r;
        }

        const outerLimit = rings[rings.length - 1];
        const insideOuterRing = withDistance.filter((l) => l.distanceMeters <= outerLimit);
        const fallback = insideOuterRing.length < minResults;
        if (fallback && withDistance.length > 0) {
          const best = withDistance.slice(0, Math.min(minResults, withDistance.length));
          sections.push({ label: 'Closest available', radiusMeters: best[best.length - 1]?.distanceMeters ?? 0, listings: best });
        }

        return {
          sections: sections.map((s) => ({ ...s, listings: s.listings.map(stripCookLocation).map(serializeListing) })),
          fallback,
          center: { lat, lng },
          total: withDistance.length,
        };
      },
      { ttlSeconds: LISTINGS_TTL, jitter: true },
    );
    res.setHeader('Cache-Control', `public, max-age=${LISTINGS_TTL}, stale-while-revalidate=${LISTINGS_TTL}`);
    res.json(data);
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

    const bucket = geoBucket(lat, lng, 2);
    const cacheKey = `listings:nearby:${bucket}:${radiusKm}`;
    const data = await cache.getOrSet(
      cacheKey,
      async () => {
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

        return { listings: withDistance.map(stripCookLocation).map(serializeListing) };
      },
      { ttlSeconds: LISTINGS_TTL, jitter: true },
    );
    res.setHeader('Cache-Control', `public, max-age=${LISTINGS_TTL}, stale-while-revalidate=${LISTINGS_TTL}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await cache.getOrSet(
      `listings:detail:${id}`,
      async () => {
        const listing = await prisma.cookListing.findUnique({
          where: { id },
          include: LISTING_INCLUDE,
        });
        if (!listing || listing.status !== 'APPROVED' || !listing.isActive) {
          throw new ApiError(404, 'Listing not found');
        }
        return { listing: serializeListing(stripCookLocation(listing)) };
      },
      { ttlSeconds: LISTINGS_TTL, jitter: true },
    );
    res.setHeader('Cache-Control', `public, max-age=${LISTINGS_TTL}, stale-while-revalidate=${LISTINGS_TTL}`);
    res.json(data);
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
      await cache.del(`listings:detail:${listingId}`);
      res.json({ liked: false, likeCount });
    } else {
      await prisma.cookListingLike.create({ data: { listingId, userId } });
      const likeCount = await prisma.cookListingLike.count({ where: { listingId } });
      await cache.del(`listings:detail:${listingId}`);
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
    await cache.del(`listings:detail:${listingId}`);
    res.json({ ok: true, viewCount });
  } catch (err) {
    next(err);
  }
});

router.get('/cooks/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await cache.getOrSet(
      `cooks:profile:${id}`,
      async () => {
        const cook = await prisma.cookProfile.findUnique({
          where: { id },
          include: {
            listings: { where: { status: 'APPROVED', isActive: true, stock: { gt: 0 } }, include: { media: { orderBy: { ordering: 'asc' as const } } } },
            reviews: { take: 20, orderBy: { createdAt: 'desc' } },
          },
        });
        if (!cook || cook.profileStatus !== 'APPROVED' || !cook.isActive) throw new ApiError(404, 'Cook not found');
        return { cook: { ...cook, latitude: undefined, longitude: undefined } };
      },
      { ttlSeconds: LISTINGS_TTL, jitter: true },
    );
    res.setHeader('Cache-Control', `public, max-age=${LISTINGS_TTL}, stale-while-revalidate=${LISTINGS_TTL}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
