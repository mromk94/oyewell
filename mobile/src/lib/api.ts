import { getActiveToken } from './secureStorage';
import type { User } from '../types';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getActiveToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error ?? data.message ?? 'Request failed');
  }
  return data as T;
}

export interface LoginResult {
  token: string;
  user: User;
}

export function loginAdmin(email: string, password: string) {
  return api<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function loginCustomer(email: string, password: string) {
  return api<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerCustomer(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  return api<LoginResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchMe() {
  return api<{ user: User }>('/api/auth/me');
}

export function forgotPassword(email: string) {
  return api<{ ok?: boolean; message?: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(email: string, resetToken: string, newPassword: string) {
  return api<{ ok?: boolean; message?: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
}

export interface Side {
  id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  price: string;
  isAvailable: boolean;
}

export interface FoodOption {
  id: string;
  label: string;
  value: string | null;
  priceKobo: number;
  price: string;
  isAvailable: boolean;
  stock: number | null;
}

export interface FoodItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  heroImage: string | null;
  galleryImages: string[];
  videos: string[];
  packagingCostKobo: number;
  isAvailable: boolean;
  featured: boolean;
  orderingMode: 'PLATE' | 'PORTION' | 'PIECE';
  priceFromKobo?: number;
  priceFrom?: string;
  options: FoodOption[];
}

export function formatPrice(priceKobo: number): string {
  const naira = priceKobo / 100;
  return `₦${naira.toLocaleString('en-NG')}`;
}

export async function fetchFoods() {
  return api<{ foods: FoodItem[] }>('/api/foods');
}

export async function fetchFood(slug: string) {
  return api<FoodItem>(`/api/foods/${slug}`);
}

export async function fetchSides() {
  return api<{ sides: Side[] }>('/api/sides');
}

export interface DeliveryResult {
  available: boolean;
  message: string;
  zone?: { id: string; name: string; feeKobo: number; estimatedMinutes: number | null };
  subtotalKobo: number;
  subtotal: string;
  platformFeeKobo: number;
  platformFee: string;
  deliveryFeeKobo: number;
  deliveryFee: string;
  totalKobo: number;
  total: string;
  sides: Side[];
  sidesKobo: number;
  deliveryType: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  estimatedMinutes: number | null;
  lat?: number;
  lng?: number;
}

export interface CartItemPayload {
  foodSlug?: string;
  optionId?: string;
  quantity: number;
  sideIds?: string[];
  cookListingId?: string;
}

export interface LocationResult {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationResult> {
  return api<LocationResult>(`/api/location/reverse?lat=${lat}&lng=${lng}`);
}

export async function checkDelivery(payload: {
  address: string;
  phone: string;
  items: CartItemPayload[];
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  lat?: number;
  lng?: number;
}): Promise<DeliveryResult> {
  return api<DeliveryResult>('/api/delivery/check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface OrderResult {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    deliveryCode: string;
  };
  payment: {
    id: string;
    idempotencyKey?: string;
    provider: string;
  };
}

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  publicKey?: string;
  currency: string;
  config?: Record<string, any>;
}

export async function fetchPaymentMethods() {
  return api<{ methods: PaymentMethod[] }>('/api/payments/methods');
}

export async function verifyPayment(paymentId: string, idempotencyKey: string) {
  return api<{ ok: boolean; order: { orderNumber: string } }>(`/api/payments/${paymentId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey }),
  });
}

export async function uploadPaymentProof(paymentId: string, image: string, note?: string) {
  return api<{ ok: true }>(`/api/payments/${paymentId}/proof`, {
    method: 'POST',
    body: JSON.stringify({ image, note }),
  });
}

export async function fetchBalance() {
  return api<{ balanceKobo: number; balance: string }>('/api/payments/balance');
}

export type CreateOrderPayload = {
  address: string;
  phone: string;
  source: 'RESTAURANT';
  items: CartItemPayload[];
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  paymentProvider?: string;
  paymentCurrency?: string;
  lat?: number;
  lng?: number;
  note?: string;
} | {
  address: string;
  phone: string;
  source: 'COOK';
  cookListingId: string;
  quantity: number;
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  paymentProvider?: string;
  paymentCurrency?: string;
  lat?: number;
  lng?: number;
  note?: string;
};

export async function createOrder(payload: CreateOrderPayload): Promise<OrderResult> {
  return api<OrderResult>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  subtotal: string;
  platformFee: string;
  deliveryFee: string;
  total: string;
  address: string;
  approximateArea: string;
  phone: string;
  deliveryCode?: string;
  cookId?: string;
  cookListingId?: string;
  cookName: string;
  estimatedMinutes?: number | null;
  riderId?: string;
  riderFee?: string;
  riderStatus?: string;
  riderLocation?: { lat: number; lng: number; updatedAt: string } | null;
  deliveredAt?: string;
  createdAt: string;
  items: {
    foodName: string;
    optionLabel: string;
    quantity: number;
    totalKobo: number;
  }[];
  sides: {
    name: string;
    quantity: number;
    priceKobo: number;
    totalKobo: number;
  }[];
  payment: {
    id: string;
    provider: string;
    status: string;
    method: {
      name: string;
      provider: string;
      publicKey?: string;
      config?: Record<string, any>;
    } | null;
    attempts: { id: string; status: string; payload: any; createdAt: string }[];
  } | null;
  statusHistory: { status: string; note: string; createdAt: string }[];
}

export async function fetchOrder(orderNumber: string) {
  return api<{ order: OrderSummary }>(`/api/orders/${encodeURIComponent(orderNumber)}`);
}

export async function createReview(payload: { orderNumber: string; rating: number; comment?: string; target: 'cook' | 'rider' }) {
  return api<{ review: any }>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createReport(payload: { targetId: string; targetType: 'RIDER' | 'COOK'; reason: string }) {
  return api<{ report: any }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(payload: { firstName?: string | null; lastName?: string | null; phone?: string | null }) {
  return api<{ user: User }>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return api<{ ok: boolean }>('/api/users/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchMyOrders() {
  return api<{ orders: OrderSummary[] }>('/api/auth/orders');
}

export interface DeliveryApplication {
  id: string;
  userId: string;
  isApproved: boolean;
  neighborhoodApproval: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  professionalApproval: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  onboardingData?: any;
}

export async function fetchDeliveryApplication() {
  return api<{ rider: DeliveryApplication | null }>('/api/rider/application');
}

export interface OnboardingField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'file' | 'number' | 'checkbox' | 'phone';
  required: boolean;
  active: boolean;
  order: number;
  gatingRule?: string;
  options: string[];
}

export async function fetchRiderOnboardingFields() {
  return api<{ fields: OnboardingField[] }>('/api/rider/onboarding/fields');
}

export async function applyAsDeliveryPartner(payload: {
  deliveryMode: string;
  vehicle?: string;
  operatingArea: string;
  serviceRadiusMeters: number;
  kycSubmitted: boolean;
  onboardingData?: Record<string, any>;
}) {
  return api<{ rider: DeliveryApplication }>('/api/rider/apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
