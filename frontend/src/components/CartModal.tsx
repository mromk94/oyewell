import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Plus, Minus, Trash2, MapPin, Phone, Upload, CheckCircle, Loader2, CreditCard, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  formatPrice,
  fetchPaymentMethods,
  createOrder,
  verifyPayment,
  uploadPaymentProof,
  getCustomerToken,
  type PaymentMethod,
  type CreatedOrder,
} from '../lib/api';
import { useCart } from '../lib/cart';
import { toast } from '../lib/toast';

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

function isManualProvider(provider: string) {
  return provider === 'BANK_TRANSFER' || provider === 'CRYPTO';
}

function PaymentDetails({ method }: { method: PaymentMethod }) {
  const config = method.config;
  if (!isManualProvider(method.provider)) return null;

  return (
    <div className='mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm'>
      {method.provider === 'BANK_TRANSFER' ? (
        <div className='space-y-1 text-white/80'>
          {config?.accountName && <p><span className='text-white/60'>Account name:</span> {config.accountName}</p>}
          {method.publicKey && <p className='break-all'><span className='text-white/60'>Account number:</span> {method.publicKey}</p>}
          {config?.bankName && <p><span className='text-white/60'>Bank:</span> {config.bankName}</p>}
          {config?.instructions && <p className='pt-1 italic text-white/70'>{config.instructions}</p>}
        </div>
      ) : (
        <div className='space-y-1 text-white/80'>
          {method.publicKey && <p className='break-all'><span className='text-white/60'>Wallet address:</span> {method.publicKey}</p>}
          {config?.network && <p><span className='text-white/60'>Network:</span> {config.network}</p>}
          {config?.instructions && <p className='pt-1 italic text-white/70'>{config.instructions}</p>}
        </div>
      )}
    </div>
  );
}

export default function CartModal() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, totalKobo, clear } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [placing, setPlacing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proofImage, setProofImage] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingMethods(true);
    fetchPaymentMethods()
      .then((data) => {
        setPaymentMethods(data.methods.filter((m) => m.enabled));
        setSelectedMethod(data.methods.find((m) => m.enabled) ?? null);
      })
      .catch(() => setError('Could not load payment methods'))
      .finally(() => setLoadingMethods(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setOrder(null);
      setError(null);
      setProofImage('');
      setProofNote('');
      setProofUploaded(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handlePlaceOrder() {
    if (!selectedMethod) {
      toast.error('Choose a payment method.');
      return;
    }
    if (!address.trim() || !phone.trim()) {
      toast.error('Address and phone are required.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const payload = {
        address: address.trim(),
        phone: phone.trim(),
        paymentProvider: selectedMethod.provider,
        items: items.map((item) => ({
          foodSlug: item.foodSlug,
          optionId: item.option.id,
          quantity: item.quantity,
          sideIds: item.sides.map((s) => s.id),
        })),
      };
      const created = await createOrder(payload, getCustomerToken());
      setOrder(created);
      clear();
      if (!isManualProvider(created.payment.provider)) {
        setVerifying(true);
        try {
          await verifyPayment(created.payment.id, created.payment.idempotencyKey);
          navigate(`/track/${created.order.orderNumber}`);
          setIsOpen(false);
        } catch {
          navigate(`/track/${created.order.orderNumber}`);
          setIsOpen(false);
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
      const image = await readImageFile(file);
      setProofImage(image);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read image');
    }
  }

  function handleDone() {
    if (order) navigate(`/track/${order.order.orderNumber}`);
    setIsOpen(false);
  }

  const deliveryFee = order?.order.deliveryFee ? order.order.deliveryFee : null;
  const grandTotal = order?.order.total
    ? order.order.total
    : formatPrice(totalKobo);

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4'
      onClick={() => setIsOpen(false)}
      role='dialog'
      aria-modal='true'
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className='relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-brand-900 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl'
      >
        <div className='flex items-center justify-between border-b border-white/10 px-6 py-4'>
          <h2 className='text-xl font-bold text-white'>Your cart</h2>
          <button onClick={() => setIsOpen(false)} aria-label='Close' className='rounded-full p-2 text-white/70 hover:bg-white/10'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8'>
          {order ? (
            <div className='text-center'>
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300'>
                <CheckCircle className='h-8 w-8' />
              </div>
              <h3 className='mt-4 text-2xl font-bold text-white'>Order placed!</h3>
              <p className='mt-2 text-white/70'>
                {order.order.orderNumber} — Total {order.order.total}
              </p>

              {isManualProvider(order.payment.provider) ? (
                <div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-left'>
                  <h4 className='font-semibold text-white'>Upload payment proof</h4>
                  <p className='mt-1 text-sm text-white/60'>
                    Pay to the {order.payment.provider === 'BANK_TRANSFER' ? 'account' : 'address'} below, then upload proof.
                  </p>
                  {selectedMethod && <PaymentDetails method={selectedMethod} />}

                  {proofUploaded ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className='mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center'
                    >
                      <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-black'>
                        <CheckCircle className='h-8 w-8' />
                      </div>
                      <h5 className='mt-4 text-lg font-bold text-white'>Proof received!</h5>
                      <p className='mt-2 text-sm leading-relaxed text-emerald-100'>
                        Your payment proof has been uploaded. The restaurant will review it and confirm your order. You can track the progress at any time with your order number.
                      </p>
                      <button
                        onClick={handleDone}
                        className='mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black transition hover:bg-white/90'
                      >
                        Track my order <ArrowRight className='h-5 w-5' />
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <label className='mt-4 block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-white/70 hover:bg-white/10'>
                        <Upload className='mx-auto h-6 w-6' />
                        <span className='mt-2 block text-sm'>{proofImage ? 'Change image' : 'Tap to upload proof'}</span>
                        <input type='file' accept='image/*' onChange={handleProofFile} className='hidden' />
                      </label>
                      {proofImage && <img src={proofImage} alt='' className='mt-4 max-h-40 w-full rounded-2xl object-contain' />}
                      <textarea
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder='Sender name / reference / note'
                        className='mt-4 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
                      />
                      <button
                        onClick={handleUploadProof}
                        disabled={!proofImage || proofLoading}
                        className='mt-4 w-full rounded-full bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'
                      >
                        {proofLoading ? (
                          <span className='flex items-center justify-center gap-2'>
                            <Loader2 className='h-5 w-5 animate-spin' /> Uploading…
                          </span>
                        ) : (
                          'Upload proof'
                        )}
                      </button>
                    </>
                  )}
                </div>
              ) : verifying ? (
                <div className='mt-6 flex items-center justify-center gap-2 text-white/70'>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  Verifying payment…
                </div>
              ) : null}

              <button
                onClick={handleDone}
                className='mt-6 w-full rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90'
              >
                {isManualProvider(order.payment.provider) ? 'Done' : 'Track my order'}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className='py-12 text-center text-white/70'>
              <p>Your cart is empty.</p>
              <p className='mt-2 text-sm'>Pick a dish to get started.</p>
            </div>
          ) : (
            <>
              <div className='space-y-4'>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className='flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4'
                  >
                    <div className='h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5'>
                      {item.foodImage ? (
                        <img
                          src={item.foodImage}
                          alt={item.foodName}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center text-xs text-white/30'>
                          No image
                        </div>
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <p className='font-semibold text-white'>{item.foodName}</p>
                          <p className='text-sm text-white/60'>{item.option.label}</p>
                          {item.sides.length > 0 && (
                            <p className='mt-1 text-xs text-white/50'>
                              + {item.sides.map((s) => s.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className='rounded-full p-1 text-red-300 hover:bg-red-500/10'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                      <div className='mt-3 flex items-center justify-between'>
                        <div className='flex items-center gap-2 rounded-full border border-white/20 bg-white/5 p-1'>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className='rounded-full p-1 text-white hover:bg-white/10'
                          >
                            <Minus className='h-4 w-4' />
                          </button>
                          <span className='min-w-[1.5rem] text-center text-white'>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className='rounded-full p-1 text-white hover:bg-white/10'
                          >
                            <Plus className='h-4 w-4' />
                          </button>
                        </div>
                        <p className='font-semibold text-white'>
                          {formatPrice(
                            (item.option.priceKobo * item.quantity) +
                              item.sides.reduce((sum, s) => sum + s.priceKobo, 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className='mt-8 rounded-2xl border border-white/10 bg-white/5 p-4'>
                <p className='flex justify-between text-sm text-white/80'>
                  <span>Subtotal</span>
                  <span className='font-semibold'>{formatPrice(totalKobo)}</span>
                </p>
                {deliveryFee && (
                  <p className='mt-2 flex justify-between text-sm text-white/80'>
                    <span>Delivery</span>
                    <span className='font-semibold'>{deliveryFee}</span>
                  </p>
                )}
                <p className='mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-white'>
                  <span>Total</span>
                  <span>{grandTotal}</span>
                </p>
              </div>

              <div className='mt-6 grid gap-4'>
                <label className='block'>
                  <span className='flex items-center gap-2 text-sm font-medium text-white/90'>
                    <MapPin className='h-4 w-4' /> Delivery address
                  </span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder='e.g. 12 Alhaji Road, Lagos'
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
                  />
                </label>

                <label className='block'>
                  <span className='flex items-center gap-2 text-sm font-medium text-white/90'>
                    <Phone className='h-4 w-4' /> Phone number
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder='e.g. 0803 000 0000'
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
                  />
                </label>

                <div className='block'>
                  <span className='flex items-center gap-2 text-sm font-medium text-white/90'>
                    <CreditCard className='h-4 w-4' /> Payment method
                  </span>
                  {loadingMethods ? (
                    <Loader2 className='mt-2 h-5 w-5 animate-spin text-white/60' />
                  ) : (
                    <div className='mt-2 grid gap-2'>
                      {paymentMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                            selectedMethod?.id === method.id
                              ? 'border-emerald-400 bg-emerald-500/10'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <input
                            type='radio'
                            name='payment'
                            checked={selectedMethod?.id === method.id}
                            onChange={() => setSelectedMethod(method)}
                            className='h-5 w-5 border-white/30 bg-white/5 text-emerald-500'
                          />
                          <span className='font-medium text-white'>{method.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedMethod && <PaymentDetails method={selectedMethod} />}
                </div>
              </div>

              {error && <p className='mt-4 text-sm text-red-300'>{error}</p>}

              <button
                onClick={handlePlaceOrder}
                disabled={placing || items.length === 0}
                className='mt-6 w-full rounded-full bg-white py-3 text-lg font-bold text-black transition hover:bg-white/90 disabled:opacity-50'
              >
                {placing ? (
                  <span className='flex items-center justify-center gap-2'>
                    <Loader2 className='h-5 w-5 animate-spin' /> Placing order…
                  </span>
                ) : (
                  `Place order · ${formatPrice(totalKobo)}`
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
