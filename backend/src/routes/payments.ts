import { Router } from 'express';
import { prisma } from '../prisma.js';
import { verifyPayment } from '../lib/payment.js';
import { paymentVerifySchema } from '../lib/validation.js';
import { ApiError } from '../lib/errors.js';
import { cache } from '../lib/cache.js';
import { emitEvent } from '../lib/realtime.js';
import { getCurrencies } from '../lib/money.js';

const router = Router();

function safePublicConfig(provider: string, config: any) {
  if (!config) return undefined;
  if (provider === 'BANK_TRANSFER') {
    return {
      accountName: config.accountName,
      bankName: config.bankName,
      instructions: config.instructions,
    };
  }
  if (provider === 'CRYPTO') {
    return {
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

const PAYMENT_METHODS_CACHE_KEY = 'payments:methods:public';
const PAYMENT_METHODS_TTL = 60;

async function loadPublicPaymentMethods() {
  const [methods, currencies] = await Promise.all([
    prisma.paymentMethodConfig.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } }),
    getCurrencies(),
  ]);
  return {
    currencies,
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      enabled: m.enabled,
      publicKey: m.publicKey,
      currency: (m.config as any)?.currency ?? 'NGN',
      config: safePublicConfig(m.provider, m.config),
    })),
  };
}

router.get('/methods', async (_req, res, next) => {
  try {
    const data = await cache.getOrSet(PAYMENT_METHODS_CACHE_KEY, loadPublicPaymentMethods, { ttlSeconds: PAYMENT_METHODS_TTL, jitter: true });
    res.setHeader('Cache-Control', `public, max-age=${PAYMENT_METHODS_TTL}, stale-while-revalidate=${PAYMENT_METHODS_TTL}`);
    res.json(data);
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
    if (payment.status === 'SUCCESS') throw new ApiError(400, 'Payment already confirmed');
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'PROCESSING' } });
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'UNDER_REVIEW' } });
      await tx.paymentAttempt.create({
        data: {
          paymentId,
          status: 'PROCESSING',
          payload: { image, note: note ?? '', uploadedAt: new Date().toISOString() },
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'PENDING_PAYMENT',
          actor: 'customer',
          note: 'Payment proof uploaded — under review',
        },
      });
    });
    emitEvent('payment:proof', {
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      paymentId,
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
