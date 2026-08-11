import { Router, raw } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../prisma.js';
import { confirmPayment, failPayment } from '../lib/payment.js';
import { getProvider } from '../lib/payment-providers.js';
import { PaymentProvider } from '@prisma/client';

const router = Router();

// Webhook bodies must be read raw for signature verification.
router.use(raw({ type: '*/*', limit: '1mb' }));

function rawBody(req: any): Buffer {
  return Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
}

async function settleByProviderRef(provider: PaymentProvider, providerRef: string) {
  const payment = await prisma.payment.findFirst({ where: { provider, providerRef } });
  if (!payment) return { handled: false };
  // Never trust the webhook payload alone: re-verify with the provider before confirming.
  const adapter = getProvider(provider);
  const verification = await adapter.verify(providerRef);
  if (verification.status === 'SUCCESS') {
    if (verification.amountKobo != null && verification.amountKobo !== payment.amountKobo) {
      console.error(`[webhook] amount mismatch for payment ${payment.id}: expected ${payment.amountKobo}, got ${verification.amountKobo}`);
      return { handled: false };
    }
    if (verification.currency && verification.currency !== payment.currency) {
      console.error(`[webhook] currency mismatch for payment ${payment.id}`);
      return { handled: false };
    }
    await confirmPayment(prisma, payment.id, {
      actor: `webhook:${provider}`,
      providerRef,
      note: `Confirmed via ${provider} webhook`,
    });
    return { handled: true };
  }
  if (verification.status === 'FAILED') {
    await failPayment(prisma, payment.id, { actor: `webhook:${provider}`, note: `Failed via ${provider} webhook` });
    return { handled: true };
  }
  return { handled: false };
}

// --- Paystack: x-paystack-signature = HMAC SHA512 of raw body with secret key
router.post('/paystack', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.status(503).json({ error: 'Not configured' });
    const body = rawBody(req);
    const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');
    if (signature !== req.headers['x-paystack-signature']) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const event = JSON.parse(body.toString('utf8'));
    if (event?.event === 'charge.success' && event?.data?.reference) {
      await settleByProviderRef(PaymentProvider.PAYSTACK, String(event.data.reference));
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[webhook:paystack]', e);
    res.status(200).json({ ok: true }); // acknowledge; verification is re-run on retry paths
  }
});

// --- Flutterwave: verif-hash header must equal FLUTTERWAVE_WEBHOOK_HASH
router.post('/flutterwave', async (req, res) => {
  try {
    const hash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    if (!hash) return res.status(503).json({ error: 'Not configured' });
    if (req.headers['verif-hash'] !== hash) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const event = JSON.parse(rawBody(req).toString('utf8'));
    const txRef = event?.data?.tx_ref ?? event?.txRef;
    if (txRef) {
      await settleByProviderRef(PaymentProvider.FLUTTERWAVE, String(txRef));
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[webhook:flutterwave]', e);
    res.status(200).json({ ok: true });
  }
});

// --- Stripe: stripe-signature header (t=timestamp,v1=HMAC SHA256 of `${t}.${body}`)
router.post('/stripe', async (req, res) => {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(503).json({ error: 'Not configured' });
    const body = rawBody(req);
    const header = String(req.headers['stripe-signature'] ?? '');
    const parts = Object.fromEntries(
      header.split(',').map((p) => {
        const [k, ...v] = p.split('=');
        return [k, v.join('=')];
      }),
    ) as Record<string, string>;
    if (!parts.t || !parts.v1) return res.status(401).json({ error: 'Invalid signature' });
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${parts.t}.${body.toString('utf8')}`)
      .digest('hex');
    const valid =
      expected.length === parts.v1.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });

    const event = JSON.parse(body.toString('utf8'));
    const intentId = event?.data?.object?.id;
    if (
      intentId &&
      ['payment_intent.succeeded', 'payment_intent.payment_failed', 'payment_intent.canceled'].includes(event?.type)
    ) {
      await settleByProviderRef(PaymentProvider.STRIPE, String(intentId));
    }
    res.json({ received: true });
  } catch (e) {
    console.error('[webhook:stripe]', e);
    res.status(200).json({ received: true });
  }
});

export default router;
