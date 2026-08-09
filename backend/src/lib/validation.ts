import { z } from 'zod';

export const deliveryCheckSchema = z.object({
  address: z.string().min(3),
  phone: z.string().min(5),
  foodSlug: z.string().min(1),
  optionId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  sideIds: z.array(z.string()).default([]),
});

export const createOrderSchema = z.object({
  foodSlug: z.string().min(1),
  optionId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  address: z.string().min(3),
  phone: z.string().min(5),
  sideIds: z.array(z.string()).default([]),
  paymentProvider: z.string().min(1).default('MOCK'),
});

export const paymentVerifySchema = z.object({
  idempotencyKey: z.string().min(1),
});
