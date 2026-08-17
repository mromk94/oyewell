import { API_BASE } from './api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('customer_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function moderatorApply(payload: { city?: string; district?: string; area?: string; employeeId?: string; department?: string }) {
  const res = await fetch(`${API_BASE}/api/moderator/apply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; employee?: any };
  if (!res.ok) throw new Error(data.error ?? 'Application failed');
  return data;
}

export interface ModeratorMe {
  employee: {
    id: string;
    userId: string;
    employeeId: string;
    status: string;
    user: { id: string; email: string; firstName: string | null; lastName: string | null };
    permissions: string[];
    areas: any[];
  };
}

export async function fetchModeratorMe() {
  const res = await fetch(`${API_BASE}/api/moderator/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load moderator profile');
  return res.json() as Promise<ModeratorMe>;
}

export async function fetchModeratorDashboard() {
  const res = await fetch(`${API_BASE}/api/moderator/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}

export async function fetchModeratorTickets(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/api/moderator/tickets${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load tickets');
  return res.json() as Promise<{ tickets: any[] }>;
}

export async function updateModeratorTicket(id: string, body: { status?: string; resolution?: string; assignedTo?: string }) {
  const res = await fetch(`${API_BASE}/api/moderator/tickets/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update ticket');
  return res.json();
}

export async function fetchModeratorDisputes(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/api/moderator/disputes${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load disputes');
  return res.json() as Promise<{ disputes: any[] }>;
}

export async function updateModeratorDispute(id: string, body: { status?: string; resolution?: string; refundKobo?: number; assignedTo?: string }) {
  const res = await fetch(`${API_BASE}/api/moderator/disputes/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update dispute');
  return res.json();
}

export async function fetchModeratorReports(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/api/moderator/reports${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load reports');
  return res.json() as Promise<{ reports: any[] }>;
}

export async function updateModeratorReport(id: string, body: { status?: string; resolution?: string; assignedTo?: string }) {
  const res = await fetch(`${API_BASE}/api/moderator/reports/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update report');
  return res.json();
}

export async function fetchModeratorCooks() {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/cooks`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load cook approvals');
  return res.json() as Promise<{ cooks: any[] }>;
}

export async function decideCookApproval(id: string, action: 'approve' | 'reject', note?: string) {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/cooks/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action, note }),
  });
  if (!res.ok) throw new Error('Failed to update cook');
  return res.json();
}

export async function fetchModeratorFoods() {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/foods`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load food approvals');
  return res.json() as Promise<{ foods: any[] }>;
}

export async function decideFoodApproval(id: string, action: 'approve' | 'reject') {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/foods/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to update food');
  return res.json();
}

export async function fetchModeratorListings() {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/listings`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load listing approvals');
  return res.json() as Promise<{ listings: any[] }>;
}

export async function decideListingApproval(id: string, action: 'approve' | 'reject') {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/listings/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to update listing');
  return res.json();
}

export async function fetchModeratorRiders() {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/riders`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load rider approvals');
  return res.json() as Promise<{ riders: any[] }>;
}

export async function decideRiderApproval(id: string, action: 'approve' | 'reject') {
  const res = await fetch(`${API_BASE}/api/moderator/approvals/riders/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error('Failed to update rider');
  return res.json();
}
