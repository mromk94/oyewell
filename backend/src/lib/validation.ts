import { z } from 'zod';

const restaurantCartItemSchema = z.object({
  foodSlug: z.string().min(1),
  optionId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  sideIds: z.array(z.string()).default([]),
});

const cookCartItemSchema = z.object({
  cookListingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

const cartItemSchema = z.union([restaurantCartItemSchema, cookCartItemSchema]);

export const deliveryCheckSchema = z.object({
  address: z.string().min(3),
  phone: z.string().min(5),
  items: z.array(cartItemSchema).min(1),
  deliveryType: z.enum(['NEIGHBORHOOD', 'PROFESSIONAL']).default('NEIGHBORHOOD'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const orderBase = z.object({
  address: z.string().min(3),
  phone: z.string().min(5),
  paymentProvider: z.string().min(1).default('MOCK'),
  paymentCurrency: z.string().min(1).optional(),
  deliveryType: z.enum(['NEIGHBORHOOD', 'PROFESSIONAL']).default('NEIGHBORHOOD'),
  idempotencyKey: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const restaurantOrderSchema = z.object({
  source: z.literal('RESTAURANT'),
  items: z.array(restaurantCartItemSchema).min(1),
}).merge(orderBase);

const cookOrderSchema = z.object({
  source: z.literal('COOK'),
  cookListingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
}).merge(orderBase);

export const createOrderSchema = z.union([restaurantOrderSchema, cookOrderSchema]);

export const paymentVerifySchema = z.object({
  idempotencyKey: z.string().min(1),
});
