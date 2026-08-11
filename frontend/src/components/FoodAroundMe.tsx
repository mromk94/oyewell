import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import CookListingCard from './CookListingCard';
import { fetchCookListingsNearby, type CookListing } from '../lib/listings';

export default function FoodAroundMe() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Location not supported');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetchCookListingsNearby(pos.coords.latitude, pos.coords.longitude, 10);
          setListings(res.listings);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load nearby food');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location permission denied');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

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

  if (error) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center gap-2 px-4'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
        <div className='mx-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70'>
          <AlertCircle className='mb-1 h-4 w-4 text-red-300' /> {error}
        </div>
      </section>
    );
  }

  if (!listings.length) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center gap-2 px-4'>
          <MapPin className='h-5 w-5 text-emerald-400' />
          <h2 className='text-lg font-black text-white'>Food Around Me</h2>
        </div>
        <p className='px-4 text-sm text-white/60'>No home cooks nearby right now.</p>
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
        {listings.map((l) => (
          <div key={l.id} className='w-72 shrink-0'>
            <CookListingCard listing={l} distance={l.distanceKm} onClick={() => navigate(`/cook-listing/${l.id}`)} />
          </div>
        ))}
      </motion.div>
    </section>
  );
}
