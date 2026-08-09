export const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchFoods() {
  const res = await fetch(`${API_BASE}/api/foods`);
  if (!res.ok) throw new Error('Failed to load foods');
  return res.json() as Promise<{ foods: FoodItem[] }>;
}

export async function fetchFood(slug: string) {
  const res = await fetch(`${API_BASE}/api/foods/${slug}`);
  if (!res.ok) throw new Error('Failed to load food');
  return res.json() as Promise<FoodItem>;
}

export async function fetchSides() {
  const res = await fetch(`${API_BASE}/api/sides`);
  if (!res.ok) throw new Error('Failed to load sides');
  return res.json() as Promise<{ sides: Side[] }>;
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

export interface DeliveryResult {
  available: boolean;
  message: string;
  zone?: { id: string; name: string; feeKobo: number; estimatedMinutes: number | null };
  subtotalKobo: number;
  subtotal: string;
  deliveryFeeKobo: number;
  deliveryFee: string;
  totalKobo: number;
  total: string;
  sides: Side[];
  sidesKobo: number;
}

export interface CartItemPayload {
  foodSlug: string;
  optionId: string;
  quantity: number;
  sideIds: string[];
}

export async function checkDelivery(payload: {
  address: string;
  phone: string;
  items: CartItemPayload[];
}): Promise<DeliveryResult> {
  const res = await fetch(`${API_BASE}/api/delivery/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as DeliveryResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Delivery check failed');
  return data;
}

export interface CreatedOrder {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    subtotal: string;
    deliveryFee: string;
    total: string;
    address: string;
    phone: string;
    estimatedMinutes: number | null;
  };
  payment: { id: string; idempotencyKey: string; provider: string; status?: string };
}

export async function createOrder(
  payload: {
    items: CartItemPayload[];
    address: string;
    phone: string;
    paymentProvider: string;
  },
  customerToken?: string | null
): Promise<CreatedOrder> {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as CreatedOrder & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Order creation failed');
  return data;
}

export async function uploadPaymentProof(paymentId: string, image: string, note?: string) {
  const res = await fetch(`${API_BASE}/api/payments/${paymentId}/proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, note }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data;
}

export async function verifyPayment(paymentId: string, idempotencyKey: string) {
  const res = await fetch(`${API_BASE}/api/payments/${paymentId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idempotencyKey }),
  });
  const data = (await res.json()) as { ok: boolean; order: { orderNumber: string }; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Payment verification failed');
  return data;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  address: string;
  phone: string;
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
    attempts: { id: string; status: string; payload: any; createdAt: string }[];
  } | null;
  statusHistory: { status: string; note: string; createdAt: string }[];
}

export async function fetchOrder(orderNumber: string): Promise<{ order: OrderSummary }> {
  const res = await fetch(`${API_BASE}/api/orders/${orderNumber}`);
  if (!res.ok) throw new Error('Failed to load order');
  return res.json() as Promise<{ order: OrderSummary }>;
}

function authHeaders(token?: string | null) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getCustomerToken(): string | null {
  return localStorage.getItem('customer_token');
}

export function setCustomerToken(token: string) {
  localStorage.setItem('customer_token', token);
}

export function removeCustomerToken() {
  localStorage.removeItem('customer_token');
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
}

export async function register(body: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { token?: string; user?: User; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Registration failed');
  if (data.token) setCustomerToken(data.token);
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { token?: string; user?: User; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Login failed');
  if (data.token) setCustomerToken(data.token);
  return data;
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders(getCustomerToken()) });
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json() as Promise<{ user: User }>;
}

export async function fetchMyOrders() {
  const res = await fetch(`${API_BASE}/api/auth/orders`, { headers: authHeaders(getCustomerToken()) });
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json() as Promise<{ orders: OrderSummary[] }>;
}

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  publicKey?: string;
  config?: any;
}

export async function fetchPaymentMethods() {
  const res = await fetch(`${API_BASE}/api/payments/methods`);
  if (!res.ok) throw new Error('Failed to load payment methods');
  return res.json() as Promise<{ methods: PaymentMethod[] }>;
}

export async function updateProfile(profile: { firstName?: string; lastName?: string; phone?: string }) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'PUT',
    headers: authHeaders(getCustomerToken()),
    body: JSON.stringify(profile),
  });
  const data = (await res.json()) as { user?: User; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update profile');
  return data as { user: User };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(getCustomerToken()),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to change password');
  return data;
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as { message?: string; resetToken?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to request reset');
  return data;
}

export async function resetPassword(email: string, resetToken: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to reset password');
  return data;
}
