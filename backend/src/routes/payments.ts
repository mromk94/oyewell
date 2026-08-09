import { Router } from 'express';
import { prisma } from '../prisma.js';
import { verifyPayment } from '../lib/payment.js';
import { paymentVerifySchema } from '../lib/validation.js';
import { ApiError } from '../lib/errors.js';

const router = Router();

function safePublicConfig(provider: string, config: any) {
  if (!config) return undefined;
  if (provider === 'BANK_TRANSFER') {
    return {
      accountNumber: config.accountNumber,
      accountName: config.accountName,
      bankName: config.bankName,
      instructions: config.instructions,
    };
  }
  if (provider === 'CRYPTO') {
    return {
      address: config.address,
      network: config.network,
      instructions: config.instructions,
    };
  }
  if (provider === 'FLUTTERWAVE') {
    return { testMode: config.testMode };
  }
  if (provider === 'PAYSTACK') {
    return { testMode: config.testMode };
  }
  return undefined;
}

router.get('/methods', async (_req, res, next) => {
  try {
    const methods = await prisma.paymentMethodConfig.findMany({
      where: { enabled: true },
      orderBy: { name: 'asc' },
    });
    res.json({
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        enabled: m.enabled,
        publicKey: m.publicKey,
        config: safePublicConfig(m.provider, m.config),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:paymentId/proof', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { image, note } = req.body as { image?: string; note?: string };
    if (!image) throw new ApiError(400, 'Proof image is required');
    if (image.length > 2_000_000) throw new ApiError(400, 'Image is too large');
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new ApiError(404, 'Payment not found');
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'PENDING' } });
      await tx.paymentAttempt.create({
        data: {
          paymentId,
          status: 'PENDING',
          payload: { image, note: note ?? '', uploadedAt: new Date().toISOString() },
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'PENDING_PAYMENT',
          actor: 'customer',
          note: 'Payment proof uploaded',
        },
      });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:paymentId/verify', async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { idempotencyKey } = paymentVerifySchema.parse(req.body);
    const result = await verifyPayment(prisma, paymentId, idempotencyKey);
    res.json({ ok: true, payment: result.payment, order: result.order });
  } catch (err) {
    next(err);
  }
});

export default router;
