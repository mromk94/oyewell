import { PrismaClient, OrderingMode, FoodStatus, DeliveryZoneType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@oyewell.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'successtrain2026@';
  const hashed = bcrypt.hashSync(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashed,
      role: 'ADMIN',
      roles: ['ADMIN'],
    },
  });

  await prisma.restaurantSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'OYE Well',
      currency: 'NGN',
      contactPhone: '+234 800 000 0000',
      contactEmail: 'hello@oyewell.com',
      latitude: 6.5244,
      longitude: 3.3792,
    },
  });

  await prisma.paymentMethodConfig.upsert({
    where: { name: 'Card' },
    update: {},
    create: { name: 'Card', provider: 'PAYSTACK', enabled: false },
  });

  await prisma.paymentMethodConfig.upsert({
    where: { name: 'Bank Transfer' },
    update: {},
    create: { name: 'Bank Transfer', provider: 'MANUAL', enabled: true },
  });

  await prisma.paymentMethodConfig.upsert({
    where: { name: 'Crypto' },
    update: {},
    create: { name: 'Crypto', provider: 'CRYPTO', enabled: false },
  });

  await prisma.deliveryZone.upsert({
    where: { id: 'lagos-city' },
    update: {},
    create: {
      id: 'lagos-city',
      name: 'Lagos',
      type: DeliveryZoneType.CITY,
      boundary: { cities: ['Lagos'] },
      feeKobo: 150000,
      estimatedMinutes: 45,
    },
  });

  const foods = [
    {
      slug: 'egusi-soup',
      name: 'Egusi Soup',
      description: 'Rich, nutty melon-seed soup slow-cooked with palm oil, leafy vegetables and your choice of protein.',
      heroImage: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80',
      orderingMode: OrderingMode.PLATE,
      displayOrder: 1,
      featured: true,
      options: [
        { label: '1 Liter', value: '1L', priceKobo: 350000, stock: 50 },
        { label: '2 Liters', value: '2L', priceKobo: 650000, stock: 40 },
        { label: '3 Liters', value: '3L', priceKobo: 900000, stock: 30 },
        { label: '5 Liters', value: '5L', priceKobo: 1400000, stock: 20 },
      ],
    },
    {
      slug: 'grilled-chicken',
      name: 'Grilled Chicken',
      description: 'Spice-rubbed chicken, flame-grilled until the skin is crisp and the meat stays juicy.',
      heroImage: 'https://images.unsplash.com/photo-1598103442097-8b745d94a8ab?w=1200&q=80',
      orderingMode: OrderingMode.PIECE,
      displayOrder: 2,
      featured: true,
      options: [
        { label: 'Piece', value: 'piece', priceKobo: 120000, stock: 100 },
      ],
    },
    {
      slug: 'jollof-rice',
      name: 'Party Jollof Rice',
      description: 'Smoky tomato-infused party jollof, served with fried plantain and coleslaw.',
      heroImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80',
      orderingMode: OrderingMode.PORTION,
      displayOrder: 3,
      featured: false,
      options: [
        { label: 'Small Portion', value: 'small', priceKobo: 250000, stock: 60 },
        { label: 'Medium Portion', value: 'medium', priceKobo: 450000, stock: 50 },
        { label: 'Large Portion', value: 'large', priceKobo: 700000, stock: 30 },
      ],
    },
  ];

  for (const food of foods) {
    const { options, ...rest } = food;
    await prisma.food.upsert({
      where: { slug: rest.slug },
      update: {},
      create: {
        ...rest,
        status: FoodStatus.PUBLISHED,
        isAvailable: true,
        options: {
          create: options,
        },
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
