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

interface CartItem {
  foodSlug: string;
  optionId: string;
  quantity: number;
  sideIds: string[];
}

interface OrderPayload {
  items: CartItem[];
  address: string;
  phone: string;
  paymentProvider: string;
  customerId?: string;
}

export async function createOrder(payload: OrderPayload) {
  const { items, address, phone, paymentProvider, customerId } = payload;

  if (!address.trim() || !phone.trim()) {
    throw new ApiError(400, 'Address and phone are required');
  }

  const orderItemInputs: {
    foodName: string;
    optionLabel: string;
    optionValue: string | null;
    unitPriceKobo: number;
    quantity: number;
    totalKobo: number;
    orderingMode: string;
  }[] = [];

  const selectedSides = new Map<string, { id: string; name: string; priceKobo: number; count: number }>();
  const stockDecrements = new Map<string, number>();
  let subtotalKobo = 0;

  for (const item of items) {
    const food = await prisma.food.findUnique({
      where: { slug: item.foodSlug },
      include: { options: true },
    });

    if (!food || food.status !== 'PUBLISHED' || !food.isAvailable) {
      throw new ApiError(404, 'Food not available');
    }

    const option = food.options.find((o) => o.id === item.optionId);
    if (!option) {
      throw new ApiError(400, 'Selected option not found');
    }
    if (!option.isAvailable || (option.stock !== null && option.stock < item.quantity)) {
      throw new ApiError(400, 'Selected option is unavailable or out of stock');
    }

    const sides = item.sideIds.length
      ? await prisma.side.findMany({
          where: { id: { in: item.sideIds }, isAvailable: true },
        })
      : [];

    let itemSubtotalKobo = option.priceKobo * item.quantity;
    for (const side of sides) {
      itemSubtotalKobo += side.priceKobo * item.quantity;
      const existing = selectedSides.get(side.id);
      if (existing) {
        existing.count += item.quantity;
      } else {
        selectedSides.set(side.id, { id: side.id, name: side.name, priceKobo: side.priceKobo, count: item.quantity });
      }
    }

    subtotalKobo += itemSubtotalKobo;
    stockDecrements.set(option.id, (stockDecrements.get(option.id) ?? 0) + item.quantity);

    orderItemInputs.push({
      foodName: food.name,
      optionLabel: option.label,
      optionValue: option.value,
      unitPriceKobo: option.priceKobo,
      quantity: item.quantity,
      totalKobo: option.priceKobo * item.quantity,
      orderingMode: food.orderingMode,
    });
  }

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
    for (const [optionId, qty] of stockDecrements) {
      const opt = await tx.foodOption.findUnique({ where: { id: optionId } });
      if (opt && opt.stock !== null) {
        await tx.foodOption.update({
          where: { id: optionId },
          data: { stock: { decrement: qty } },
        });
      }
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
        items: { create: orderItemInputs },
        sides: {
          create: Array.from(selectedSides.values()).map((side) => ({
            sideId: side.id,
            name: side.name,
            priceKobo: side.priceKobo,
            quantity: side.count,
            totalKobo: side.priceKobo * side.count,
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
