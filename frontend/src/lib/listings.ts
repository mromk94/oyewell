import { API_BASE, formatPrice } from './api';

export interface CookListing {
  id: string;
  title: string;
  description?: string | null;
  priceKobo: number;
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
  createdAt: string;
  updatedAt: string;
  media: { id: string; type: 'IMAGE' | 'VIDEO'; url: string; thumbnailUrl?: string | null }[];
  distanceKm?: number;
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
  };
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
