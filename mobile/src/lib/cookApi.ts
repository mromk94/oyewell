import { api } from './api';

export interface CookOrder {
  orderNumber: string;
  status: string;
  items: { name: string; quantity: number }[];
  totalKobo: number;
  createdAt: string;
}

export interface CookProfile {
  displayName: string;
  onboardingStep: string;
  kitchenStatus: string;
}

export function fetchCookProfile() {
  return api<{ cook: CookProfile }>('/api/cooks/me');
}

export interface CookListing {
  id: string;
  title: string;
  priceKobo: number;
  isAvailable: boolean;
}

export interface CookEarnings {
  totalKobo: number;
  availableKobo: number;
  total: string;
  available: string;
}

export function fetchCookListings() {
  return api<{ listings: CookListing[] }>('/api/cooks/me/listings');
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
