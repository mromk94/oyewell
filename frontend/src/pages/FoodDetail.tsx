import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchFood, formatPrice, type FoodItem, type FoodOption } from '../lib/api';
import OrderButton from '../components/OrderButton';
import OrderModal from '../components/OrderModal';
import Logo from '../components/Logo';

export default function FoodDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderOpen, setOrderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchFood(slug)
      .then(setFood)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !food) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-black text-white">Not found</h1>
        <p className="mt-4 text-white/70">{error || 'This dish is not on the menu right now.'}</p>
        <Link to="/" className="mt-6 text-white underline underline-offset-4">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-900">
      <Logo />
      <div className="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
        {food.heroImage ? (
          <img
            src={food.heroImage}
            alt={food.name}
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/40 to-transparent" />
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Back to menu"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden text-sm font-medium md:inline">Menu</span>
        </Link>
      </div>
      <section className="relative z-10 -mt-24 px-6 pb-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-black text-white md:text-6xl">{food.name}</h1>
          <p
            className={`mt-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              food.isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {food.isAvailable ? 'Available today' : 'Currently unavailable'}
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
            {food.description}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {food.options.map((option: FoodOption) => (
              <div
                key={option.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
              >
                <p className="text-lg font-semibold text-white">{option.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{formatPrice(option.priceKobo)}</p>
                {option.stock !== null ? (
                  <p className="mt-1 text-sm text-white/60">{option.stock} left</p>
                ) : null}
                {!option.isAvailable ? (
                  <p className="mt-2 text-sm font-medium text-red-300">Out of stock</p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-6">
            <OrderButton label="Order now" onClick={() => setOrderOpen(true)} />
          </div>
        </div>
      </section>
      {food && <OrderModal food={food} open={orderOpen} onClose={() => setOrderOpen(false)} />}
    </div>
  );
}
