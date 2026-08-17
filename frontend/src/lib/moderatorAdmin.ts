import { API_BASE } from './api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token') ?? localStorage.getItem('customer_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ModeratorRecord {
  id: string;
  employeeId: string;
  status: string;
  department?: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null; roles: string[] };
  tier: { id: string; name: string };
  areas: any[];
}

export async function fetchModerators() {
  const res = await fetch(`${API_BASE}/api/admin/moderators`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load moderators');
  return res.json() as Promise<{ moderators: ModeratorRecord[] }>;
}

export async function createModerator(payload: { email: string; firstName?: string; lastName?: string; employeeId: string; department?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/moderators`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create moderator');
  return res.json() as Promise<{ moderator: ModeratorRecord; tempPassword?: string }>;
}

export async function updateModerator(id: string, payload: { status?: string; department?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/moderators/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update moderator');
  return res.json() as Promise<{ moderator: ModeratorRecord }>;
}

export async function deleteModerator(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/moderators/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete moderator');
  return res.json();
}

export interface ModeratorAudit {
  logs: any[];
  stats: { joinedAt: string; lastLoginAt: string | null; cooksApproved: number; foodsApproved: number; listingsApproved: number; balanceKobo: number };
}

export async function fetchModeratorAudit(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/moderators/${id}/audit`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load audit');
  return res.json() as Promise<ModeratorAudit>;
}

export async function updateModeratorBalance(id: string, payload: { type: 'credit' | 'debit'; amountKobo: number; note?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/moderators/${id}/balance`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Balance update failed');
  return res.json() as Promise<{ moderator: ModeratorRecord }>;
}

export async function updateModeratorBank(id: string, payload: { bankName: string; bankAccountNumber: string; bankAccountName: string }) {
  const res = await fetch(`${API_BASE}/api/admin/moderators/${id}/bank`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Bank update failed');
  return res.json() as Promise<{ moderator: ModeratorRecord }>;
}

export async function addModeratorArea(employeeId: string, area: { scope: string; country?: string; region?: string; city?: string; district?: string; area?: string }) {
  const res = await fetch(`${API_BASE}/api/management/employees/${employeeId}/areas`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(area),
  });
  if (!res.ok) throw new Error('Failed to add area');
  return res.json();
}
