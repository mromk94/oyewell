import { Router } from 'express';
import { prisma } from '../prisma.js';
import { formatKobo } from '../lib/money.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const foods = await prisma.food.findMany({
      where: { status: 'PUBLISHED', isAvailable: true },
      orderBy: { displayOrder: 'asc' },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });

    res.json({
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
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const food = await prisma.food.findUnique({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!food) {
      res.status(404).json({ error: 'Food not found' });
      return;
    }

    res.json({
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
      options: food.options.map((o) => ({
        id: o.id,
        label: o.label,
        value: o.value,
        priceKobo: o.priceKobo,
        price: formatKobo(o.priceKobo),
        isAvailable: o.isAvailable,
        stock: o.stock,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
