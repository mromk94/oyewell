import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X, CheckCircle, Search } from 'lucide-react';
import { fetchSides, formatPrice, type FoodItem, type FoodOption, type Side } from '../lib/api';
import { useCart } from '../lib/cart';
import { toast } from '../lib/toast';

interface OrderModalProps {
  food: FoodItem;
  open: boolean;
  onClose: () => void;
}

export default function OrderModal({ food, open, onClose }: OrderModalProps) {
  const { addItem, setIsOpen, totalKobo } = useCart();
  const [options, setOptions] = useState<FoodOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<FoodOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sides, setSides] = useState<Side[]>([]);
  const [selectedSideIds, setSelectedSideIds] = useState<Set<string>>(new Set());
  const [sideSearch, setSideSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOptions(food.options);
    setSelectedOption(food.options.find((o) => o.isAvailable) ?? food.options[0] ?? null);
    setQuantity(1);
    setSelectedSideIds(new Set());
    setAdded(false);
    setError(null);
    setLoading(true);
    fetchSides()
      .then((data) => setSides(data.sides.filter((s) => s.isAvailable)))
      .catch(() => setError('Failed to load sides'))
      .finally(() => setLoading(false));
  }, [open, food]);

  const filteredSides = useMemo(
    () => sides.filter((s) => s.name.toLowerCase().includes(sideSearch.toLowerCase())),
    [sides, sideSearch]
  );

  const selectedSideChips = useMemo(
    () => sides.filter((s) => selectedSideIds.has(s.id)),
    [sides, selectedSideIds]
  );

  function toggleSide(id: string) {
    setSelectedSideIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    if (!selectedOption) {
      toast.error('Please choose an option.');
      return;
    }
    if (!selectedOption.isAvailable) {
      toast.error('This option is unavailable.');
      return;
    }
    if (selectedOption.stock !== null && quantity > selectedOption.stock) {
      toast.error(`Only ${selectedOption.stock} available.`);
      return;
    }
    addItem({
      source: 'RESTAURANT',
      foodSlug: food.slug,
      foodName: food.name,
      foodImage: food.heroImage,
      priceKobo: selectedOption.priceKobo,
      option: selectedOption,
      quantity,
      sides: sides.filter((s) => selectedSideIds.has(s.id)),
    });
    setAdded(true);
    setTimeout(() => {
      onClose();
      setIsOpen(true);
    }, 600);
  }

  if (!open) return null;

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
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
          <div>
            <h2 className='text-xl font-bold text-white'>{food.name}</h2>
            <p className='text-sm text-white/60'>Choose an option, quantity and sides</p>
          </div>
          <button onClick={onClose} aria-label='Close' className='rounded-full p-2 text-white/70 hover:bg-white/10'>
            <X className='h-5 w-5' />
          </button>
        </div>

        {error && <p className='px-6 py-3 text-sm text-red-300'>{error}</p>}

        <AnimatePresence mode='wait'>
          {added ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className='px-6 py-12 text-center'
            >
              <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300'>
                <CheckCircle className='h-8 w-8' />
              </div>
              <h3 className='mt-4 text-2xl font-bold text-white'>Added to cart</h3>
              <p className='mt-2 text-white/70'>Your cart total is now {formatPrice(totalKobo)}</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='px-6 py-6 sm:px-8 sm:py-8'
            >
              <div className='max-h-48 space-y-3 overflow-y-auto pr-2'>
                {options.map((option) => (
                  <button
                    key={option.id}
                    type='button'
                    onClick={() => {
                      setSelectedOption(option);
                      setQuantity(1);
                    }}
                    disabled={!option.isAvailable}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                      selectedOption?.id === option.id
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-white/10 bg-white/5'
                    } ${!option.isAvailable ? 'cursor-not-allowed opacity-50' : 'hover:border-white/30'}`}
                  >
                    <div>
                      <p className='font-semibold text-white'>{option.label}</p>
                      {option.stock !== null && <p className='text-sm text-white/60'>{option.stock} left</p>}
                    </div>
                    <p className='text-lg font-bold text-white'>{formatPrice(option.priceKobo)}</p>
                  </button>
                ))}
              </div>

              <div className='mt-6 flex items-center gap-4'>
                <span className='text-white/80'>Quantity</span>
                <div className='flex items-center gap-3 rounded-full border border-white/20 bg-white/5 p-1'>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className='rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-30'
                  >
                    <Minus className='h-5 w-5' />
                  </button>
                  <span className='min-w-[2rem] text-center text-lg font-semibold text-white'>{quantity}</span>
                  <button
                    onClick={() =>
                      setQuantity((q) =>
                        selectedOption && (selectedOption.stock === null || q < selectedOption.stock) ? q + 1 : q
                      )
                    }
                    disabled={
                      !!selectedOption && selectedOption.stock !== null && quantity >= selectedOption.stock
                    }
                    className='rounded-full p-2 text-white hover:bg-white/10 disabled:opacity-30'
                  >
                    <Plus className='h-5 w-5' />
                  </button>
                </div>
              </div>

              {sides.length > 0 && (
                <div className='mt-6'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h3 className='text-sm font-medium text-white/80'>Add sides</h3>
                    {selectedSideChips.length > 0 && (
                      <span className='text-xs font-bold text-emerald-300'>
                        {selectedSideChips.length} selected
                      </span>
                    )}
                  </div>

                  {selectedSideChips.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                      {selectedSideChips.map((side) => (
                        <span
                          key={side.id}
                          className='inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300'
                        >
                          {side.name}
                          <button
                            type='button'
                            onClick={() => toggleSide(side.id)}
                            className='rounded-full p-0.5 hover:bg-emerald-500/30'
                            aria-label={`Remove ${side.name}`}
                          >
                            <X className='h-3 w-3' />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className='relative mb-3'>
                    <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40' />
                    <input
                      type='text'
                      placeholder='Search sides…'
                      value={sideSearch}
                      onChange={(e) => setSideSearch(e.target.value)}
                      className='w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/30'
                    />
                  </div>

                  <div className='max-h-64 overflow-y-auto pr-2'>
                    <div className='grid gap-3 sm:grid-cols-2'>
                      {filteredSides.map((side) => (
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
                      {filteredSides.length === 0 && (
                        <p className='col-span-full text-sm text-white/50'>No sides match your search.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className='mt-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
                <div>
                  <p className='text-sm text-white/60'>Subtotal</p>
                  <p className='text-3xl font-bold text-white'>
                    {selectedOption
                      ? formatPrice(
                          (selectedOption.priceKobo * quantity) +
                            sides
                              .filter((s) => selectedSideIds.has(s.id))
                              .reduce((sum, s) => sum + s.priceKobo, 0)
                        )
                      : '—'}
                  </p>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!selectedOption || loading}
                  className='w-full rounded-full bg-white px-8 py-3 text-lg font-bold text-black shadow-lg transition hover:bg-white/90 disabled:opacity-50 sm:w-auto'
                >
                  Add to cart
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
