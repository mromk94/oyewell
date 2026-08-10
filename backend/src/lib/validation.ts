import { z } from 'zod';

const cartItemSchema = z.object({
  foodSlug: z.string().min(1),
  optionId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  sideIds: z.array(z.string()).default([]),
});

export const deliveryCheckSchema = z.object({
  address: z.string().min(3),
  phone: z.string().min(5),
  items: z.array(cartItemSchema).min(1),
});

const restaurantOrderSchema = z.object({
  source: z.literal('RESTAURANT'),
  items: z.array(cartItemSchema).min(1),
  address: z.string().min(3),
  phone: z.string().min(5),
  paymentProvider: z.string().min(1).default('MOCK'),
});

const cookOrderSchema = z.object({
  source: z.literal('COOK'),
  cookListingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  address: z.string().min(3),
  phone: z.string().min(5),
  paymentProvider: z.string().min(1).default('MOCK'),
});

export const createOrderSchema = z.union([restaurantOrderSchema, cookOrderSchema]);

export const paymentVerifySchema = z.object({
  idempotencyKey: z.string().min(1),
});
