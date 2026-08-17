import { API_BASE } from './api';

export interface PublicRegion {
  id: string;
  name: string;
  code: string | null;
  type: 'CONTINENT' | 'COUNTRY' | 'STATE';
  path: string;
}

export async function fetchCoveredRegions() {
  const res = await fetch(`${API_BASE}/api/regions/covered`);
  if (!res.ok) throw new Error('Failed to load regions');
  const data = (await res.json()) as { regions: PublicRegion[] };
  return data.regions;
}
