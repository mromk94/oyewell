import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderButton from './OrderButton';
import type { FoodItem } from '../lib/api';

interface Props {
  food: FoodItem;
}

export default function FoodCard({ food }: Props) {
  const media = buildMedia(food);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (media.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % media.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [media]);

  const active = media[index];

  return (
    <section className="relative h-screen w-full shrink-0 snap-center overflow-hidden">
      {active?.type === 'video' ? (
        <video
          src={active.url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : active?.url ? (
        <img
          src={active.url}
          alt={food.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      {media.length > 1 && (
        <div className="absolute left-1/2 top-24 z-20 flex -translate-x-1/2 gap-2">
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
      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-24 md:px-12 lg:px-20">
        <p
          className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            food.isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {food.isAvailable ? 'Available today' : 'Unavailable'}
        </p>
        <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
          {food.name}
        </h2>
        <p className="mt-2 line-clamp-2 max-w-xl text-sm font-light leading-relaxed text-white/80 md:text-base">
          {food.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <p className="text-lg font-semibold text-white md:text-xl">
            {food.priceFrom ? `From ${food.priceFrom}` : ''}
          </p>
          <Link to={`/food/${food.slug}`}>
            <OrderButton label="Order" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function buildMedia(food: FoodItem): { type: 'image' | 'video'; url: string }[] {
  const out: { type: 'image' | 'video'; url: string }[] = [];
  if (food.heroImage) out.push({ type: 'image', url: food.heroImage });
  food.galleryImages?.forEach((url) => out.push({ type: 'image', url }));
  food.videos?.forEach((url) => out.push({ type: 'video', url }));
  return out;
}
