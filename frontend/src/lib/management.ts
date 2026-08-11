import { API_BASE } from './api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchManagementDashboard() {
  const res = await fetch(`${API_BASE}/api/management/dashboard`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load management dashboard');
  return res.json();
}

export async function fetchManagementReports() {
  const res = await fetch(`${API_BASE}/api/management/reports`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load management reports');
  return res.json();
}

export async function fetchTickets() {
  const res = await fetch(`${API_BASE}/api/tickets`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load tickets');
  return res.json() as Promise<{ tickets: any[] }>;
}

export async function fetchDisputes() {
  const res = await fetch(`${API_BASE}/api/disputes`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load disputes');
  return res.json() as Promise<{ disputes: any[] }>;
}

export async function resolveDispute(id: string, body: { resolution: string; refundKobo?: number }) {
  const res = await fetch(`${API_BASE}/api/disputes/${id}/resolve`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { dispute?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to resolve dispute');
  return data;
}

export async function updateTicketStatus(id: string, body: { status: string; resolution?: string }) {
  const res = await fetch(`${API_BASE}/api/tickets/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ticket?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update ticket');
  return data;
}
