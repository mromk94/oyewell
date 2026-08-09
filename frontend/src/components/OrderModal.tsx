import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, MapPin, Phone, CheckCircle, Loader2, AlertCircle, Upload, ArrowRight } from 'lucide-react';
import {
  formatPrice,
  checkDelivery,
  createOrder,
  verifyPayment,
  uploadPaymentProof,
  fetchSides,
  fetchPaymentMethods,
  getCustomerToken,
  type FoodItem,
  type FoodOption,
  type Side,
  type CreatedOrder,
  type PaymentMethod,
} from '../lib/api';
import { useNavigate } from 'react-router-dom';

type Step = 'configure' | 'delivery' | 'payment' | 'manual-payment' | 'confirmation';

interface OrderModalProps {
  food: FoodItem;
  open: boolean;
  onClose: () => void;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'configure', label: 'Order' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
  { key: 'confirmation', label: 'Confirm' },
];

const optionPrompt: Record<FoodItem['orderingMode'], string> = {
  PLATE: 'Choose a plate size and quantity',
  PORTION: 'Choose a portion size and quantity',
  PIECE: 'Choose how many pieces',
};

function isManualProvider(provider: string) {
  return provider === 'BANK_TRANSFER' || provider === 'CRYPTO';
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

export default function OrderModal({ food, open, onClose }: OrderModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('configure');
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(food.options[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [sides, setSides] = useState<Side[]>([]);
  const [selectedSideIds, setSelectedSideIds] = useState<Set<string>>(new Set());
  const [sidesLoading, setSidesLoading] = useState(false);
  const [configureError, setConfigureError] = useState<string | null>(null);

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [delivery, setDelivery] = useState<{
    available: boolean;
    total: string;
    deliveryFee: string;
    subtotal: string;
    message: string;
    zoneName?: string;
    estimatedMinutes?: number | null;
    sides: Side[];
  } | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryLocked, setDeliveryLocked] = useState(false);

  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const [proofImage, setProofImage] = useState<string>('');
  const [proofNote, setProofNote] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('configure');
      setSelectedOption(food.options[0] ?? null);
      setQuantity(1);
      setSelectedSideIds(new Set());
      setConfigureError(null);
      setAddress('');
      setPhone('');
      setDelivery(null);
      setDeliveryLocked(false);
      setOrder(null);
      setPaymentLoading(false);
      setPaymentMethods([]);
      setSelectedMethod(null);
      setProofImage('');
      setProofNote('');
      setProofUploaded(false);
      setError(null);
      setSidesLoading(true);
      fetchSides()
        .then((data) => setSides(data.sides.filter((s) => s.isAvailable)))
        .catch(() => setError('Failed to load sides'))
        .finally(() => setSidesLoading(false));

      fetchPaymentMethods()
        .then((data) => {
          const enabled = data.methods.filter((m: PaymentMethod) => m.enabled);
          setPaymentMethods(enabled);
          if (enabled.length > 0) setSelectedMethod(enabled[0]);
        })
        .catch(() => setError('Failed to load payment methods'));
    }
  }, [open, food]);

  const selectedSides = useMemo(
    () => sides.filter((s) => selectedSideIds.has(s.id)),
    [sides, selectedSideIds]
  );

  const sidesKobo = useMemo(
    () => selectedSides.reduce((sum, s) => sum + s.priceKobo, 0),
    [selectedSides]
  );

  const subtotalKobo = useMemo(() => {
    if (!selectedOption) return 0;
    return selectedOption.priceKobo * quantity + sidesKobo;
  }, [selectedOption, quantity, sidesKobo]);

  const canDecrement = quantity > 1;
  const canIncrement = selectedOption
    ? selectedOption.stock === null || quantity < selectedOption.stock
    : false;

  function toggleSide(id: string) {
    setSelectedSideIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function validateConfigure(): boolean {
    if (!selectedOption) {
      setConfigureError('Please choose an option.');
      return false;
    }
    if (!selectedOption.isAvailable) {
      setConfigureError('This option is unavailable.');
      return false;
    }
    if (selectedOption.stock !== null && quantity > selectedOption.stock) {
      setConfigureError(`Only ${selectedOption.stock} available.`);
      return false;
    }
    setConfigureError(null);
    return true;
  }

  async function handleCheckDelivery() {
    if (!selectedOption || !address.trim() || !phone.trim()) {
      setError('Please enter your address and phone number.');
      return;
    }
    setError(null);
    setDeliveryLoading(true);
    try {
      const result = await checkDelivery({
        address: address.trim(),
        phone: phone.trim(),
        foodSlug: food.slug,
        optionId: selectedOption.id,
        quantity,
        sideIds: selectedSides.map((s) => s.id),
      });
      setDelivery({
        ...result,
        sides: result.sides,
        zoneName: result.zone?.name,
        estimatedMinutes: result.zone?.estimatedMinutes,
      });
      if (result.available) {
        setDeliveryLocked(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delivery check failed');
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function handlePay() {
    if (!selectedOption || !delivery?.available || !deliveryLocked || !selectedMethod) return;
    setPaymentLoading(true);
    setError(null);
    try {
      const created = await createOrder(
        {
          foodSlug: food.slug,
          optionId: selectedOption.id,
          quantity,
          address: address.trim(),
          phone: phone.trim(),
          paymentProvider: selectedMethod.provider,
          sideIds: selectedSides.map((s) => s.id),
        },
        getCustomerToken()
      );

      if (isManualProvider(created.payment.provider)) {
        setOrder(created);
        setStep('manual-payment');
        return;
      }

      await verifyPayment(created.payment.id, created.payment.idempotencyKey);
      setOrder(created);
      setStep('confirmation');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleUploadProof() {
    if (!proofImage || !order) return;
    setProofLoading(true);
    setError(null);
    try {
      await uploadPaymentProof(order.payment.id, proofImage, proofNote);
      setProofUploaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload proof');
    } finally {
      setProofLoading(false);
    }
  }

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

  const isManual = step === 'manual-payment';
  const activeStepIndex = isManual ? 2 : STEPS.findIndex((s) => s.key === step);

  if (!open) return null;

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label={`Order ${food.name}`}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className='relative w-full max-w-2xl overflow-hidden rounded-t-3xl bg-brand-900 shadow-2xl sm:rounded-3xl'
      >
        <div className='flex items-center justify-between border-b border-white/10 px-6 py-4'>
          <div className='flex gap-3'>
            {STEPS.map(({ key, label }, i) => {
              const passed = !isManual && i <= activeStepIndex;
              const current = isManual ? key === 'payment' : key === step;
              return (
                <div key={key} className='flex items-center gap-2'>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      current ? 'bg-white text-black' : passed ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {passed ? '✓' : i + 1}
                  </span>
                  <span
                    className={`hidden text-sm font-medium sm:inline ${
                      current ? 'text-white' : 'text-white/60'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={onClose}
            aria-label='Close'
            className='rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {error && (
          <div className='flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-6 py-3 text-sm text-red-200'>
            <AlertCircle className='h-4 w-4 shrink-0' />
            {error}
          </div>
        )}

        <AnimatePresence mode='wait'>
          {step === 'configure' && (
            <motion.div
              key='configure'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className='px-6 py-6 sm:px-8 sm:py-8'
            >
              <h2 className='text-2xl font-bold text-white'>{food.name}</h2>
              <p className='mt-1 text-white/60'>{optionPrompt[food.orderingMode]}</p>

              <div className='mt-6 space-y-3'>
                <label className='text-sm font-medium text-white/80'>
                  {food.orderingMode === 'PORTION'
                    ? 'Portion size'
                    : food.orderingMode === 'PIECE'
                    ? 'Piece size'
                    : 'Plate size'}
                </label>
                <select
                  value={selectedOption?.id ?? ''}
                  onChange={(e) => {
                    const option = food.options.find((o) => o.id === e.target.value) ?? null;
                    setSelectedOption(option);
                    setQuantity(1);
                    setConfigureError(null);
                  }}
                  className='w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white'
                >
                  {food.options.map((option) => (
                    <option key={option.id} value={option.id} disabled={!option.isAvailable}>
                      {option.label} — {formatPrice(option.priceKobo)}
                      {option.stock !== null ? ` (${option.stock} left)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className='mt-6 flex items-center gap-4'>
                <span className='text-white/80'>Quantity</span>
                <div className='flex items-center gap-3 rounded-full border border-white/20 bg-white/5 p-1'>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={!canDecrement}
                    aria-label='Decrease quantity'
                    className='rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-30'
                  >
                    <Minus className='h-5 w-5' />
                  </button>
                  <span className='min-w-[2rem] text-center text-lg font-semibold text-white'>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => (canIncrement ? q + 1 : q))}
                    disabled={!canIncrement}
                    aria-label='Increase quantity'
                    className='rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-30'
                  >
                    <Plus className='h-5 w-5' />
                  </button>
                </div>
              </div>

              {sidesLoading ? (
                <Loader2 className='mt-6 h-6 w-6 animate-spin text-white/60' />
              ) : sides.length ? (
                <div className='mt-6'>
                  <h3 className='text-sm font-medium text-white/80'>Add sides</h3>
                  <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    {sides.map((side) => (
                      <label
                        key={side.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                          selectedSideIds.has(side.id)
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <input
                          type='checkbox'
                          checked={selectedSideIds.has(side.id)}
                          onChange={() => toggleSide(side.id)}
                          className='h-5 w-5 rounded border-white/30 bg-white/5 text-emerald-500'
                        />
                        <div className='flex-1'>
                          <p className='font-medium text-white'>{side.name}</p>
                          <p className='text-sm text-white/60'>{formatPrice(side.priceKobo)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {configureError && <p className='mt-4 text-sm font-medium text-red-300'>{configureError}</p>}

              <div className='mt-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
                <div>
                  <p className='text-sm text-white/60'>Subtotal</p>
                  <p className='text-3xl font-bold text-white'>{formatPrice(subtotalKobo)}</p>
                </div>
                <button
                  onClick={() => {
                    if (validateConfigure()) setStep('delivery');
                  }}
                  className='w-full rounded-full bg-white px-8 py-3 text-lg font-bold text-black shadow-lg transition hover:bg-white/90 sm:w-auto'
                >
                  Continue to Delivery
                </button>
              </div>
            </motion.div>
          )}

          {step === 'delivery' && (
            <motion.div
              key='delivery'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className='px-6 py-6 sm:px-8 sm:py-8'
            >
              <h2 className='text-2xl font-bold text-white'>Delivery details</h2>
              <p className='mt-1 text-white/60'>Enter your address and phone number.</p>

              <div className='mt-6 space-y-4'>
                <div>
                  <label htmlFor='address' className='flex items-center gap-2 text-sm font-medium text-white/80'>
                    <MapPin className='h-4 w-4' /> Delivery address
                  </label>
                  <textarea
                    id='address'
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (deliveryLocked) {
                        setDeliveryLocked(false);
                        setDelivery(null);
                      }
                    }}
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none transition focus:border-white'
                    rows={3}
                    placeholder='Street, area, city'
                  />
                </div>
                <div>
                  <label htmlFor='phone' className='flex items-center gap-2 text-sm font-medium text-white/80'>
                    <Phone className='h-4 w-4' /> Phone number
                  </label>
                  <input
                    id='phone'
                    type='tel'
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (deliveryLocked) {
                        setDeliveryLocked(false);
                        setDelivery(null);
                      }
                    }}
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none transition focus:border-white'
                    placeholder='080...'
                  />
                </div>
              </div>

              {delivery && (
                <div
                  className={`mt-6 rounded-2xl border p-4 ${
                    delivery.available
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <p
                    className={`font-semibold ${
                      delivery.available ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {delivery.message}
                  </p>
                  {delivery.available && (
                    <div className='mt-2 text-sm text-white/80'>
                      <p>Subtotal: {delivery.subtotal}</p>
                      <p>Delivery fee: {delivery.deliveryFee}</p>
                      <p>Total: {delivery.total}</p>
                      {delivery.estimatedMinutes ? <p>Est. {delivery.estimatedMinutes} mins</p> : null}
                    </div>
                  )}
                </div>
              )}

              {deliveryLocked && delivery?.available && (
                <div className='mt-8 text-center'>
                  <button
                    onClick={() => setStep('payment')}
                    className='w-full rounded-full bg-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-emerald-400'
                  >
                    Lock in address & continue
                  </button>
                </div>
              )}

              <div className='mt-6 flex items-center justify-between'>
                <button
                  onClick={() => setStep('configure')}
                  className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
                >
                  Back
                </button>
                <button
                  onClick={handleCheckDelivery}
                  disabled={deliveryLoading || !address.trim() || !phone.trim()}
                  className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50'
                >
                  {deliveryLoading ? <Loader2 className='inline h-4 w-4 animate-spin' /> : null}
                  {deliveryLocked ? 'Recheck' : 'Check availability'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key='payment'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className='px-6 py-6 sm:px-8 sm:py-8'
            >
              <h2 className='text-2xl font-bold text-white'>Payment</h2>
              <p className='mt-1 text-white/60'>Review and complete your order.</p>

              <div className='mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5'>
                <div className='flex justify-between text-white/80'>
                  <span>Subtotal</span>
                  <span>{delivery?.subtotal}</span>
                </div>
                <div className='flex justify-between text-white/80'>
                  <span>Delivery fee</span>
                  <span>{delivery?.deliveryFee}</span>
                </div>
                {selectedSides.length > 0 && (
                  <div className='space-y-1 border-t border-white/10 pt-2 text-sm text-white/70'>
                    {selectedSides.map((s) => (
                      <div key={s.id} className='flex justify-between'>
                        <span>{s.name}</span>
                        <span>{formatPrice(s.priceKobo)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className='flex justify-between border-t border-white/10 pt-3 text-xl font-bold text-white'>
                  <span>Total</span>
                  <span>{delivery?.total}</span>
                </div>
              </div>

              <div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-5'>
                <p className='font-medium text-white'>Payment method</p>
                {paymentMethods.length === 0 ? (
                  <p className='mt-1 text-sm text-white/60'>No payment methods are currently enabled.</p>
                ) : (
                  <div className='mt-3 space-y-2'>
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                          selectedMethod?.id === method.id
                            ? 'border-emerald-400 bg-emerald-500/10'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <input
                          type='radio'
                          name='paymentMethod'
                          value={method.id}
                          checked={selectedMethod?.id === method.id}
                          onChange={() => setSelectedMethod(method)}
                          className='h-5 w-5 border-white/30 bg-white/5 text-emerald-500'
                        />
                        <span className='text-white'>{method.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className='mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between'>
                <button
                  onClick={() => setStep('delivery')}
                  className='rounded-full border border-white/20 px-6 py-3 text-white transition hover:bg-white/5'
                >
                  Back
                </button>
                <button
                  onClick={handlePay}
                  disabled={paymentLoading || !selectedMethod}
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 font-bold text-black shadow-lg transition hover:bg-white/90 disabled:opacity-50'
                >
                  {paymentLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : null}
                  Pay & confirm order
                </button>
              </div>
            </motion.div>
          )}

          {step === 'manual-payment' && order && selectedMethod && (
            <motion.div
              key='manual-payment'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className='px-6 py-6 sm:px-8 sm:py-8'
            >
              <h2 className='text-2xl font-bold text-white'>
                {selectedMethod.provider === 'BANK_TRANSFER' ? 'Bank transfer' : 'Crypto payment'}
              </h2>
              <p className='mt-1 text-white/60'>
                Send {order.order.total} and upload your proof of payment.
              </p>

              <div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-5'>
                <p className='text-sm text-white/60'>Order number</p>
                <p className='text-xl font-bold text-white'>{order.order.orderNumber}</p>

                {selectedMethod.provider === 'BANK_TRANSFER' && (
                  <div className='mt-4 space-y-2'>
                    <p className='text-sm text-white/60'>Bank account details</p>
                    {selectedMethod.config?.bankName && (
                      <p className='text-white'>Bank: {selectedMethod.config.bankName}</p>
                    )}
                    {selectedMethod.config?.accountName && (
                      <p className='text-white'>Account name: {selectedMethod.config.accountName}</p>
                    )}
                    {selectedMethod.publicKey && (
                      <p className='text-white'>Account number: {selectedMethod.publicKey}</p>
                    )}
                    {selectedMethod.config?.accountNumber && (
                      <p className='text-white'>Account number: {selectedMethod.config.accountNumber}</p>
                    )}
                    {selectedMethod.config?.instructions && (
                      <p className='text-sm text-white/70'>{selectedMethod.config.instructions}</p>
                    )}
                  </div>
                )}

                {selectedMethod.provider === 'CRYPTO' && (
                  <div className='mt-4 space-y-2'>
                    <p className='text-sm text-white/60'>Wallet address</p>
                    <p className='break-all font-mono text-sm text-white'>
                      {selectedMethod.publicKey || selectedMethod.config?.address || 'No address configured'}
                    </p>
                    {selectedMethod.config?.network && (
                      <p className='text-white'>Network: {selectedMethod.config.network}</p>
                    )}
                    {selectedMethod.config?.instructions && (
                      <p className='text-sm text-white/70'>{selectedMethod.config.instructions}</p>
                    )}
                  </div>
                )}
              </div>

              {!proofUploaded ? (
                <div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-5'>
                  <p className='font-medium text-white'>Upload proof of payment</p>
                  <p className='text-sm text-white/60'>A screenshot or receipt will help us confirm your payment.</p>

                  <label className='mt-4 block'>
                    <span className='text-sm text-white/80'>Receipt image</span>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleFileChange}
                      className='mt-2 block w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black'
                    />
                  </label>
                  {proofImage && (
                    <img src={proofImage} alt='' className='mt-4 max-h-40 rounded-2xl object-cover' />
                  )}

                  <label className='mt-4 block'>
                    <span className='text-sm text-white/80'>Note (optional)</span>
                    <input
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder='Sender name, transaction ID, etc.'
                      className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                    />
                  </label>

                  <button
                    onClick={handleUploadProof}
                    disabled={!proofImage || proofLoading}
                    className='mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'
                  >
                    {proofLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : <Upload className='h-5 w-5' />}
                    Upload proof
                  </button>
                </div>
              ) : (
                <div className='mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center'>
                  <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300'>
                    <CheckCircle className='h-8 w-8' />
                  </div>
                  <h3 className='mt-4 text-xl font-bold text-white'>Proof uploaded</h3>
                  <p className='mt-2 text-white/70'>
                    Your payment is being verified. You can track the order and will be notified once it is
                    confirmed.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/track/${order.order.orderNumber}`);
                    }}
                    className='mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black'
                  >
                    Track order <ArrowRight className='h-4 w-4' />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'confirmation' && order && (
            <motion.div
              key='confirmation'
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className='px-6 py-10 text-center sm:px-8'
            >
              <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300'>
                <CheckCircle className='h-10 w-10' />
              </div>
              <h2 className='mt-6 text-3xl font-bold text-white'>Order confirmed</h2>
              <p className='mt-2 text-white/70'>Your order has been received.</p>

              <div className='mt-6 space-y-1 text-white/80'>
                <p className='text-2xl font-bold text-white'>{order.order.orderNumber}</p>
                <p>{order.order.total}</p>
                <p>{order.order.address}</p>
                <p>{order.order.phone}</p>
              </div>

              <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center'>
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/track/${order.order.orderNumber}`);
                  }}
                  className='rounded-full bg-white px-8 py-3 font-bold text-black shadow-lg transition hover:bg-white/90'
                >
                  Track your order
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}
