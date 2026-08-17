import { API_BASE } from './api';

export interface Region {
  id: string;
  type: 'CONTINENT' | 'COUNTRY' | 'STATE';
  name: string;
  code: string | null;
  parentId: string | null;
  path: string;
  isCovered: boolean;
}

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchRegions(params: { q?: string; type?: string } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.type) query.set('type', params.type);
  const res = await fetch(`${API_BASE}/api/admin/regions?${query.toString()}`, {
    headers: authHeaders(),
  });
  const data = (await res.json()) as { regions?: Region[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to load regions');
  return data.regions ?? [];
}

export async function createRegion(payload: Omit<Region, 'path'> & { parentId?: string }) {
  const res = await fetch(`${API_BASE}/api/admin/regions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { region?: Region; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to create region');
  return data.region!;
}

export async function toggleRegionCoverage(id: string, isCovered: boolean) {
  const res = await fetch(`${API_BASE}/api/admin/regions/${id}/coverage`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ isCovered }),
  });
  const data = (await res.json()) as { region?: Region; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Failed to update region');
  return data.region!;
}
