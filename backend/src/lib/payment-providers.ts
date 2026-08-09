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

export interface PaymentProviderAdapter {
  name: string;
  initialize(): Promise<void> | void;
  charge(request: ProviderPaymentRequest): Promise<ProviderPayment>;
  verify(providerRef: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING'; providerRef: string; raw?: unknown }>;
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

class PaystackProvider implements PaymentProviderAdapter {
  name = 'PAYSTACK';
  private secretKey?: string;

  initialize() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!this.secretKey) throw new ApiError(500, 'PAYSTACK_SECRET_KEY is not configured');
  }

  async charge(request: ProviderPaymentRequest): Promise<ProviderPayment> {
    throw new ApiError(501, 'Paystack charge not implemented');
  }

  async verify(providerRef: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING'; providerRef: string; raw?: unknown }> {
    throw new ApiError(501, 'Paystack verify not implemented');
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
    throw new ApiError(501, 'Stripe charge not implemented');
  }

  async verify(providerRef: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING'; providerRef: string; raw?: unknown }> {
    throw new ApiError(501, 'Stripe verify not implemented');
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

  async verify(providerRef: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING'; providerRef: string; raw?: unknown }> {
    return { status: 'PENDING', providerRef };
  }
}

const ADAPTERS: Record<string, PaymentProviderAdapter> = {
  MOCK: new MockProvider(),
  PAYSTACK: new PaystackProvider(),
  STRIPE: new StripeProvider(),
  FLUTTERWAVE: new ManualProvider('FLUTTERWAVE'),
  CRYPTO: new ManualProvider('CRYPTO'),
  BANK_TRANSFER: new ManualProvider('BANK_TRANSFER'),
};

export function getProvider(provider: PaymentProvider): PaymentProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) throw new ApiError(400, 'Unsupported payment provider');
  adapter.initialize();
  return adapter;
}
