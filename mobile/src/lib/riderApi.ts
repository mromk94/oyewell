import { api } from './api';
import type { User } from '../types';

export interface RiderOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  riderStatus: string;
  deliveryType: 'NEIGHBORHOOD' | 'PROFESSIONAL';
  subtotal: string;
  deliveryFee: string;
  total: string;
  riderFee?: string;
  address: string;
  phone: string;
  deliveryCode?: string | null;
  estimatedMinutes?: number;
  approximateArea?: string;
  cookName?: string;
  pickupArea?: string;
  pickupLocation?: { lat: number; lng: number; address: string } | null;
  tripStartedAt?: string | null;
  createdAt: string;
  items: { id: string; foodName: string; optionLabel: string; quantity: number; totalKobo: number }[];
  sides: { id: string; name: string; quantity: number; priceKobo: number }[];
  statusHistory: { status: string; note: string; createdAt: string }[];
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
  neighborhoodApproval: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  professionalApproval: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  professionalUpgradeStatus: string;
  deliveryMode: 'WALK' | 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  serviceRadiusMeters: number;
  operatingArea?: string;
  kycStatus: string;
  createdAt: string;
  updatedAt: string;
  user?: User & { balanceKobo?: number };
}

export interface RiderEarnings {
  totalDelivered: number;
  totalEarnings: string;
  paidOut: string;
  pendingPayout: string;
}

export interface RiderPayout {
  id: string;
  amountKobo: number;
  status: 'PENDING' | 'SETTLED' | 'REJECTED';
  createdAt: string;
}

export function fetchRiderMe() {
  return api<{ rider: Rider; user: any }>('/api/rider/me');
}

export function updateRiderAvailability(available: boolean) {
  return api<{ rider: Rider }>('/api/rider/me/availability', {
    method: 'PUT',
    body: JSON.stringify({ available }),
  });
}

export function updateRiderMe(body: Partial<Pick<Rider, 'vehicle' | 'bankName' | 'bankAccountName' | 'bankAccountNumber' | 'operatingArea'>>) {
  return api<{ rider: Rider }>('/api/rider/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function fetchRiderOrders() {
  return api<{ orders: RiderOrder[] }>('/api/rider/orders');
}

export function fetchAvailableOrders() {
  return api<{ orders: RiderOrder[] }>('/api/rider/available');
}

export function claimOrder(orderNumber: string) {
  return api<{ order: RiderOrder }>(`/api/rider/orders/${orderNumber}/claim`, { method: 'POST' });
}

export function pickupOrder(orderNumber: string, code: string) {
  return api<{ order: RiderOrder }>(`/api/rider/orders/${orderNumber}/pickup`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function startTrip(orderNumber: string) {
  return api<{ order: RiderOrder }>(`/api/rider/orders/${orderNumber}/start-trip`, { method: 'POST' });
}

export function verifyDeliveryCode(orderNumber: string, code: string) {
  return api<{ order: RiderOrder }>(`/api/rider/orders/${orderNumber}/verify`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function fetchRiderEarnings() {
  return api<RiderEarnings>('/api/rider/earnings');
}

export function fetchRiderPayouts() {
  return api<{ payouts: RiderPayout[] }>('/api/rider/payouts');
}

export function withdrawRiderEarnings(idempotencyKey?: string) {
  return api<{ payout: RiderPayout }>('/api/rider/withdraw', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey }),
  });
}

export function applyProfessionalUpgrade(body: { documents: string[]; preferredDate?: string; vehicle?: string; deliveryMode?: string }) {
  return api<{ rider: Rider }>('/api/rider/professional/apply', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function sendRiderLocation(lat: number, lng: number, accuracy?: number) {
  return api('/api/rider/location', {
    method: 'POST',
    body: JSON.stringify({ latitude: lat, longitude: lng, accuracy }),
  });
}
