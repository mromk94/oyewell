import { prisma } from '../prisma.js';
import { PaymentProvider } from '@prisma/client';
import { ApiError } from './errors.js';
import { resolveDelivery } from './delivery.js';
import { createPaymentForOrder } from './payment.js';
import { formatKobo } from './money.js';
import { emitEvent } from './realtime.js';
import crypto from 'node:crypto';

function generateOrderNumber(): string {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `OW${random}`;
}

async function generateDeliveryCode(): Promise<string> {
  while (true) {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const existing = await prisma.order.findUnique({ where: { deliveryCode: code } });
    if (!existing) return code;
  }
}

interface RestaurantCartItem {
  foodSlug: string;
  optionId: string;
  quantity: number;
  sideIds: string[];
}

interface RestaurantOrderPayload {
  source: 'RESTAURANT';
  items: RestaurantCartItem[];
  address: string;
  phone: string;
  paymentProvider: string;
  customerId?: string;
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
}

interface CookOrderPayload {
  source: 'COOK';
  cookListingId: string;
  quantity: number;
  address: string;
  phone: string;
  paymentProvider: string;
  customerId?: string;
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
}

type OrderPayload = RestaurantOrderPayload | CookOrderPayload;

async function createCookOrder(payload: CookOrderPayload) {
  const { cookListingId, quantity, address, phone, paymentProvider, customerId, deliveryType = 'NEIGHBORHOOD' } = payload;

  if (!address.trim() || !phone.trim()) {
    throw new ApiError(400, 'Address and phone are required');
  }

  const listing = await prisma.cookListing.findUnique({
    where: { id: cookListingId },
    include: { cook: true },
  });
  if (!listing || listing.status !== 'APPROVED' || !listing.isActive) {
    throw new ApiError(404, 'Listing not available');
  }
  if (listing.cook.kitchenStatus !== 'OPEN' || listing.cook.profileStatus !== 'APPROVED') {
    throw new ApiError(400, 'Cook kitchen is not open');
  }
  if (listing.stock < quantity) {
    throw new ApiError(400, 'Not enough stock');
  }

  const subtotalKobo = listing.priceKobo * quantity;
  const delivery = await resolveDelivery(address, subtotalKobo, deliveryType as any);
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
    await tx.cookListing.update({
      where: { id: listing.id },
      data: { stock: { decrement: quantity } },
    });

    const created = await tx.order.create({
      data: {
        orderNumber,
        source: 'COOK',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        customerId,
        cookId: listing.cookId,
        cookListingId: listing.id,
        address,
        phone,
        deliveryZoneId: delivery.zone.id,
        deliveryType: deliveryType as any,
        deliveryFeeKobo: delivery.feeKobo,
        subtotalKobo,
        totalKobo,
        deliveryCode: await generateDeliveryCode(),
        items: {
          create: {
            cookListingId: listing.id,
            foodName: listing.title,
            optionLabel: listing.portionDescription ?? 'Unit',
            optionValue: null,
            unitPriceKobo: listing.priceKobo,
            quantity,
            totalKobo: subtotalKobo,
            orderingMode: 'PLATE',
          },
        },
        statusHistory: {
          create: { status: 'PENDING_PAYMENT', note: 'Cook order created' },
        },
      },
    });

    await tx.cookEarning.create({
      data: {
        cookId: listing.cookId,
        orderId: created.id,
        amountKobo: subtotalKobo,
        status: 'PENDING',
      },
    });

    const payment = await createPaymentForOrder(tx, created.id, totalKobo, provider);
    return { ...created, payment };
  });

  emitEvent('order:created', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalKobo,
  });

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: formatKobo(subtotalKobo),
      deliveryFee: formatKobo(delivery.feeKobo),
      total: formatKobo(totalKobo),
      address,
      phone,
      deliveryCode: order.deliveryCode,
      estimatedMinutes: delivery.estimatedMinutes,
    },
    payment: {
      id: order.payment.id,
      idempotencyKey: order.payment.idempotencyKey,
      provider: order.payment.provider,
    },
  };
}

export async function createOrder(payload: OrderPayload) {
  if (payload.source === 'COOK') return createCookOrder(payload);
  const { items, address, phone, paymentProvider, customerId, deliveryType = 'NEIGHBORHOOD' } = payload;

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

  const delivery = await resolveDelivery(address, subtotalKobo, deliveryType as any);
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
        deliveryType: deliveryType as any,
        deliveryFeeKobo: delivery.feeKobo,
        subtotalKobo,
        totalKobo,
        deliveryCode: await generateDeliveryCode(),
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

  emitEvent('order:created', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalKobo,
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
      deliveryCode: order.deliveryCode,
      estimatedMinutes: delivery.estimatedMinutes,
    },
    payment: {
      id: order.payment.id,
      idempotencyKey: order.payment.idempotencyKey,
      provider: order.payment.provider,
    },
  };
}

export function serializeOrder(order: any, includeDeliveryCode = false) {
  const showCode = includeDeliveryCode || order.status === 'DELIVERED' || order.status === 'CANCELLED';
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryType: order.deliveryType,
    subtotal: formatKobo(order.subtotalKobo),
    deliveryFee: formatKobo(order.deliveryFeeKobo),
    total: formatKobo(order.totalKobo),
    address: order.address,
    phone: order.phone,
    deliveryCode: showCode ? order.deliveryCode : null,
    estimatedMinutes: order.estimatedMinutes,
    cookId: order.cookId,
    cookListingId: order.cookListingId,
    riderId: order.riderId,
    riderStatus: order.riderStatus,
    riderFee: formatKobo(order.riderFeeKobo),
    riderPaid: order.riderPaid,
    deliveredAt: order.deliveredAt,
    deliveredCodeVerifiedAt: order.deliveredCodeVerifiedAt,
    createdAt: order.createdAt,
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      foodName: item.foodName,
      optionLabel: item.optionLabel,
      optionValue: item.optionValue,
      unitPriceKobo: item.unitPriceKobo,
      quantity: item.quantity,
      totalKobo: item.totalKobo,
      orderingMode: item.orderingMode,
    })),
    sides: (order.sides || []).map((side: any) => ({
      id: side.id,
      name: side.name,
      priceKobo: side.priceKobo,
      quantity: side.quantity,
      totalKobo: side.totalKobo,
    })),
    payment: order.payment
      ? {
          id: order.payment.id,
          provider: order.payment.provider,
          status: order.payment.status,
          attempts: (order.payment.attempts || []).map((a: any) => ({
            id: a.id,
            status: a.status,
            payload: a.payload,
            createdAt: a.createdAt,
          })),
        }
      : null,
    statusHistory: (order.statusHistory || []).map((h: any) => ({
      status: h.status,
      note: h.note,
      createdAt: h.createdAt,
    })),
  };
}
