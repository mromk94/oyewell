import { api, formatPrice } from './api';

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
  const res = await api<{ listings: CookListing[]; total: number; skip: number; take: number }>(`/api/listings?${query.toString()}`);
  return {
    ...res,
    listings: res.listings.map((l) => ({ ...l, price: formatPrice(l.priceKobo) })),
  };
}

export async function fetchCookListingsAroundMe(
  center: { lat: number; lng: number } | { address: string },
  minResults = 5,
  radiusKm = 10
) {
  const qs = new URLSearchParams();
  qs.set('minResults', String(minResults));
  qs.set('radiusKm', String(radiusKm));
  if ('address' in center) {
    qs.set('address', center.address);
  } else {
    qs.set('lat', String(center.lat));
    qs.set('lng', String(center.lng));
  }
  const res = await api<{ sections: { listings: (CookListing & { distanceKm: number })[] }[]; center: { lat: number; lng: number } | null }>(`/api/listings/around-me?${qs.toString()}`);
  const seen = new Set<string>();
  const listings: (CookListing & { distanceKm: number })[] = [];
  for (const section of res.sections) {
    for (const l of section.listings) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        listings.push(l);
      }
    }
  }
  return { listings: listings.map((l) => ({ ...l, price: formatPrice(l.priceKobo) })), center: res.center };
}

export async function fetchCookListing(id: string) {
  const res = await api<{ listing: CookListing }>(`/api/listings/${id}`);
  return { ...res.listing, price: formatPrice(res.listing.priceKobo) };
}
