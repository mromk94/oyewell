import { API_BASE, formatPrice } from './api';
import { getCustomerToken } from './api';

function authHeaders() {
  const token = getCustomerToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getOrCreateViewerId() {
  let id = localStorage.getItem('oye_viewer_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('oye_viewer_id', id);
  }
  return id;
}

export interface CookListing {
  id: string;
  title: string;
  description?: string | null;
  priceKobo: number;
  packagingCostKobo: number;
  price: string;
  currency: string;
  portionDescription?: string | null;
  prepTimeMinutesMin?: number | null;
  prepTimeMinutesMax?: number | null;
  quantity: number;
  stock: number;
  ingredients?: string | null;
  allergens?: string | null;
  cuisine?: string | null;
  status: string;
  isActive: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  media: { id: string; type: 'IMAGE' | 'VIDEO'; url: string; thumbnailUrl?: string | null }[];
  distanceKm?: number;
  likeCount: number;
  viewCount: number;
  liked?: boolean;
  cook: {
    id: string;
    displayName: string;
    profilePhoto?: string | null;
    bio?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    cuisineSpecialty?: string | null;
    kitchenStatus: string;
    rating: number;
    neighborhood?: string | null;
  };
  point?: { lat: number; lng: number };
}

export async function fetchCookListingsPublic(params?: { cuisine?: string; skip?: number; take?: number; cookId?: string }) {
  const query = new URLSearchParams();
  if (params?.cuisine) query.set('cuisine', params.cuisine);
  if (params?.skip !== undefined) query.set('skip', String(params.skip));
  if (params?.take !== undefined) query.set('take', String(params.take));
  if (params?.cookId) query.set('cookId', params.cookId);
  const res = await fetch(`${API_BASE}/api/listings?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load listings');
  const data = (await res.json()) as { listings: CookListing[]; total: number; skip: number; take: number };
  return {
    ...data,
    listings: data.listings.map((l) => ({ ...l, price: formatPrice(l.priceKobo) })),
  };
}

export async function fetchCookListingsNearby(lat: number, lng: number, radiusKm = 10) {
  const res = await fetch(`${API_BASE}/api/listings/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  if (!res.ok) throw new Error('Failed to load nearby listings');
  const data = (await res.json()) as { listings: (CookListing & { distanceKm: number })[] };
  return {
    listings: data.listings.map((l) => ({ ...l, price: formatPrice(l.priceKobo) })),
  };
}

export async function fetchCookListingsAroundMe(
  center: { lat: number; lng: number } | { address: string } | { neighborhood: string },
  minResults = 5,
  radiusKm = 10
) {
  const qs = new URLSearchParams();
  qs.set('minResults', String(minResults));
  qs.set('radiusKm', String(radiusKm));
  if ('address' in center) {
    qs.set('address', center.address);
  } else if ('neighborhood' in center) {
    qs.set('neighborhood', center.neighborhood);
  } else {
    qs.set('lat', String(center.lat));
    qs.set('lng', String(center.lng));
  }
  const res = await fetch(`${API_BASE}/api/listings/around-me?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to load nearby listings');
  const data = (await res.json()) as {
    sections: { listings: (CookListing & { distanceKm: number })[] }[];
    center: { lat: number; lng: number } | null;
  };
  const seen = new Set<string>();
  const listings: (CookListing & { distanceKm: number })[] = [];
  for (const section of data.sections) {
    for (const l of section.listings) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        listings.push(l);
      }
    }
  }
  return { listings: listings.map((l) => ({ ...l, price: formatPrice(l.priceKobo) })), center: data.center };
}

export async function fetchCookPublic(cookId: string) {
  const res = await fetch(`${API_BASE}/api/listings/cooks/${cookId}`);
  if (!res.ok) throw new Error('Failed to load cook');
  return res.json() as Promise<{ cook: any }>;
}

export async function fetchCookListing(id: string) {
  const res = await fetch(`${API_BASE}/api/listings/${id}`);
  if (!res.ok) throw new Error('Failed to load listing');
  const data = (await res.json()) as { listing: CookListing };
  return { ...data.listing, price: formatPrice(data.listing.priceKobo) };
}

export async function likeCookListing(id: string) {
  const res = await fetch(`${API_BASE}/api/listings/${id}/like`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { liked: boolean; likeCount: number; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Like failed');
  return data;
}

export async function viewCookListing(id: string) {
  const res = await fetch(`${API_BASE}/api/listings/${id}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewerId: getOrCreateViewerId() }),
  });
  if (!res.ok) return { ok: false, viewCount: 0 };
  return (await res.json()) as { ok: boolean; viewCount: number };
}
