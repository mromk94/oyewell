import { PrismaClient, PaymentStatus, PaymentProvider, Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { ApiError } from './errors.js';
import { getProvider } from './payment-providers.js';

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
      idempotencyKey,
      providerRef: providerPayment.providerRef,
    },
  });
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

  if (payment.idempotencyKey !== idempotencyKey) {
    throw new ApiError(403, 'Invalid payment token');
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return { payment, order: payment.order };
  }

  const adapter = getProvider(payment.provider);
  const verification = await adapter.verify(payment.providerRef ?? payment.idempotencyKey);

  if (verification.status !== 'SUCCESS') {
    throw new ApiError(400, `Payment ${verification.status.toLowerCase()}`);
  }

  const verified = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        providerRef: verification.providerRef,
      },
    });

    await tx.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        status: PaymentStatus.SUCCESS,
        providerRef: updatedPayment.providerRef,
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
        actor: 'payment-system',
        note: 'Payment verified',
      },
    });

    return { payment: updatedPayment, order: updatedOrder };
  });

  return verified;
}
