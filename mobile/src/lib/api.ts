import { getActiveToken } from './secureStorage';
import type { User } from '../types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

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
  order: { orderNumber: string };
}

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  isEnabled: boolean;
}

export async function fetchPaymentMethods() {
  return api<{ methods: PaymentMethod[] }>('/api/payments/methods');
}

export async function fetchBalance() {
  return api<{ balanceKobo: number; balance: string }>('/api/payments/balance');
}

export async function createOrder(payload: {
  address: string;
  phone: string;
  items: CartItemPayload[];
  deliveryType?: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  paymentMethod?: string;
  lat?: number;
  lng?: number;
  note?: string;
}): Promise<OrderResult> {
  return api<OrderResult>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
