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
