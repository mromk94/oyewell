import { PrismaClient, PaymentStatus, PaymentProvider, Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { ApiError } from './errors.js';
import { getProvider } from './payment-providers.js';
import { emitEvent } from './realtime.js';
import { assertOrderTransition, afterOrderTransition } from './order-state.js';

export async function createPaymentForOrder(
  prisma: PrismaClient | Prisma.TransactionClient,
  orderId: string,
  amountKobo: number,
  provider: PaymentProvider = PaymentProvider.MOCK,
) {
  const adapter = getProvider(provider);
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true, customer: { select: { email: true } } } });
  const email = order?.customer?.email ?? 'guest@oyewell.com';
  const idempotencyKey = crypto.randomUUID();
  const providerPayment = await adapter.charge({
    orderNumber: order?.orderNumber ?? orderId,
    amountKobo,
    currency: 'NGN',
    idempotencyKey,
    email,
    metadata: { orderId },
  });

  return prisma.payment.create({
    data: {
      orderId,
      amountKobo,
      currency: 'NGN',
      provider,
      status: providerPayment.status === 'SUCCESS' ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
      providerRef: providerPayment.providerRef,
    },
  });
}

/**
 * Idempotent authoritative payment confirmation.
 * Persists payment success, transitions the order to CONFIRMED, records history,
 * emits real-time events and notifies the vendor. Safe to call multiple times
 * (duplicate webhooks / duplicate admin clicks are no-ops).
 */
export async function confirmPayment(
  prisma: PrismaClient,
  paymentId: string,
  opts: { actor?: string; providerRef?: string | null; note?: string } = {},
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) throw new ApiError(404, 'Payment not found');

  // Idempotency: already confirmed -> return current state, no side effects.
  if (payment.status === PaymentStatus.SUCCESS && payment.order.paymentStatus === 'PAID') {
    return { payment, order: payment.order, alreadyConfirmed: true };
  }

  assertOrderTransition(payment.order.status, 'CONFIRMED');
  const previousStatus = payment.order.status;

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        providerRef: opts.providerRef ?? payment.providerRef,
      },
    });

    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: PaymentStatus.SUCCESS,
        providerRef: updatedPayment.providerRef,
        payload: opts.note ? { note: opts.note } : undefined,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: 'CONFIRMED',
        actor: opts.actor ?? 'payment-system',
        note: opts.note ?? 'Payment confirmed',
      },
    });

    return { payment: updatedPayment, order: updatedOrder };
  });

  afterOrderTransition(result.order, { actor: opts.actor ?? 'payment-system', previousStatus, note: opts.note });
  // Vendor notification event (cook dashboards listen to the bus and refetch).
  emitEvent('payment:confirmed', {
    orderId: result.order.id,
    orderNumber: result.order.orderNumber,
    cookId: result.order.cookId ?? undefined,
    customerId: result.order.customerId ?? undefined,
    amountKobo: result.payment.amountKobo,
  });

  return { ...result, alreadyConfirmed: false };
}

export async function failPayment(
  prisma: PrismaClient,
  paymentId: string,
  opts: { actor?: string; note?: string } = {},
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status === PaymentStatus.SUCCESS) {
    throw new ApiError(400, 'Payment already confirmed and cannot be failed');
  }
  if (payment.status === PaymentStatus.FAILED) {
    return { payment, order: payment.order };
  }
  const previousStatus = payment.order.status;
  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });
    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: PaymentStatus.FAILED,
        payload: opts.note ? { note: opts.note } : undefined,
      },
    });
    const updatedOrder = await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: 'FAILED', status: 'CANCELLED' },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: 'CANCELLED',
        actor: opts.actor ?? 'payment-system',
        note: opts.note ?? 'Payment failed/rejected',
      },
    });
    return { payment: updatedPayment, order: updatedOrder };
  });
  afterOrderTransition(result.order, { actor: opts.actor ?? 'payment-system', previousStatus, note: opts.note });
  return result;
}

export async function verifyPayment(
  prisma: PrismaClient,
  paymentId: string,
  idempotencyKey: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new ApiError(404, 'Payment not found');
  }

  if (payment.order.idempotencyKey !== idempotencyKey) {
    throw new ApiError(403, 'Invalid payment token');
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return { payment, order: payment.order };
  }

  const adapter = getProvider(payment.provider);
  const verification = await adapter.verify(payment.providerRef ?? payment.order.idempotencyKey);

  if (verification.status !== 'SUCCESS') {
    throw new ApiError(400, `Payment ${verification.status.toLowerCase()}`);
  }

  // Server-side amount/currency validation where the provider reports it.
  if (verification.amountKobo != null && verification.amountKobo !== payment.amountKobo) {
    throw new ApiError(400, 'Payment amount mismatch');
  }
  if (verification.currency && verification.currency !== payment.currency) {
    throw new ApiError(400, 'Payment currency mismatch');
  }

  const { payment: updatedPayment, order: updatedOrder } = await confirmPayment(prisma, payment.id, {
    actor: 'payment-system',
    providerRef: verification.providerRef,
    note: `Verified via ${payment.provider}`,
  });

  return { payment: updatedPayment, order: updatedOrder };
}
