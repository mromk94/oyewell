import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Loader2, AlertCircle, Search } from 'lucide-react';
import CookListingCard from './CookListingCard';
import { fetchCookListingsAroundMe, type CookListing } from '../lib/listings';
import { type DiscoveryFiltersState } from './DiscoveryFilters';

interface Props {
  filters?: DiscoveryFiltersState;
}

export default function FoodAroundMe({ filters }: Props) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [usingAddress, setUsingAddress] = useState(false);

  async function load(center: { lat: number; lng: number } | { address: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCookListingsAroundMe(center, 8, 10);
      setListings(res.listings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load nearby food');
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
      setError('Location not supported');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await load({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLoading(false);
        setError('Location permission denied. Enter an address below.');
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
    <form onSubmit={handleAddressSubmit} className='mt-3 flex gap-2'>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder='Enter street address or area'
        className='flex-1 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500'
      />
      <button
        type='submit'
        disabled={loading || !address.trim()}
        className='flex items-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
      >
        <Search className='h-4 w-4' /> Search
      </button>
    </form>
  );

  if (error) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center gap-2 px-4'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
        <div className='mx-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70'>
          <AlertCircle className='mb-1 h-4 w-4 text-red-300' /> {error}
          {addressForm}
        </div>
      </section>
    );
  }

  if (!filteredListings.length) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center gap-2 px-4'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
        <div className='px-4 text-sm text-white/60'>
          <p>No home cooks nearby right now.</p>
          {usingAddress ? <p className='mt-1 text-white/40'>Showing results for &quot;{address}&quot;</p> : addressForm}
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
      <motion.div
        className='hide-scrollbar flex gap-4 overflow-x-auto px-4 pb-2'
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {filteredListings.map((l) => (
          <div key={l.id} className='w-72 shrink-0'>
            <CookListingCard listing={l} distance={l.distanceKm} onClick={() => navigate(`/cook-listing/${l.id}`)} />
          </div>
        ))}
      </motion.div>
    </section>
  );
}
