import { API_BASE, getCustomerToken } from './api';

function authHeaders() {
  const token = getCustomerToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createReport(payload: {
  targetId: string;
  targetType: string;
  reason: string;
  details?: string;
  evidence?: string[];
}) {
  const res = await fetch(`${API_BASE}/api/moderation/reports`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { report?: any; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Report failed');
  return data;
}
