import { API_BASE, type User } from './api';

function authHeaders() {
  const token = localStorage.getItem('customer_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface CookProfile {
  id: string;
  userId: string;
  displayName: string;
  profilePhoto?: string | null;
  bio?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm: number;
  cuisineSpecialty?: string | null;
  profileStatus: string;
  kitchenStatus: string;
  rating: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface CookListing {
  id: string;
  cookId: string;
  title: string;
  description?: string | null;
  priceKobo: number;
  price: string;
  currency: string;
  portionDescription?: string | null;
  prepTimeMinutesMin?: number | null;
  prepTimeMinutesMax?: number | null;
  quantity: number;
  stock: number;
  ingredients?: string | null;
  allergens?: string | null;
  cuisine?: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  media: CookListingMedia[];
}

export interface CookListingMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string | null;
  ordering: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

export interface CookOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  address: string;
  phone: string;
  riderFee?: string;
  createdAt: string;
  items: { foodName: string; quantity: number; totalKobo: number }[];
}

export interface CookEarningsSummary {
  totalKobo: number;
  settledKobo: number;
}

export async function applyAsCook(body: {
  displayName: string;
  bio?: string;
  latitude?: number;
  longitude?: number;
  neighborhood?: string;
  serviceRadiusKm?: number;
  cuisineSpecialty?: string;
  profilePhoto?: string;
  packagingPhotos?: string[];
  safetyAcknowledgements?: string[];
  categories?: string[];
  signatureDishes?: string[];
  capacity?: string;
  prepTime?: string;
}) {
  const res = await fetch(`${API_BASE}/api/cooks/apply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { cook?: CookProfile; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Application failed');
  return data;
}

export async function fetchCookMe(): Promise<{ cook: CookProfile }> {
  const res = await fetch(`${API_BASE}/api/cooks/me`, { headers: authHeaders() });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Failed to load cook profile (${res.status})`);
  }
  return res.json() as Promise<{ cook: CookProfile }>;
}

export async function updateCookMe(body: Partial<CookProfile>) {
  const res = await fetch(`${API_BASE}/api/cooks/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { cook?: CookProfile; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Update failed');
  return data;
}

export async function setKitchenStatus(status: string) {
  const res = await fetch(`${API_BASE}/api/cooks/me/kitchen-status`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = (await res.json()) as { cook?: CookProfile; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Status change failed');
  return data;
}

export interface CookMediaInput {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string | null;
}

export async function uploadCookMedia(file: string, type: 'IMAGE' | 'VIDEO') {
  const res = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ file, type }),
  });
  const data = (await res.json()) as CookMediaInput & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data;
}

export async function createCookListing(body: any) {
  const res = await fetch(`${API_BASE}/api/cooks/me/listings`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { listing?: CookListing; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to create listing');
  return data;
}

export async function updateCookListing(id: string, body: any) {
  const res = await fetch(`${API_BASE}/api/cooks/me/listings/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { listing?: CookListing; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update listing');
  return data;
}

export async function fetchCookListings(): Promise<{ listings: CookListing[] }> {
  const res = await fetch(`${API_BASE}/api/cooks/me/listings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load listings');
  return res.json() as Promise<{ listings: CookListing[] }>;
}

export async function deleteCookListing(id: string) {
  const res = await fetch(`${API_BASE}/api/cooks/me/listings/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to delete listing');
  return data;
}

export async function fetchCookOrders(): Promise<{ orders: CookOrder[] }> {
  const res = await fetch(`${API_BASE}/api/cooks/me/orders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json() as Promise<{ orders: CookOrder[] }>;
}

export async function acceptCookOrder(orderNumber: string) {
  const res = await fetch(`${API_BASE}/api/cooks/me/orders/${orderNumber}/accept`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { order?: CookOrder; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Accept failed');
  return data;
}

export async function preparingCookOrder(orderNumber: string) {
  const res = await fetch(`${API_BASE}/api/cooks/me/orders/${orderNumber}/preparing`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { order?: CookOrder; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Update failed');
  return data;
}

export async function readyCookOrder(orderNumber: string) {
  const res = await fetch(`${API_BASE}/api/cooks/me/orders/${orderNumber}/ready`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { order?: CookOrder; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Update failed');
  return data;
}

export async function fetchCookEarnings(): Promise<CookEarningsSummary> {
  const res = await fetch(`${API_BASE}/api/cooks/me/earnings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load earnings');
  return res.json() as Promise<CookEarningsSummary>;
}
