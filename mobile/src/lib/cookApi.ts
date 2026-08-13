import { api } from './api';

export interface CookOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  riderStatus?: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  address: string;
  phone: string;
  riderFee?: string;
  pickupCode?: string | null;
  pickupCodeVerifiedAt?: string | null;
  createdAt: string;
  items: { foodName: string; quantity: number; totalKobo: number }[];
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
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  media: { id: string; type: 'IMAGE' | 'VIDEO'; url: string; thumbnailUrl?: string | null }[];
}

export interface CookListingInput {
  title: string;
  description?: string;
  priceKobo: number;
  portionDescription?: string;
  prepTimeMinutesMin?: number;
  prepTimeMinutesMax?: number;
  stock: number;
  quantity: number;
  ingredients?: string;
  allergens?: string;
  cuisine?: string;
  media: { id?: string; type: 'IMAGE' | 'VIDEO'; url: string }[];
  resubmit?: boolean;
}

export interface CookEarnings {
  totalKobo: number;
  availableKobo: number;
  total: string;
  available: string;
}

export function fetchCookProfile() {
  return api<{ cook: CookProfile }>('/api/cooks/me');
}

export function applyAsCook(body: {
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
  return api<{ cook: CookProfile }>('/api/cooks/apply', { method: 'POST', body: JSON.stringify(body) });
}

export function updateCookMe(body: Partial<CookProfile>) {
  return api<{ cook: CookProfile }>('/api/cooks/me', { method: 'PUT', body: JSON.stringify(body) });
}

export function uploadCookMedia(file: string, type: 'IMAGE' | 'VIDEO') {
  return api<{ media: { id: string; url: string; thumbnailUrl?: string | null } }>('/api/media/upload', { method: 'POST', body: JSON.stringify({ file, type }) });
}

export function fetchCookListings() {
  return api<{ listings: CookListing[] }>('/api/cooks/me/listings');
}

export function createCookListing(body: CookListingInput) {
  return api<{ listing: CookListing }>('/api/cooks/me/listings', { method: 'POST', body: JSON.stringify(body) });
}

export function updateCookListing(id: string, body: Partial<CookListingInput>) {
  return api<{ listing: CookListing }>(`/api/cooks/me/listings/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function deleteCookListing(id: string) {
  return api<{ ok: true }>(`/api/cooks/me/listings/${id}`, { method: 'DELETE' });
}

export function updateCookListingAvailability(id: string, isAvailable: boolean) {
  return api<{ listing: CookListing }>(`/api/cooks/me/listings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable }),
  });
}

export function updateKitchenStatus(status: 'OPEN' | 'CLOSED' | 'PAUSED') {
  return api<{ kitchenStatus: string }>('/api/cooks/me/kitchen-status', {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export function fetchCookEarnings() {
  return api<{ earnings: CookEarnings }>('/api/cooks/me/earnings');
}

export function fetchCookOrders() {
  return api<{ orders: CookOrder[] }>('/api/cooks/me/orders');
}

export function acceptCookOrder(orderNumber: string) {
  return api<{ order: CookOrder }>(`/api/cooks/me/orders/${orderNumber}/accept`, { method: 'POST' });
}

export function preparingCookOrder(orderNumber: string) {
  return api<{ order: CookOrder }>(`/api/cooks/me/orders/${orderNumber}/preparing`, { method: 'POST' });
}

export function readyCookOrder(orderNumber: string) {
  return api<{ order: CookOrder }>(`/api/cooks/me/orders/${orderNumber}/ready`, { method: 'POST' });
}

export function fetchCookMe() {
  return api<{ cook: CookProfile | null }>('/api/cooks/me');
}
