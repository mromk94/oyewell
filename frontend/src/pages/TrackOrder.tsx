import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Upload, UserPlus } from 'lucide-react';
import { toast } from '../lib/toast';
import { fetchOrder, formatPrice, type OrderSummary, uploadPaymentProof, register, getCustomerToken } from '../lib/api';

const TRACK_STATUSES = [
  { key: 'PENDING_PAYMENT', label: 'Order placed' },
  { key: 'PAID', label: 'Payment confirmed' },
  { key: 'CONFIRMED', label: 'Restaurant confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY_FOR_DISPATCH', label: 'Ready for dispatch' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
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
    if (!proofImage || !order.payment) return;
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

        <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
          <h2 className='text-xl font-bold text-white'>Tracking</h2>
          <div className='mt-6 space-y-4'>
            {TRACK_STATUSES.map((status, i) => {
              const done = i <= currentIndex;
              const active = i === currentIndex;
              return (
                <div key={status.key} className='flex items-center gap-4'>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      done
                        ? 'border-emerald-400 bg-emerald-400 text-black'
                        : 'border-white/20 text-white/30'
                    }`}
                  >
                    {done ? '✓' : '○'}
                  </div>
                  <span
                    className={`${
                      active ? 'font-bold text-white' : done ? 'text-white/90' : 'text-white/50'
                    }`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
