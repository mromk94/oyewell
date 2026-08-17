import { useEffect, useMemo, useState } from 'react';
import { MapPin, Loader2, AlertCircle, Search } from 'lucide-react';
import CookListingFeed from './CookListingFeed';
import { fetchCookListingsAroundMe, fetchCookListingsPublic, type CookListing } from '../lib/listings';
import { type DiscoveryFiltersState } from './DiscoveryFilters';

interface Props {
  filters?: DiscoveryFiltersState;
}

export default function FoodAroundMe({ filters }: Props) {
  const [listings, setListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [address, setAddress] = useState('');
  const [usingAddress, setUsingAddress] = useState(false);

  async function loadPublic() {
    try {
      const res = await fetchCookListingsPublic({ take: 20, regionId: filters?.regionId || undefined });
      setListings(res.listings);
      setUsingAddress(false);
      setFallback(true);
    } catch (e) {
      setError('No food found right now.');
    }
  }

  async function load(search: { lat: number; lng: number } | { address: string }) {
    setLoading(true);
    setError(null);
    setFallback(false);
    try {
      const res = await fetchCookListingsAroundMe(search, 8, 10, filters?.regionId);
      setListings(res.listings);
      if (res.listings.length === 0) await loadPublic();
    } catch (e) {
      await loadPublic();
    } finally {
      setLoading(false);
    }
  }

  const filteredListings = useMemo(() => {
    if (!filters) return listings;
    let list = listings;
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          l.cook.displayName.toLowerCase().includes(q)
      );
    }
    if (filters.cuisine) {
      list = list.filter((l) => l.cuisine && l.cuisine.toLowerCase() === filters.cuisine.toLowerCase());
    }
    if (filters.available) {
      list = list.filter((l) => l.isActive && l.stock > 0);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice) * 100;
      list = list.filter((l) => l.priceKobo <= max);
    }
    return list;
  }, [listings, filters]);

  useEffect(() => {
    if (!navigator.geolocation) {
      loadPublic().finally(() => setLoading(false));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await load({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        loadPublic().finally(() => setLoading(false));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setUsingAddress(true);
    await load({ address: address.trim() });
  }

  if (loading) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center gap-2 px-4'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
        <div className='flex h-48 items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-white/50' />
        </div>
      </section>
    );
  }

  const addressForm = (
    <form onSubmit={handleAddressSubmit} className='mt-3 flex flex-col gap-2 sm:flex-row'>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder='Enter street address or area'
        className='min-w-0 flex-1 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500'
      />
      <button
        type='submit'
        disabled={loading || !address.trim()}
        className='inline-flex w-full items-center justify-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50 sm:w-auto'
      >
        <Search className='h-4 w-4' aria-label='Search' />
        <span className='hidden sm:inline'>Search</span>
      </button>
    </form>
  );

  if (!filteredListings.length) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center gap-2 px-4'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
        <div className='px-4'>{addressForm}</div>
        {usingAddress && <p className='truncate px-4 text-xs text-white/40'>Showing results for &quot;{address}&quot;</p>}
        <div className='break-words px-4 pt-3 text-sm text-white/60'>
          {error ? (
            <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
              <AlertCircle className='mb-1 h-4 w-4 text-red-300' /> {error}
            </div>
          ) : (
            <p>{fallback ? 'No food is available right now. Please check back later.' : usingAddress ? `No home cooks near "${address}" right now.` : 'No home cooks nearby right now.'}</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className='py-6'>
      <div className='mb-4 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
      </div>
      <div className='px-4'>{addressForm}</div>
      {usingAddress && address && <p className='truncate px-4 text-xs text-white/40'>Showing results for &quot;{address}&quot;</p>}
      {fallback && <p className='truncate px-4 text-xs text-white/40'>Showing all available food — enable location or enter an address for nearby results.</p>}
      <CookListingFeed listings={filteredListings} loading={loading} />
    </section>
  );
}
