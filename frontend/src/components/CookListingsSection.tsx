import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import CookListingCard from './CookListingCard';
import type { CookListing } from '../lib/listings';

interface Props {
  title: string;
  listings: CookListing[];
  loading?: boolean;
  onSeeAll?: () => void;
}

export default function CookListingsSection({ title, listings, loading, onSeeAll }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', updateScroll, { passive: true });
    return () => el?.removeEventListener('scroll', updateScroll);
  }, [listings]);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  }

  if (loading) {
    return (
      <section className='py-6'>
        <div className='mb-4 flex items-center justify-between px-4'>
          <h2 className='text-lg font-black text-white'>{title}</h2>
        </div>
        <div className='flex h-48 items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-white/50' />
        </div>
      </section>
    );
  }

  if (!listings.length) return null;

  return (
    <section className='py-6'>
      <div className='mb-4 flex items-center justify-between px-4'>
        <h2 className='text-lg font-black text-white'>{title}</h2>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className='rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-30'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className='rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:opacity-30'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          {onSeeAll && (
            <button onClick={onSeeAll} className='ml-2 text-xs font-bold text-emerald-400 hover:text-emerald-300'>
              See all
            </button>
          )}
        </div>
      </div>
      <motion.div
        ref={scrollRef}
        className='hide-scrollbar flex gap-4 overflow-x-auto px-4 pb-2'
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        {listings.map((l) => (
          <div key={l.id} className='w-72 shrink-0'>
            <CookListingCard listing={l} onClick={() => {}} />
          </div>
        ))}
      </motion.div>
    </section>
  );
}
