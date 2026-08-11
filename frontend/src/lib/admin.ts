import { API_BASE } from './api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { token?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Login failed');
  if (data.token) localStorage.setItem('admin_token', data.token);
  return data;
}

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/api/admin/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function fetchAdminFoods() {
  const res = await fetch(`${API_BASE}/api/admin/foods`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load foods');
  return res.json() as Promise<{ foods: any[] }>;
}

export async function createFood(body: any) {
  const res = await fetch(`${API_BASE}/api/admin/foods`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { food?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to create food');
  return data;
}

export async function updateFood(id: string, body: any) {
  const res = await fetch(`${API_BASE}/api/admin/foods/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { food?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update food');
  return data;
}

export async function archiveFood(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/foods/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to archive food');
  return data;
}

export async function fetchAdminOrders(skip = 0, limit = 100) {
  const res = await fetch(`${API_BASE}/api/admin/orders?skip=${skip}&limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json() as Promise<{ orders: any[]; total: number; skip: number; limit: number }>;
}

export async function fetchRiders() {
  const res = await fetch(`${API_BASE}/api/admin/riders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load riders');
  return res.json() as Promise<{ riders: any[] }>;
}

export async function fetchRiderLocations() {
  const res = await fetch(`${API_BASE}/api/admin/riders/locations`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load rider locations');
  return res.json() as Promise<{ riders: { id: string; name: string; lat: number; lng: number; updatedAt: string }[] }>;
}

export async function fetchCookLocations() {
  const res = await fetch(`${API_BASE}/api/admin/cooks/locations`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load cook locations');
  return res.json() as Promise<{ cooks: { id: string; name: string; lat: number; lng: number; listings: number }[] }>;
}

export async function assignRider(orderNumber: string, riderId: string, riderFeeKobo: number) {
  const res = await fetch(`${API_BASE}/api/admin/orders/${orderNumber}/assign-rider`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ riderId, riderFeeKobo }),
  });
  const data = (await res.json()) as { order?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to assign rider');
  return data;
}

export async function updateOrderStatus(id: string, status: string) {
  const res = await fetch(`${API_BASE}/api/admin/orders/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = (await res.json()) as { order?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update status');
  return data;
}

export async function verifyOrderPayment(id: string, body: { accepted: boolean; note?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/orders/${id}/verify-payment`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok?: boolean; order?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to verify payment');
  return data;
}

export async function fetchDeliveryZones() {
  const res = await fetch(`${API_BASE}/api/admin/delivery-zones`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load zones');
  return res.json() as Promise<{ zones: any[] }>;
}

export async function createDeliveryZone(body: any) {
  const res = await fetch(`${API_BASE}/api/admin/delivery-zones`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create zone');
  return res.json();
}

export async function deleteDeliveryZone(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/delivery-zones/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete zone');
  return res.json();
}

export async function fetchPaymentMethods() {
  const res = await fetch(`${API_BASE}/api/admin/payment-methods`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load methods');
  return res.json() as Promise<{ methods: any[] }>;
}

export async function createPaymentMethod(body: { name: string; provider: string; publicKey?: string; config?: Record<string, any>; enabled?: boolean }) {
  const res = await fetch(`${API_BASE}/api/admin/payment-methods`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { method?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to create method');
  return data;
}

export async function updatePaymentMethod(id: string, body: { name?: string; provider?: string; publicKey?: string; config?: Record<string, any>; enabled?: boolean }) {
  const res = await fetch(`${API_BASE}/api/admin/payment-methods/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { method?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update method');
  return data;
}

export async function deletePaymentMethod(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/payment-methods/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to delete method');
  return data;
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/api/admin/settings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json() as Promise<{ settings: any }>;
}

export async function updateSettings(body: any) {
  const res = await fetch(`${API_BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function fetchSides() {
  const res = await fetch(`${API_BASE}/api/admin/sides`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load sides');
  return res.json() as Promise<{ sides: any[] }>;
}

export async function createSide(body: { name: string; description: string | null; priceKobo: number; isAvailable: boolean }) {
  const res = await fetch(`${API_BASE}/api/admin/sides`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { side?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to create side');
  return data;
}

export async function updateSide(id: string, body: any) {
  const res = await fetch(`${API_BASE}/api/admin/sides/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { side?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update side');
  return data;
}

export async function deleteSide(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/sides/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to delete side');
  return data;
}

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/api/admin/customers`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json() as Promise<{ customers: any[] }>;
}

export async function updateCustomerRole(customerId: string, role: string) {
  const res = await fetch(`${API_BASE}/api/admin/customers/${customerId}/role`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = (await res.json()) as { user?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update role');
  return data;
}

export async function fetchCustomerOrders(customerId: string) {
  const res = await fetch(`${API_BASE}/api/admin/customers/${customerId}/orders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load customer orders');
  return res.json() as Promise<{ orders: any[] }>;
}

export async function fetchEmailConfig() {
  const res = await fetch(`${API_BASE}/api/admin/email-config`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load email config');
  return res.json() as Promise<{ config: any }>;
}

export async function updateEmailConfig(body: any) {
  const res = await fetch(`${API_BASE}/api/admin/email-config`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { config?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to save email config');
  return data;
}

export async function fetchPendingRiders() {
  const res = await fetch(`${API_BASE}/api/admin/riders/pending`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load pending riders');
  return res.json() as Promise<{ riders: any[] }>;
}

export async function approveRider(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/riders/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { rider?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to approve rider');
  return data;
}

export async function pauseRider(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/riders/${id}/pause`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to pause rider');
  return res.json();
}

export async function suspendRider(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/riders/${id}/suspend`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to suspend rider');
  return res.json();
}

export async function banRider(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/riders/${id}/ban`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to ban rider');
  return res.json();
}

export async function restoreRider(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/riders/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to restore rider');
  return res.json();
}

export async function sendTestEmail(to: string, subject: string, text: string) {
  const res = await fetch(`${API_BASE}/api/admin/email-config/test`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to, subject, text }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to send test email');
  return data;
}

export async function fetchAdminCooks() {
  const res = await fetch(`${API_BASE}/api/admin/cooks`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load cooks');
  return res.json() as Promise<{ cooks: any[] }>;
}

export async function approveCook(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/cooks/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to approve cook');
  return res.json();
}

export async function rejectCook(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/cooks/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reject cook');
  return res.json();
}

export async function fetchAdminCookListings() {
  const res = await fetch(`${API_BASE}/api/admin/cook-listings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load cook listings');
  return res.json() as Promise<{ listings: any[] }>;
}

export async function approveCookListing(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/cook-listings/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to approve listing');
  return res.json();
}

export async function rejectCookListing(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/cook-listings/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reject listing');
  return res.json();
}

export async function fetchAdminCookEarnings() {
  const res = await fetch(`${API_BASE}/api/admin/cook-earnings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load cook earnings');
  return res.json() as Promise<{ pendingKobo: number; settledKobo: number }>;
}
