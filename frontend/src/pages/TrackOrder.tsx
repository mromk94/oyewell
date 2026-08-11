import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Upload, UserPlus, Package, Utensils, Truck, Home, Star } from 'lucide-react';
import { toast } from '../lib/toast';
import { fetchOrder, formatPrice, type OrderSummary, uploadPaymentProof, register, createReview, getCustomerToken } from '../lib/api';
import Logo from '../components/Logo';

type StatusDef = {
  key: string;
  label: string;
  description: string;
  Icon: typeof Package;
};

const TRACK_STATUSES: StatusDef[] = [
  { key: 'PENDING_PAYMENT', label: 'Order placed', description: 'We received your order and are waiting for payment confirmation.', Icon: Package },
  { key: 'PAID', label: 'Payment confirmed', description: 'Your payment has been verified. The kitchen is getting ready.', Icon: CheckCircle },
  { key: 'CONFIRMED', label: 'Confirmed', description: 'Your order has been accepted and will start preparing soon.', Icon: Utensils },
  { key: 'COOK_ACCEPTED', label: 'Cook accepted', description: 'The cook has accepted your order and will start preparing it.', Icon: Utensils },
  { key: 'PREPARING', label: 'Preparing', description: 'Your food is being cooked and packed right now.', Icon: Utensils },
  { key: 'READY_FOR_PICKUP', label: 'Ready for pickup', description: 'Your order is packed and waiting for a delivery rider.', Icon: Package },
  { key: 'READY_FOR_DISPATCH', label: 'Ready for dispatch', description: 'Your order is packed and waiting for the delivery rider.', Icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', description: 'A rider is on the way with your order.', Icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', description: 'Your order has arrived. Enjoy your meal!', Icon: Home },
];

function isManualPayment(provider?: string | null) {
  return provider === 'BANK_TRANSFER' || provider === 'CRYPTO';
}

function latestProof(payment?: OrderSummary['payment']) {
  return payment?.attempts?.[0]?.payload?.image as string | undefined;
}

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

export default function TrackOrder() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);

  function reload() {
    if (!orderNumber) return;
    setLoading(true);
    fetchOrder(orderNumber)
      .then((data) => {
        setOrder(data.order);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <Loader2 className='h-10 w-10 animate-spin text-white/70' />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center px-6 text-center'>
        <h1 className='text-4xl font-black text-white'>Order not found</h1>
        <p className='mt-4 text-white/70'>{error || 'Check the order number and try again.'}</p>
        <Link to='/' className='mt-6 text-white underline underline-offset-4'>
          Back to menu
        </Link>
      </div>
    );
  }

  const currentIndex = TRACK_STATUSES.findIndex((s) => s.key === order.status);
  const manual = isManualPayment(order.payment?.provider);
  const proofUrl = latestProof(order.payment);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      setProofImage(dataUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image read failed');
    }
  }

  async function handleUpload() {
    if (!proofImage || !order || !order.payment) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPaymentProof(order.payment.id, proofImage);
      setJustUploaded(true);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!accepted) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }
    setRegistering(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: 'OYE',
        lastName: 'Customer',
        phone: order?.phone ?? '',
      });
      toast.success('Account created. Your order is now safely linked for tracking.');
      setEmail('');
      setPassword('');
      setConfirm('');
      setAccepted(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setRegistering(false);
    }
  }

  const needsOnboarding = !!order && !getCustomerToken() && (order.paymentStatus === 'PAID' || order.paymentStatus === 'PENDING' || justUploaded);

  return (
    <div className='min-h-screen bg-brand-900 px-6 py-12 md:px-12'>
      <Logo />
      <div className='mx-auto max-w-2xl'>
        <Link
          to='/'
          className='inline-flex items-center gap-2 text-white/70 transition hover:text-white'
        >
          <ArrowLeft className='h-5 w-5' /> Back to menu
        </Link>

        <h1 className='mt-8 text-4xl font-black text-white'>Order {order.orderNumber}</h1>
        <p className='mt-2 text-lg text-white/70'>{order.status.replace(/_/g, ' ')}</p>

        {order.payment && (
          <div className='mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-bold text-white'>Payment</h2>
              {order.paymentStatus === 'PAID' ? (
                <span className='flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-300'>
                  <CheckCircle className='h-4 w-4' /> Paid
                </span>
              ) : order.paymentStatus === 'FAILED' ? (
                <span className='flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-sm font-bold text-red-300'>
                  <XCircle className='h-4 w-4' /> Rejected
                </span>
              ) : (
                <span className='flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-bold text-yellow-300'>
                  <Clock className='h-4 w-4' /> Pending
                </span>
              )}
            </div>

            <p className='mt-2 text-sm text-white/60'>{order.payment.provider}</p>

            {manual && order.paymentStatus === 'PENDING' && (
              <div className='mt-4 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4'>
                {proofUrl || justUploaded ? (
                  <div className='text-center'>
                    <Loader2 className='mx-auto h-8 w-8 animate-spin text-blue-300' />
                    <p className='mt-3 text-sm text-blue-100'>
                      Proof uploaded. Awaiting verification by the restaurant.
                    </p>
                    {proofUrl && (
                      <img
                        src={proofUrl}
                        alt='Payment proof'
                        className='mt-4 max-h-48 rounded-2xl border border-white/10'
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <p className='text-sm text-blue-100'>
                      Send the payment and upload a screenshot or receipt. Your order will be confirmed once
                      we verify the payment.
                    </p>
                    <div className='mt-4'>
                      <input
                        type='file'
                        accept='image/*'
                        onChange={handleFileChange}
                        className='block w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black'
                      />
                      {proofImage && (
                        <img
                          src={proofImage}
                          alt=''
                          className='mt-4 max-h-40 rounded-2xl object-cover'
                        />
                      )}
                      <button
                        onClick={handleUpload}
                        disabled={!proofImage || uploading}
                        className='mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 font-bold text-white disabled:opacity-50'
                      >
                        {uploading ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Upload className='h-4 w-4' />
                        )}
                        Upload proof
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {order.paymentStatus === 'PAID' && (
              <p className='mt-4 text-sm text-white/70'>Your payment has been confirmed.</p>
            )}

            {order.deliveryCode && order.paymentStatus === 'PAID' && (
              <div className='mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center'>
                <p className='text-sm text-emerald-200'>Show this code to the delivery rider</p>
                <p className='mt-1 text-4xl font-black tracking-widest text-emerald-300'>{order.deliveryCode}</p>
              </div>
            )}
            {order.paymentStatus === 'FAILED' && (
              <p className='mt-4 text-sm text-white/70'>
                Your payment was not accepted. Contact support or place a new order.
              </p>
            )}
          </div>
        )}

        {needsOnboarding && (
          <div className='mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-black'>
                <UserPlus className='h-5 w-5' />
              </div>
              <h2 className='text-xl font-bold text-white'>Create your tracking account</h2>
            </div>

            <p className='mt-3 text-sm leading-relaxed text-emerald-100'>
              Create a free account to make tracking this order easy and safe. You will always be
              able to look up your order history and receive updates.
            </p>

            <form onSubmit={handleRegister} className='mt-5 space-y-4'>
              <label className='block'>
                <span className='text-sm font-medium text-white/90'>Email (username)</span>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                  required
                />
              </label>

              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='block'>
                  <span className='text-sm font-medium text-white/90'>Password</span>
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Choose a strong password'
                    className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                    required
                    minLength={6}
                  />
                </label>

                <label className='block'>
                  <span className='text-sm font-medium text-white/90'>Confirm password</span>
                  <input
                    type='password'
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder='Re-enter your password'
                    className='mt-1 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                    required
                    minLength={6}
                  />
                </label>
              </div>

              <label className='flex items-start gap-3 text-sm text-white/80'>
                <input
                  type='checkbox'
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className='mt-1 h-4 w-4'
                />
                <span>
                  I agree to the{' '}
                  <Link to='/terms' className='text-emerald-300 underline'>
                    Terms of Service
                  </Link>{' '}
                  and understand this keeps my order safe and easy to track.
                </span>
              </label>

              <button
                type='submit'
                disabled={registering}
                className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-400 disabled:opacity-50'
              >
                {registering ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <UserPlus className='h-4 w-4' />
                )}
                {registering ? 'Creating account...' : 'Create account & continue'}
              </button>
            </form>
          </div>
        )}

        <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
          <h2 className='text-xl font-bold text-white'>Items</h2>
          <div className='mt-4 space-y-4'>
            {order.items.map((item, i) => (
              <div key={i} className='flex justify-between text-white/90'>
                <div>
                  <p className='font-semibold'>{item.foodName}</p>
                  <p className='text-sm text-white/60'>
                    {item.optionLabel} × {item.quantity}
                  </p>
                </div>
                <p className='font-semibold'>{formatPrice(item.totalKobo)}</p>
              </div>
            ))}
          </div>
          <div className='mt-6 space-y-1 border-t border-white/10 pt-4 text-white/80'>
            <div className='flex justify-between'>
              <span>Subtotal</span>
              <span>{order.subtotal}</span>
            </div>
            <div className='flex justify-between'>
              <span>Delivery</span>
              <span>{order.deliveryFee}</span>
            </div>
            <div className='flex justify-between text-xl font-bold text-white'>
              <span>Total</span>
              <span>{order.total}</span>
            </div>
          </div>
        </div>

        <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
          <h2 className='text-xl font-bold text-white'>Delivery</h2>
          <p className='mt-2 text-white/80'>{order.address}</p>
          <p className='text-white/80'>{order.phone}</p>
        </div>

        {order.status === 'DELIVERED' && order.cookId && getCustomerToken() && (
          <ReviewSection order={order} onSubmitted={reload} />
        )}

        <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
          <h2 className='text-xl font-bold text-white'>Tracking</h2>
          <div className='relative mt-6 pl-2'>
            <div className='absolute left-[1.4375rem] top-4 bottom-4 w-0.5 bg-white/10' />
            <div className='space-y-1'>
              {TRACK_STATUSES.map((status, i) => {
                const done = i <= currentIndex;
                const active = i === currentIndex;
                const Icon = status.Icon;
                return (
                  <motion.div
                    key={status.key}
                    initial={active ? { opacity: 0, x: -12 } : false}
                    animate={active ? { opacity: 1, x: 0 } : false}
                    transition={{ duration: 0.4 }}
                    className={`relative z-10 flex gap-4 py-3 ${active ? '' : ''}`}
                  >
                    <div
                      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        done
                          ? 'border-emerald-400 bg-emerald-400 text-black'
                          : 'border-white/20 bg-brand-900 text-white/30'
                      } ${active ? 'shadow-[0_0_0_6px_rgba(52,211,153,0.15)]' : ''}`}
                    >
                      <Icon className='h-5 w-5' />
                      {active && (
                        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40 opacity-60' />
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p
                        className={`text-lg font-bold ${
                          active ? 'text-white' : done ? 'text-white/90' : 'text-white/40'
                        }`}
                      >
                        {status.label}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-relaxed ${
                          active ? 'text-emerald-100' : done ? 'text-white/60' : 'text-white/40'
                        }`}
                      >
                        {status.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ order, onSubmitted }: { order: OrderSummary; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      await createReview({
        orderNumber: order.orderNumber,
        rating,
        comment,
        target: 'cook',
      });
      setSubmitted(true);
      toast.success('Thanks for your review!');
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className='mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 text-center'>
        <CheckCircle className='mx-auto h-10 w-10 text-emerald-300' />
        <h2 className='mt-4 text-xl font-bold text-white'>Review received</h2>
        <p className='mt-2 text-emerald-100'>Thanks for rating your cook.</p>
      </div>
    );
  }

  return (
    <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
      <h2 className='text-xl font-bold text-white'>Rate your cook</h2>
      <p className='mt-1 text-sm text-white/60'>How was your food?</p>
      <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
        <div className='flex gap-2'>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type='button'
              onClick={() => setRating(n)}
              onMouseEnter={() => setRating(n)}
              onMouseLeave={() => {}}
              className='text-amber-400 transition hover:scale-110'
            >
              <Star className={`h-8 w-8 ${n <= rating ? 'fill-amber-400' : 'text-white/30'}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder='Share a few words about your experience (optional)'
          className='w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white placeholder-white/40'
          rows={3}
        />
        <button
          type='submit'
          disabled={!rating || submitting}
          className='w-full rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
        >
          {submitting ? <Loader2 className='mx-auto h-5 w-5 animate-spin' /> : 'Submit review'}
        </button>
      </form>
    </div>
  );
}
