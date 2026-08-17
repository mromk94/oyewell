import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Star, ShoppingCart } from 'lucide-react';
import { fetchCookListing, type CookListing } from '../lib/listings';
import { formatPrice, fetchCookReviews } from '../lib/api';
import { useCart } from '../lib/cart';
import { toast } from '../lib/toast';
import Logo from '../components/Logo';
import Preloader from '../components/Preloader';

export default function CookListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<CookListing | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, setIsOpen } = useCart();

  useEffect(() => {
    if (!id) return;
    fetchCookListing(id)
      .then((l) => {
        setListing(l);
        if (l.cook?.id) {
          fetchCookReviews(l.cook.id).then((r) => setReviews(r.reviews)).catch(() => setReviews([]));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handleAddToCart() {
    if (!listing) return;
    if (quantity > listing.stock) {
      toast.error('Not enough stock.');
      return;
    }
    addItem({
      source: 'COOK',
      cookListingId: listing.id,
      foodName: listing.title,
      cookName: listing.cook.displayName,
      unitLabel: listing.portionDescription ?? 'Unit',
      priceKobo: listing.priceKobo,
      packagingCostKobo: listing.packagingCostKobo ?? 0,
      foodImage: listing.media?.[0]?.url,
      quantity,
    });
    toast.success('Added to cart');
    setIsOpen(true);
  }

  if (loading) return <Preloader />;
  if (error || !listing) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-black text-white">Not found</h1>
        <p className="mt-4 text-white/70">{error || 'This listing is not available right now.'}</p>
        <Link to="/" className="mt-6 text-white underline underline-offset-4">Back to menu</Link>
      </div>
    );
  }

  const media = listing.media?.length ? listing.media : [{ url: '/food-placeholder.svg', type: 'IMAGE' } as any];
  const subtotal = (listing.priceKobo + (listing.packagingCostKobo ?? 0)) * quantity;

  return (
    <div className="min-h-screen bg-brand-900">
      <Logo />
      <div className="relative h-[50vh] w-full overflow-hidden md:h-[60vh]">
        {media[0]?.type === 'VIDEO' ? (
          <video src={media[0].url} poster={media[0].thumbnailUrl ?? ''} muted loop playsInline autoPlay className="h-full w-full object-cover" />
        ) : (
          <img src={media[0].url} alt={listing.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/40 to-transparent" />
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="hidden text-sm font-medium md:inline">Back</span>
        </Link>
      </div>

      <section className="relative z-10 -mt-24 px-6 pb-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-black text-white md:text-6xl">{listing.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-white/80">{listing.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300">{listing.cook.displayName}</span>
            {listing.cuisine && <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">{listing.cuisine}</span>}
            {listing.prepTimeMinutesMax && <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">{listing.prepTimeMinutesMax} min</span>}
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/70">{listing.stock} left</span>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{formatPrice(subtotal)}</p>
                <p className="text-sm text-white/60">{formatPrice(listing.priceKobo)} per {listing.portionDescription ?? 'portion'}</p>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/5 p-1">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-30">
                  <Minus className="h-5 w-5" />
                </button>
                <span className="min-w-[2rem] text-center text-lg font-semibold text-white">{quantity}</span>
                <button onClick={() => setQuantity((q) => (q < listing.stock ? q + 1 : q))} disabled={quantity >= listing.stock} className="rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-30">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={quantity > listing.stock}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-lg font-bold text-black shadow-lg transition hover:bg-white/90 disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" /> Add to cart · {formatPrice(subtotal)}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-bold text-white">Reviews</h3>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-white/60">No reviews yet.</p>
            ) : (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold text-white">{listing.cook.rating.toFixed(1)}</span>
                  <span className="text-sm text-white/60">({reviews.length})</span>
                </div>
                <div className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-amber-400' : 'text-white/30'}`} />
                        ))}
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-white/80">{r.comment}</p>}
                      <p className="mt-1 text-xs text-white/40">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
