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
  paymentCurrency?: string;
  customerId?: string;
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  idempotencyKey?: string;
  lat?: number;
  lng?: number;
}

interface CookOrderPayload {
  source: 'COOK';
  cookListingId: string;
  quantity: number;
  address: string;
  phone: string;
  paymentProvider: string;
  paymentCurrency?: string;
  customerId?: string;
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  idempotencyKey?: string;
  lat?: number;
  lng?: number;
}

type OrderPayload = RestaurantOrderPayload | CookOrderPayload;

async function createCookOrder(payload: CookOrderPayload) {
  const { cookListingId, quantity, address, phone, paymentProvider, paymentCurrency, customerId, deliveryType = 'NEIGHBORHOOD', idempotencyKey, lat, lng } = payload;
  const providedCoords = lat != null && lng != null ? { lat, lng } : undefined;

  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
  }

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

  const subtotalKobo = (listing.priceKobo + (listing.packagingCostKobo ?? 0)) * quantity;
  const delivery = await resolveDelivery(address, subtotalKobo, deliveryType as any, [listing.cookId ?? 'restaurant'], providedCoords);
  if (!delivery || !delivery.available) {
    throw new ApiError(400, 'Delivery is not available for this address', 'DELIVERY_UNAVAILABLE');
  }

  const totalKobo = delivery.totalKobo ?? subtotalKobo + (delivery.platformFeeKobo ?? 0) + delivery.feeKobo;
  const platformFeeKobo = delivery.platformFeeKobo ?? 0;
  const cookEarningKobo = totalKobo - platformFeeKobo - delivery.feeKobo;
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
        idempotencyKey: idempotencyKey || undefined,
        deliveryFeeKobo: delivery.feeKobo,
        riderFeeKobo: delivery.riderFeeKobo ?? delivery.feeKobo,
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
        amountKobo: cookEarningKobo,
        status: 'PENDING',
      },
    });

    const payment = await createPaymentForOrder(tx, created.id, totalKobo, provider, paymentCurrency);
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
      platformFee: formatKobo(platformFeeKobo),
      deliveryFee: formatKobo(delivery.feeKobo),
      total: formatKobo(totalKobo),
      address,
      phone,
      deliveryCode: order.deliveryCode,
      estimatedMinutes: delivery.estimatedMinutes,
    },
    payment: {
      id: order.payment.id,
      idempotencyKey: order.idempotencyKey,
      provider: order.payment.provider,
      redirectUrl: (order.payment.metadata as any)?.redirectUrl || undefined,
      authorization: (order.payment.metadata as any)?.authorization || undefined,
    },
  };
}

export async function createOrder(payload: OrderPayload) {
  if (payload.source === 'COOK') return createCookOrder(payload);
  const { items, address, phone, paymentProvider, paymentCurrency, customerId, deliveryType = 'NEIGHBORHOOD', idempotencyKey, lat, lng } = payload;
  const providedCoords = lat != null && lng != null ? { lat, lng } : undefined;

  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
  }

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
  const sourceIds: string[] = [];

  for (const item of items) {
    const food = await prisma.food.findUnique({
      where: { slug: item.foodSlug },
      include: { options: true, cook: { select: { id: true } } },
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

    const packagingCostKobo = food.packagingCostKobo ?? 0;
    let itemSubtotalKobo = (option.priceKobo + packagingCostKobo) * item.quantity;
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
    sourceIds.push(food.cookId ?? 'restaurant');
    stockDecrements.set(option.id, (stockDecrements.get(option.id) ?? 0) + item.quantity);

    orderItemInputs.push({
      foodName: food.name,
      optionLabel: option.label,
      optionValue: option.value,
      unitPriceKobo: option.priceKobo,
      quantity: item.quantity,
      totalKobo: (option.priceKobo + packagingCostKobo) * item.quantity,
      orderingMode: food.orderingMode,
    });
  }

  const delivery = await resolveDelivery(address, subtotalKobo, deliveryType as any, sourceIds, providedCoords);
  if (!delivery || !delivery.available) {
    throw new ApiError(400, 'Delivery is not available for this address', 'DELIVERY_UNAVAILABLE');
  }

  const totalKobo = delivery.totalKobo ?? subtotalKobo + (delivery.platformFeeKobo ?? 0) + delivery.feeKobo;
  const platformFeeKobo = delivery.platformFeeKobo ?? 0;

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
        regionId: delivery.regionId,
        deliveryZoneId: delivery.zone.id,
        deliveryType: deliveryType as any,
        idempotencyKey: idempotencyKey || undefined,
        deliveryFeeKobo: delivery.feeKobo,
        riderFeeKobo: delivery.riderFeeKobo ?? delivery.feeKobo,
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

    const payment = await createPaymentForOrder(tx, created.id, totalKobo, provider, paymentCurrency);

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
      platformFee: formatKobo(platformFeeKobo),
      deliveryFee: formatKobo(delivery.feeKobo),
      total: formatKobo(totalKobo),
      address,
      phone,
      deliveryCode: order.deliveryCode,
      estimatedMinutes: delivery.estimatedMinutes,
    },
    payment: {
      id: order.payment.id,
      idempotencyKey: order.idempotencyKey,
      provider: order.payment.provider,
      redirectUrl: (order.payment.metadata as any)?.redirectUrl || undefined,
      authorization: (order.payment.metadata as any)?.authorization || undefined,
    },
  };
}

function maskAddress(address: string) {
  const parts = address.split(/[,\s]+/).filter(Boolean);
  if (parts.length <= 2) return 'Approximate area';
  return `${parts.slice(0, 2).join(' ')} ...`;
}

function maskPhone(phone: string) {
  return phone.length > 4 ? `****${phone.slice(-4)}` : phone;
}

export type OrderAudience = 'CUSTOMER' | 'COOK' | 'RIDER' | 'ADMIN';

export function serializeOrder(
  order: any,
  audienceOrLegacy: OrderAudience | boolean = 'CUSTOMER',
  maskCustomerInfo = false,
) {
  // Back-compat: boolean second arg used to mean includeDeliveryCode (true was rider/admin views).
  const audience: OrderAudience =
    typeof audienceOrLegacy === 'boolean' ? (audienceOrLegacy ? 'ADMIN' : 'CUSTOMER') : audienceOrLegacy;
  const delivered = order.status === 'DELIVERED';
  const terminal = delivered || order.status === 'CANCELLED';
  // Delivery code: customer sees it once paid (they hand it to the rider on arrival).
  // The rider must NEVER see it before verification — it is the proof gate.
  const showCode =
    audience === 'ADMIN' || terminal || (audience === 'CUSTOMER' && order.paymentStatus === 'PAID');
  // Pickup code: cook hands it to the rider at handover. Cook + admin only.
  // It is only useful until the rider has picked up the order and is out for delivery.
  const pickupCleared = ['OUT_FOR_DELIVERY', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(order.status);
  const showPickupCode = audience === 'ADMIN' || (audience === 'COOK' && !pickupCleared);
  const showPickupLocation = audience === 'RIDER' || audience === 'ADMIN';
  const showCustomerInfo = !maskCustomerInfo || delivered || audience === 'RIDER' || audience === 'ADMIN';
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryType: order.deliveryType || 'NEIGHBORHOOD',
    subtotal: formatKobo(order.subtotalKobo),
    platformFee: formatKobo(order.totalKobo - order.subtotalKobo - order.deliveryFeeKobo),
    deliveryFee: formatKobo(order.deliveryFeeKobo),
    total: formatKobo(order.totalKobo),
    totalKobo: order.totalKobo,
    address: showCustomerInfo ? order.address : maskAddress(order.address),
    phone: showCustomerInfo ? order.phone : maskPhone(order.phone),
    approximateArea: order.deliveryZone?.name || maskAddress(order.address),
    deliveryCode: showCode ? order.deliveryCode : null,
    pickupCode: showPickupCode ? order.pickupCode ?? null : null,
    pickupCodeVerifiedAt: order.pickupCodeVerifiedAt ?? null,
    tripStartedAt: order.tripStartedAt ?? null,
    estimatedMinutes: order.estimatedMinutes,
    cookId: order.cookId,
    cookListingId: order.cookListingId,
    cookName: order.cookListing?.cook?.displayName || order.cook?.displayName || 'Kitchen',
    pickupLocation:
      showPickupLocation && (order.cookListing?.cook?.latitude || order.cook?.latitude)
        ? {
            lat: order.cookListing?.cook?.latitude ?? order.cook?.latitude,
            lng: order.cookListing?.cook?.longitude ?? order.cook?.longitude,
            address: order.cookListing?.cook?.operatingArea || order.cook?.operatingArea || 'Pickup',
          }
        : null,
    pickupArea:
      order.cookListing?.cook?.operatingArea || order.cook?.operatingArea || order.approximateArea,
    riderId: order.riderId,
    riderStatus: order.riderStatus,
    riderFee: formatKobo(order.riderFeeKobo),
    riderPaid: order.riderPaid,
    riderLocation:
      order.rider?.location && order.rider.operationalStatus === 'ONLINE' && !delivered
        ? { lat: order.rider.location.latitude, lng: order.rider.location.longitude, updatedAt: order.rider.location.updatedAt }
        : null,
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
          method: order.payment.method ?? null,
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
