import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock, MapPin, Star } from 'lucide-react';
import OrderButton from './OrderButton';
import { formatPrice } from '../lib/api';
import type { CookListing } from '../lib/listings';

interface Props {
  listing: CookListing;
}

export default function CookListingHero({ listing }: Props) {
  const media = listing.media?.length ? listing.media : [{ url: '/food-placeholder.svg' } as any];
  const [index, setIndex] = useState(0);
  const isAvailable = listing.isActive && listing.stock > 0;

  useEffect(() => {
    if (media.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % media.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [media]);

  const active = media[index];

  return (
    <section className='relative h-screen w-full shrink-0 snap-center overflow-hidden'>
      {active?.type === 'VIDEO' ? (
        <video
          src={active.url}
          poster={active.thumbnailUrl ?? ''}
          autoPlay
          muted
          loop
          playsInline
          className='absolute inset-0 h-full w-full object-cover'
        />
      ) : active?.url ? (
        <img
          src={active.url}
          alt={listing.title}
          loading='lazy'
          className='absolute inset-0 h-full w-full object-cover'
        />
      ) : null}
      <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20' />

      {media.length > 1 && (
        <div className='absolute left-1/2 top-24 z-20 flex -translate-x-1/2 gap-2'>
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-emerald-400' : 'w-2 bg-white/40'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <div className='relative z-10 flex h-full flex-col justify-end px-6 pb-24 md:px-12 lg:px-20'>
        <p
          className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {isAvailable ? 'Available now' : listing.status === 'PAUSED' ? 'Paused' : 'Unavailable'}
        </p>
        <h2 className='max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl lg:text-7xl'>
          {listing.title}
        </h2>
        {listing.description && (
          <p className='mt-4 max-w-xl text-lg font-light leading-relaxed text-white/80 md:text-2xl'>
            {listing.description}
          </p>
        )}

        <div className='mt-6 flex flex-wrap items-center gap-4 text-sm text-white/80'>
          <span className='inline-flex items-center gap-1.5'>
            <ChefHat className='h-4 w-4 text-emerald-400' />
            {listing.cook.displayName}
          </span>
          {listing.cook.rating > 0 && (
            <span className='inline-flex items-center gap-1.5'>
              <Star className='h-4 w-4 text-emerald-400' />
              {listing.cook.rating.toFixed(1)}
            </span>
          )}
          {listing.distanceKm !== undefined && (
            <span className='inline-flex items-center gap-1.5'>
              <MapPin className='h-4 w-4 text-emerald-400' />
              {listing.distanceKm.toFixed(1)} km away
            </span>
          )}
          {listing.prepTimeMinutesMax && (
            <span className='inline-flex items-center gap-1.5'>
              <Clock className='h-4 w-4 text-emerald-400' />
              Ready in {listing.prepTimeMinutesMax} min
            </span>
          )}
        </div>

        <div className='mt-8 flex items-center gap-6'>
          <p className='text-2xl font-semibold text-white md:text-3xl'>{formatPrice(listing.priceKobo)}</p>
          <Link to={`/cook-listing/${listing.id}`}>
            <OrderButton label='Order' />
          </Link>
        </div>
      </div>
    </section>
  );
}
