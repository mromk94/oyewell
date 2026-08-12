import { api } from './api';

export interface RiderDelivery {
  orderNumber: string;
  status: string;
  pickupCode?: string;
  deliveryCode?: string;
  customerAddress: string;
  totalKobo: number;
}

export interface RiderProfile {
  available: boolean;
  vehicle: string;
}

export function fetchRiderProfile() {
  return api<{ rider: RiderProfile }>('/api/rider/me');
}

export function updateRiderAvailability(available: boolean) {
  return api<{ rider: RiderProfile }>('/api/rider/me/availability', {
    method: 'PUT',
    body: JSON.stringify({ available }),
  });
}

export function fetchAvailableDeliveries() {
  return api<{ orders: RiderDelivery[] }>('/api/rider/available');
}

export function fetchRiderOrders() {
  return api<{ orders: RiderDelivery[] }>('/api/rider/orders');
}

export function claimDelivery(orderNumber: string) {
  return api<{ order: RiderDelivery }>(`/api/rider/orders/${orderNumber}/claim`, { method: 'POST' });
}

export function pickupDelivery(orderNumber: string, code: string) {
  return api<{ order: RiderDelivery }>(`/api/rider/orders/${orderNumber}/pickup`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function startTrip(orderNumber: string) {
  return api<{ order: RiderDelivery }>(`/api/rider/orders/${orderNumber}/start-trip`, { method: 'POST' });
}

export function verifyDelivery(orderNumber: string, code: string) {
  return api<{ order: RiderDelivery }>(`/api/rider/orders/${orderNumber}/verify`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function sendRiderLocation(lat: number, lng: number) {
  return api('/api/rider/location', {
    method: 'POST',
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}
