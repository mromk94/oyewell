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

export async function fetchAdminOrders() {
  const res = await fetch(`${API_BASE}/api/admin/orders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json() as Promise<{ orders: any[] }>;
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

export async function fetchCustomerOrders(customerId: string) {
  const res = await fetch(`${API_BASE}/api/admin/customers/${customerId}/orders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load customer orders');
  return res.json() as Promise<{ orders: any[] }>;
}
