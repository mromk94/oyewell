import { PaymentProvider } from '@prisma/client';
import { ApiError } from './errors.js';

export interface ProviderPaymentRequest {
  orderNumber: string;
  amountKobo: number;
  currency: string;
  idempotencyKey: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderPayment {
  providerRef: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  redirectUrl?: string;
  authorization?: unknown;
}

export interface ProviderVerification {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  providerRef: string;
  amountKobo?: number;
  currency?: string;
  raw?: unknown;
}

export interface PaymentProviderAdapter {
  name: string;
  initialize(): Promise<void> | void;
  charge(request: ProviderPaymentRequest): Promise<ProviderPayment>;
  verify(providerRef: string): Promise<ProviderVerification>;
}

class MockProvider implements PaymentProviderAdapter {
  name = 'MOCK';
  initialize() {}

  async charge(request: ProviderPaymentRequest): Promise<ProviderPayment> {
    return {
      providerRef: request.idempotencyKey,
      status: 'PENDING',
    };
  }

  async verify(providerRef: string) {
    return { status: 'SUCCESS' as const, providerRef };
  }
}

async function httpJson(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.message ?? (data as any)?.error?.message ?? `Provider request failed (${res.status})`;
    throw new ApiError(502, String(message), 'PROVIDER_ERROR');
  }
  return data;
}

class PaystackProvider implements PaymentProviderAdapter {
  name = 'PAYSTACK';
  private secretKey?: string;

  initialize() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!this.secretKey) throw new ApiError(500, 'PAYSTACK_SECRET_KEY is not configured');
  }

  async charge(request: ProviderPaymentRequest): Promise<ProviderPayment> {
    const reference = `ps_${request.idempotencyKey}`;
    const data = await httpJson('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: request.email ?? 'guest@oyewell.com',
        amount: request.amountKobo, // Paystack NGN amount is in kobo
        currency: request.currency,
        reference,
        metadata: { ...request.metadata, orderNumber: request.orderNumber },
        callback_url: process.env.PAYMENT_CALLBACK_URL || undefined,
      }),
    });
    return {
      providerRef: reference,
      status: 'PENDING',
      redirectUrl: data?.data?.authorization_url,
    };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    const data = await httpJson(`https://api.paystack.co/transaction/verify/${encodeURIComponent(providerRef)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const tx = data?.data;
    const status = tx?.status === 'success' ? 'SUCCESS' : tx?.status === 'failed' ? 'FAILED' : 'PENDING';
    return {
      status,
      providerRef,
      amountKobo: typeof tx?.amount === 'number' ? tx.amount : undefined,
      currency: tx?.currency,
      raw: tx,
    };
  }
}

class FlutterwaveProvider implements PaymentProviderAdapter {
  name = 'FLUTTERWAVE';
  private secretKey?: string;

  initialize() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!this.secretKey) throw new ApiError(500, 'FLUTTERWAVE_SECRET_KEY is not configured');
  }

  async charge(request: ProviderPaymentRequest): Promise<ProviderPayment> {
    const reference = `flw_${request.idempotencyKey}`;
    const data = await httpJson('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: request.amountKobo / 100, // Flutterwave expects major units
        currency: request.currency,
        redirect_url: process.env.PAYMENT_CALLBACK_URL || 'https://oyewell.com/payment/callback',
        customer: { email: request.email ?? 'guest@oyewell.com' },
        meta: { ...request.metadata, orderNumber: request.orderNumber },
      }),
    });
    return {
      providerRef: reference,
      status: 'PENDING',
      redirectUrl: data?.data?.link,
    };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    const data = await httpJson(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(providerRef)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.secretKey}` },
      },
    );
    const tx = data?.data;
    const status = tx?.status === 'successful' ? 'SUCCESS' : tx?.status === 'failed' ? 'FAILED' : 'PENDING';
    return {
      status,
      providerRef,
      amountKobo: typeof tx?.amount === 'number' ? Math.round(tx.amount * 100) : undefined,
      currency: tx?.currency,
      raw: tx,
    };
  }
}

class StripeProvider implements PaymentProviderAdapter {
  name = 'STRIPE';
  private secretKey?: string;

  initialize() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    if (!this.secretKey) throw new ApiError(500, 'STRIPE_SECRET_KEY is not configured');
  }

  async charge(request: ProviderPaymentRequest): Promise<ProviderPayment> {
    // Server-side PaymentIntent; amount is calculated server-side by the caller.
    const body = new URLSearchParams({
      amount: String(request.amountKobo),
      currency: request.currency.toLowerCase(),
      'metadata[orderNumber]': request.orderNumber,
      'metadata[idempotencyKey]': request.idempotencyKey,
      'automatic_payment_methods[enabled]': 'true',
    });
    const data = await httpJson('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': request.idempotencyKey,
      },
      body: body.toString(),
    });
    return {
      providerRef: String(data?.id ?? ''),
      status: data?.status === 'succeeded' ? 'SUCCESS' : 'PENDING',
      authorization: { clientSecret: data?.client_secret },
    };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    const data = await httpJson(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(providerRef)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const status =
      data?.status === 'succeeded' ? 'SUCCESS' : data?.status === 'canceled' ? 'FAILED' : 'PENDING';
    return {
      status,
      providerRef,
      amountKobo: typeof data?.amount_received === 'number' && data.amount_received > 0 ? data.amount_received : undefined,
      currency: typeof data?.currency === 'string' ? data.currency.toUpperCase() : undefined,
      raw: data,
    };
  }
}

class ManualProvider implements PaymentProviderAdapter {
  constructor(public name: string) {}
  initialize() {}

  async charge(request: ProviderPaymentRequest): Promise<ProviderPayment> {
    return {
      providerRef: `manual:${request.idempotencyKey}`,
      status: 'PENDING',
    };
  }

  async verify(providerRef: string): Promise<ProviderVerification> {
    // Manual payments are confirmed exclusively via admin review, never auto-verified.
    return { status: 'PENDING', providerRef };
  }
}

const ADAPTERS: Record<string, PaymentProviderAdapter> = {
  MOCK: new MockProvider(),
  PAYSTACK: new PaystackProvider(),
  STRIPE: new StripeProvider(),
  FLUTTERWAVE: new FlutterwaveProvider(),
  CRYPTO: new ManualProvider('CRYPTO'),
  BANK_TRANSFER: new ManualProvider('BANK_TRANSFER'),
};

export function getProvider(provider: PaymentProvider): PaymentProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new ApiError(400, 'Unsupported payment provider');
  adapter.initialize();
  return adapter;
}
