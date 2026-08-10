import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Clock, Star, MapPin } from 'lucide-react';
import { formatPrice } from '../lib/api';
import type { CookListing } from '../lib/listings';

interface Props {
  listing: CookListing;
  distance?: number;
  onClick?: (listing: CookListing) => void;
}

export default function CookListingCard({ listing, distance, onClick }: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const media = listing.media?.length ? listing.media : [{ url: '/food-placeholder.svg' } as any];
  const active = media[imageIndex];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={() => onClick?.(listing)}
      className='group relative cursor-pointer overflow-hidden rounded-3xl bg-white/5 shadow-sm transition-all hover:shadow-xl'
    >
      <div className='relative aspect-[4/3] overflow-hidden'>
        {active?.type === 'VIDEO' ? (
          <video
            src={active.url}
            poster={active.thumbnailUrl ?? ''}
            muted
            loop
            playsInline
            className='h-full w-full object-cover'
          />
        ) : (
          <img
            src={active.url}
            alt={listing.title}
            className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
          />
        )}
        {media.length > 1 && (
          <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5'>
            {media.map((_: any, i: number) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${i === imageIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
        {listing.cuisine && (
          <span className='absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm'>
            {listing.cuisine}
          </span>
        )}
      </div>
      <div className='p-4'>
        <div className='flex items-start justify-between gap-2'>
          <h3 className='font-bold text-white'>{listing.title}</h3>
          <span className='whitespace-nowrap rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300'>
            {formatPrice(listing.priceKobo)}
          </span>
        </div>
        <p className='mt-1 line-clamp-2 text-xs text-white/60'>{listing.description}</p>
        <div className='mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70'>
          <span className='inline-flex items-center gap-1'>
            <ChefHat className='h-3.5 w-3.5' />
            {listing.cook.displayName}
          </span>
          {listing.prepTimeMinutesMax && (
            <span className='inline-flex items-center gap-1'>
              <Clock className='h-3.5 w-3.5' />
              {listing.prepTimeMinutesMax} min
            </span>
          )}
          {listing.cook.rating > 0 && (
            <span className='inline-flex items-center gap-1'>
              <Star className='h-3.5 w-3.5 text-emerald-400' />
              {listing.cook.rating.toFixed(1)}
            </span>
          )}
          {distance !== undefined && (
            <span className='inline-flex items-center gap-1'>
              <MapPin className='h-3.5 w-3.5' />
              {distance.toFixed(1)} km
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
