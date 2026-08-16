import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock, Heart, MapPin, Star, Flag, Bookmark } from 'lucide-react';
import OrderButton from './OrderButton';
import { formatPrice } from '../lib/api';
import { likeCookListing, viewCookListing, type CookListing } from '../lib/listings';
import { toast } from '../lib/toast';
import ReportModal from './ReportModal';
import { isFavoriteCook, toggleFavoriteCook } from '../lib/favorites';

interface Props {
  listing: CookListing;
}

export default function CookListingHero({ listing }: Props) {
  const media = listing.media?.length ? listing.media : [{ url: '/food-placeholder.svg' } as any];
  const [index, setIndex] = useState(0);
  const [likeCount, setLikeCount] = useState(listing.likeCount ?? 0);
  const [liked, setLiked] = useState(listing.liked ?? false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [favorited, setFavorited] = useState(isFavoriteCook(listing.cook.id));
  const isAvailable = listing.isActive && listing.stock > 0;

  useEffect(() => {
    viewCookListing(listing.id).catch(() => {});
  }, [listing.id]);

  useEffect(() => {
    if (media.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % media.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [media]);

  async function handleLike() {
    setLikeLoading(true);
    try {
      const res = await likeCookListing(listing.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign in to like');
    } finally {
      setLikeLoading(false);
    }
  }

  function handleFavorite() {
    const res = toggleFavoriteCook({
      id: listing.cook.id,
      displayName: listing.cook.displayName,
      profilePhoto: listing.cook.profilePhoto,
    });
    setFavorited(res.favorited);
    toast.success(res.favorited ? 'Added to favorite cooks' : 'Removed from favorites');
  }

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
        <h2 className='max-w-3xl text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl'>
          {listing.title}
        </h2>
        {listing.description && (
          <p className='mt-2 line-clamp-2 max-w-xl text-sm font-light leading-relaxed text-white/80 md:text-base'>
            {listing.description}
          </p>
        )}

        <div className='mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80'>
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

        <div className='mt-5 flex flex-wrap items-center gap-3 sm:gap-4'>
          <p className='text-lg font-semibold text-white md:text-xl'>{formatPrice(listing.priceKobo)}</p>
          <Link to={`/cook-listing/${listing.id}`}>
            <OrderButton label='Order' />
          </Link>
          <button
            type='button'
            onClick={handleLike}
            disabled={likeLoading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition ${
              liked ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
            {likeCount}
          </button>
          <button
            type='button'
            onClick={handleFavorite}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition ${
              favorited ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} />
            {favorited ? 'Favorited' : 'Favorite'}
          </button>
          <button
            type='button'
            onClick={() => setShowReport(true)}
            className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/20'
          >
            <Flag className='h-4 w-4' /> Report
          </button>
        </div>
        {showReport && (
          <ReportModal
            targetId={listing.cook.id}
            targetType='COOK'
            title='Report cook'
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </section>
  );
}
