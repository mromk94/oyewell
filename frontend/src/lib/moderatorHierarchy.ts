import { API_BASE } from './api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('customer_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface HierarchyModerator {
  id: string;
  employeeId: string;
  status: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  region?: { id: string; name: string; type: string };
}

export interface ActionRequest {
  id: string;
  type: string;
  targetId: string;
  targetType: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  note: string | null;
  data: { action: string; requesterId: string; requesterRegionId?: string };
  target?: HierarchyModerator;
}

export async function fetchHierarchyModerators() {
  const res = await fetch(`${API_BASE}/api/moderator/hierarchy/moderators`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load moderators');
  return res.json() as Promise<{ moderators: HierarchyModerator[] }>;
}

export async function requestModeratorAction(id: string, action: 'SUSPEND' | 'INACTIVE' | 'DELETE' | 'BAN', note?: string) {
  const res = await fetch(`${API_BASE}/api/moderator/hierarchy/moderators/${id}/action`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, note }),
  });
  if (!res.ok) throw new Error('Failed to request action');
  return res.json() as Promise<{ approval: ActionRequest }>;
}

export async function fetchModeratorActionRequests() {
  const res = await fetch(`${API_BASE}/api/moderator/hierarchy/actions`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load action requests');
  return res.json() as Promise<{ actions: ActionRequest[] }>;
}

export async function resolveModeratorAction(id: string, decision: 'approve' | 'reject', note?: string) {
  const res = await fetch(`${API_BASE}/api/moderator/hierarchy/actions/${id}/resolve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ decision, note }),
  });
  if (!res.ok) throw new Error('Failed to resolve action');
  return res.json() as Promise<{ approval: ActionRequest }>;
}
