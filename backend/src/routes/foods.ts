import { Router } from 'express';
import { prisma } from '../prisma.js';
import { formatKobo } from '../lib/money.js';
import { cache } from '../lib/cache.js';

const router = Router();

const FOODS_TTL = 60;

async function loadPublicFoods() {
  const foods = await prisma.food.findMany({
    where: { status: 'PUBLISHED', isAvailable: true },
    orderBy: { displayOrder: 'asc' },
    include: { options: { orderBy: { displayOrder: 'asc' } } },
  });

  return {
    foods: foods.map((f) => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      description: f.description,
      heroImage: f.heroImage,
      galleryImages: f.galleryImages,
      videos: f.videos,
      isAvailable: f.isAvailable,
      featured: f.featured,
      orderingMode: f.orderingMode,
      packagingCostKobo: f.packagingCostKobo ?? 0,
      priceFromKobo: f.options.length ? Math.min(...f.options.map((o) => o.priceKobo)) : undefined,
      priceFrom: f.options.length
        ? formatKobo(Math.min(...f.options.map((o) => o.priceKobo)))
        : undefined,
      options: f.options.map((o) => ({
        id: o.id,
        label: o.label,
        value: o.value,
        priceKobo: o.priceKobo,
        price: formatKobo(o.priceKobo),
        isAvailable: o.isAvailable,
        stock: o.stock,
      })),
    })),
  };
}

router.get('/', async (_req, res, next) => {
  try {
    const data = await cache.getOrSet('foods:public', loadPublicFoods, { ttlSeconds: FOODS_TTL, jitter: true });
    res.setHeader('Cache-Control', `public, max-age=${FOODS_TTL}, stale-while-revalidate=${FOODS_TTL}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const data = await cache.getOrSet(
      `foods:slug:${slug}`,
      async () => {
        const food = await prisma.food.findUnique({
          where: { slug, status: 'PUBLISHED' },
          include: { options: { orderBy: { displayOrder: 'asc' } } },
        });

        if (!food) return null;

        return {
          id: food.id,
          slug: food.slug,
          name: food.name,
          description: food.description,
          heroImage: food.heroImage,
          galleryImages: food.galleryImages,
          videos: food.videos,
          isAvailable: food.isAvailable,
          featured: food.featured,
          orderingMode: food.orderingMode,
          packagingCostKobo: food.packagingCostKobo ?? 0,
          options: food.options.map((o) => ({
            id: o.id,
            label: o.label,
            value: o.value,
            priceKobo: o.priceKobo,
            price: formatKobo(o.priceKobo),
            isAvailable: o.isAvailable,
            stock: o.stock,
          })),
        };
      },
      { ttlSeconds: FOODS_TTL, jitter: true },
    );
    if (!data) {
      res.status(404).json({ error: 'Food not found' });
      return;
    }
    res.setHeader('Cache-Control', `public, max-age=${FOODS_TTL}, stale-while-revalidate=${FOODS_TTL}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
