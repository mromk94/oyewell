import { API_BASE } from './api';

const R = (path: string) => `${API_BASE}/api/rider${path}`;

function getToken() {
  return localStorage.getItem('rider_token') || '';
}

function headers() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

export interface RiderOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  riderFee?: string;
  address: string;
  phone: string;
  deliveryCode?: string;
  estimatedMinutes?: number;
  createdAt: string;
  items: { id: string; foodName: string; optionLabel: string; quantity: number; totalKobo: number }[];
  sides: { id: string; name: string; quantity: number; priceKobo: number }[];
  statusHistory: { status: string; note: string; createdAt: string }[];
}

export interface RiderRegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  vehicle?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
}

export interface Rider {
  id: string;
  userId: string;
  vehicle?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  isActive: boolean;
  available: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string };
}

export interface RiderLoginInput {
  email: string;
  password: string;
}

export async function riderRegister(body: RiderRegisterInput) {
  const res = await fetch(R('/register'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Registration failed');
  return json as { message: string; rider: Rider };
}

export async function riderLogin(body: RiderLoginInput) {
  const res = await fetch(R('/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Login failed');
  localStorage.setItem('rider_token', json.token);
  return json as { token: string; rider: Rider };
}

export function riderLogout() {
  localStorage.removeItem('rider_token');
}

export async function fetchRiderMe() {
  const res = await fetch(R('/me'), { headers: { Authorization: `Bearer ${getToken()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load rider');
  return json as { rider: Rider; user: any };
}

export async function updateRiderAvailability(available: boolean) {
  const res = await fetch(R('/me/availability'), { method: 'PUT', headers: headers(), body: JSON.stringify({ available }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Update failed');
  return json.rider as Rider;
}

export async function updateRiderMe(body: Partial<Pick<Rider, 'vehicle' | 'bankName' | 'bankAccountName' | 'bankAccountNumber'>>) {
  const res = await fetch(R('/me'), { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Update failed');
  return json.rider as Rider;
}

export async function fetchRiderOrders() {
  const res = await fetch(R('/orders'), { headers: { Authorization: `Bearer ${getToken()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load orders');
  return json.orders as RiderOrder[];
}

export async function fetchAvailableOrders() {
  const res = await fetch(R('/available'), { headers: { Authorization: `Bearer ${getToken()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load available orders');
  return json.orders as RiderOrder[];
}

export async function claimOrder(orderNumber: string) {
  const res = await fetch(R(`/orders/${orderNumber}/claim`), { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Claim failed');
  return json.order as RiderOrder;
}

export async function verifyDeliveryCode(orderNumber: string, code: string) {
  const res = await fetch(R(`/orders/${orderNumber}/verify`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ code }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Verification failed');
  return json.order as RiderOrder;
}

export async function fetchRiderEarnings() {
  const res = await fetch(R('/earnings'), { headers: { Authorization: `Bearer ${getToken()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to load earnings');
  return json as { totalDelivered: number; totalEarnings: string; paidOut: string; pendingPayout: string };
}
