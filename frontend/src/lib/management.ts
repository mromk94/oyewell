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
