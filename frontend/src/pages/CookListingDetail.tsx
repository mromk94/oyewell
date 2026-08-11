import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, MapPin, Phone, CreditCard, Loader2, CheckCircle, Upload, Star } from 'lucide-react';
import { fetchCookListing, type CookListing } from '../lib/listings';
import {
  formatPrice,
  fetchPaymentMethods,
  fetchCookReviews,
  createCookOrder,
  verifyPayment,
  uploadPaymentProof,
  getCustomerToken,
  type PaymentMethod,
  type CreatedOrder,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from '../lib/toast';
import Logo from '../components/Logo';
import Preloader from '../components/Preloader';

function isManualProvider(provider: string) {
  return provider === 'BANK_TRANSFER' || provider === 'CRYPTO';
}

function PaymentDetails({ method }: { method: PaymentMethod }) {
  const config = method.config;
  if (!isManualProvider(method.provider)) return null;
  return (
    <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm">
      {method.provider === 'BANK_TRANSFER' ? (
        <div className="space-y-1 text-white/80">
          {config?.accountName && <p><span className="text-white/60">Account name:</span> {config.accountName}</p>}
          {method.publicKey && <p className="break-all"><span className="text-white/60">Account number:</span> {method.publicKey}</p>}
          {config?.bankName && <p><span className="text-white/60">Bank:</span> {config.bankName}</p>}
          {config?.instructions && <p className="pt-1 italic text-white/70">{config.instructions}</p>}
        </div>
      ) : (
        <div className="space-y-1 text-white/80">
          {method.publicKey && <p className="break-all"><span className="text-white/60">Wallet address:</span> {method.publicKey}</p>}
          {config?.network && <p><span className="text-white/60">Network:</span> {config.network}</p>}
          {config?.instructions && <p className="pt-1 italic text-white/70">{config.instructions}</p>}
        </div>
      )}
    </div>
  );
}

export default function CookListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, openAuth } = useAuth();
  const [listing, setListing] = useState<CookListing | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [proofImage, setProofImage] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);

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
    fetchPaymentMethods().then((data) => {
      const enabled = data.methods.filter((m) => m.enabled);
      setPaymentMethods(enabled);
      setSelectedMethod(enabled[0] ?? null);
    }).catch(() => toast.error('Could not load payment methods'));
  }, [id]);

  function readImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.size > 1_500_000) {
        reject(new Error('Image is too large. Choose a smaller file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string) ?? '');
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(file);
    });
  }

  async function handlePlaceOrder() {
    if (!listing) return;
    if (!selectedMethod) {
      toast.error('Choose a payment method.');
      return;
    }
    if (!address.trim() || !phone.trim()) {
      toast.error('Address and phone are required.');
      return;
    }
    if (!isAuthenticated) {
      openAuth(() => handlePlaceOrder(), 'Create an account or sign in so we can secure this order to your account and keep it safe.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const created = await createCookOrder(
        {
          cookListingId: listing.id,
          quantity,
          address: address.trim(),
          phone: phone.trim(),
          paymentProvider: selectedMethod.provider,
        },
        getCustomerToken()
      );
      setOrder(created);
      if (!isManualProvider(created.payment.provider)) {
        setVerifying(true);
        try {
          await verifyPayment(created.payment.id, created.payment.idempotencyKey);
          navigate(`/track/${created.order.orderNumber}`);
        } catch {
          navigate(`/track/${created.order.orderNumber}`);
        } finally {
          setVerifying(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  }

  async function handleUploadProof() {
    if (!proofImage || !order) return;
    setProofLoading(true);
    try {
      await uploadPaymentProof(order.payment.id, proofImage, proofNote);
      setProofUploaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setProofLoading(false);
    }
  }

  async function handleProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setProofImage(await readImageFile(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read image');
    }
  }

  function handleDone() {
    if (order) navigate(`/track/${order.order.orderNumber}`);
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
  const subtotal = listing.priceKobo * quantity;

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

          {order ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-300" />
              <h3 className="mt-4 text-2xl font-bold text-white">Order placed!</h3>
              <p className="mt-2 text-white/70">{order.order.orderNumber} — Total {order.order.total}</p>

              {isManualProvider(order.payment.provider) ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-left">
                  <h4 className="font-semibold text-white">Upload payment proof</h4>
                  <p className="mt-1 text-sm text-white/60">Pay to the {order.payment.provider === 'BANK_TRANSFER' ? 'account' : 'address'} below, then upload proof.</p>
                  {selectedMethod && <PaymentDetails method={selectedMethod} />}

                  {proofUploaded ? (
                    <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
                      <CheckCircle className="mx-auto h-8 w-8 text-emerald-300" />
                      <h5 className="mt-4 text-lg font-bold text-white">Proof received!</h5>
                      <p className="mt-2 text-sm text-emerald-100">Your payment proof has been uploaded. The cook will review and confirm your order.</p>
                    </div>
                  ) : (
                    <>
                      <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-white/70 hover:bg-white/10">
                        <Upload className="mx-auto h-6 w-6" />
                        <span className="mt-2 block text-sm">{proofImage ? 'Change image' : 'Tap to upload proof'}</span>
                        <input type="file" accept="image/*" onChange={handleProofFile} className="hidden" />
                      </label>
                      {proofImage && <img src={proofImage} alt="" className="mt-4 max-h-40 w-full rounded-2xl object-contain" />}
                      <textarea
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder="Sender name / reference / note"
                        className="mt-4 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40"
                      />
                      <button
                        onClick={handleUploadProof}
                        disabled={!proofImage || proofLoading}
                        className="mt-4 w-full rounded-full bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {proofLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Uploading…</span> : 'Upload proof'}
                      </button>
                    </>
                  )}
                  <button onClick={handleDone} className="mt-6 w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90">
                    Track my order
                  </button>
                </div>
              ) : verifying ? (
                <div className="mt-6 flex items-center justify-center gap-2 text-white/70">
                  <Loader2 className="h-5 w-5 animate-spin" /> Verifying payment…
                </div>
              ) : (
                <button onClick={handleDone} className="mt-6 w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90">
                  Track my order
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white">{formatPrice(subtotal)}</p>
                    <p className="text-sm text-white/60">{formatPrice(listing.priceKobo)} per portion</p>
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

                <div className="mt-6 grid gap-4">
                  <label className="block">
                    <span className="flex items-center gap-2 text-sm font-medium text-white/90"><MapPin className="h-4 w-4" /> Delivery address</span>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 Alhaji Road, Lagos" className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40" />
                  </label>
                  <label className="block">
                    <span className="flex items-center gap-2 text-sm font-medium text-white/90"><Phone className="h-4 w-4" /> Phone number</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0803 000 0000" className="mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40" />
                  </label>
                  <div className="block">
                    <span className="flex items-center gap-2 text-sm font-medium text-white/90"><CreditCard className="h-4 w-4" /> Payment method</span>
                    <div className="mt-2 grid gap-2">
                      {paymentMethods.map((method) => (
                        <label key={method.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${selectedMethod?.id === method.id ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                          <input type="radio" name="payment" checked={selectedMethod?.id === method.id} onChange={() => setSelectedMethod(method)} className="h-5 w-5 border-white/30 bg-white/5 text-emerald-500" />
                          <span className="font-medium text-white">{method.name}</span>
                        </label>
                      ))}
                    </div>
                    {selectedMethod && <PaymentDetails method={selectedMethod} />}
                  </div>
                </div>

                {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing || quantity > listing.stock}
                  className="mt-6 w-full rounded-full bg-white py-3 text-lg font-bold text-black shadow-lg transition hover:bg-white/90 disabled:opacity-50"
                >
                  {placing ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Placing order…</span> : `Place order · ${formatPrice(subtotal)}`}
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
            </>
          )}
        </div>
      </section>
    </div>
  );
}
