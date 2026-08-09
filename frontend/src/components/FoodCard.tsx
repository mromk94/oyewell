import { Link } from 'react-router-dom';
import OrderButton from './OrderButton';
import type { FoodItem } from '../lib/api';

interface Props {
  food: FoodItem;
}

export default function FoodCard({ food }: Props) {
  return (
    <section className="relative h-screen w-full shrink-0 snap-center overflow-hidden">
      {food.heroImage ? (
        <img
          src={food.heroImage}
          alt={food.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-24 md:px-12 lg:px-20">
        <p
          className={`mb-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            food.isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {food.isAvailable ? 'Available today' : 'Unavailable'}
        </p>
        <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-white md:text-7xl lg:text-8xl">
          {food.name}
        </h2>
        <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-white/80 md:text-2xl">
          {food.description}
        </p>
        <div className="mt-8 flex items-center gap-6">
          <p className="text-2xl font-semibold text-white md:text-3xl">
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
