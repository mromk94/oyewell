import { prisma } from '../prisma.js';
import { PaymentProvider } from '@prisma/client';
import { ApiError } from './errors.js';
import { resolveDelivery } from './delivery.js';
import { createPaymentForOrder } from './payment.js';
import { formatKobo } from './money.js';
import crypto from 'node:crypto';

function generateOrderNumber(): string {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `OW${random}`;
}

interface OrderPayload {
  foodSlug: string;
  optionId: string;
  quantity: number;
  address: string;
  phone: string;
  paymentProvider: string;
  sideIds: string[];
  customerId?: string;
}

export async function createOrder(payload: OrderPayload) {
  const { foodSlug, optionId, quantity, address, phone, paymentProvider, sideIds, customerId } = payload;

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ApiError(400, 'Invalid quantity');
  }

  if (!address.trim() || !phone.trim()) {
    throw new ApiError(400, 'Address and phone are required');
  }

  const food = await prisma.food.findUnique({
    where: { slug: foodSlug },
    include: { options: true },
  });

  if (!food || food.status !== 'PUBLISHED' || !food.isAvailable) {
    throw new ApiError(404, 'Food not available');
  }

  const option = food.options.find((o) => o.id === optionId);
  if (!option) {
    throw new ApiError(400, 'Selected option not found');
  }
  if (!option.isAvailable || (option.stock !== null && option.stock < quantity)) {
    throw new ApiError(400, 'Selected option is unavailable or out of stock');
  }

  const sides = sideIds.length
    ? await prisma.side.findMany({
        where: { id: { in: sideIds }, isAvailable: true },
      })
    : [];

  const sidesKobo = sides.reduce((sum: number, s: { priceKobo: number }) => sum + s.priceKobo, 0);
  const mainSubtotalKobo = option.priceKobo * quantity;
  const subtotalKobo = mainSubtotalKobo + sidesKobo;

  const delivery = await resolveDelivery(address, subtotalKobo);
  if (!delivery || !delivery.available) {
    throw new ApiError(400, 'Delivery is not available for this address', 'DELIVERY_UNAVAILABLE');
  }

  const totalKobo = subtotalKobo + delivery.feeKobo;

  const provider = paymentProvider.toUpperCase() as PaymentProvider;
  if (!Object.values(PaymentProvider).includes(provider)) {
    throw new ApiError(400, 'Invalid payment provider');
  }

  const orderNumber = generateOrderNumber();
  const order = await prisma.$transaction(async (tx) => {
    if (option.stock !== null) {
      await tx.foodOption.update({
        where: { id: option.id },
        data: { stock: { decrement: quantity } },
      });
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        customerId,
        address,
        phone,
        deliveryZoneId: delivery.zone.id,
        deliveryFeeKobo: delivery.feeKobo,
        subtotalKobo,
        totalKobo,
        items: {
          create: {
            foodName: food.name,
            optionLabel: option.label,
            optionValue: option.value,
            unitPriceKobo: option.priceKobo,
            quantity,
            totalKobo: mainSubtotalKobo,
            orderingMode: food.orderingMode,
          },
        },
        sides: {
          create: sides.map((side: { id: string; name: string; priceKobo: number }) => ({
            sideId: side.id,
            name: side.name,
            priceKobo: side.priceKobo,
            quantity: 1,
            totalKobo: side.priceKobo,
          })),
        },
        statusHistory: {
          create: { status: 'PENDING_PAYMENT', note: 'Order created' },
        },
      },
    });

    const payment = await createPaymentForOrder(tx, created.id, totalKobo, provider);

    return { ...created, payment };
  });

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: formatKobo(subtotalKobo),
      deliveryFee: formatKobo(delivery.feeKobo),
      total: formatKobo(totalKobo),
      address,
      phone,
      estimatedMinutes: delivery.estimatedMinutes,
    },
    payment: {
      id: order.payment.id,
      idempotencyKey: order.payment.idempotencyKey,
      provider: order.payment.provider,
    },
  };
}
