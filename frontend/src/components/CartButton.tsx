import { ShoppingBag } from 'lucide-react';
import { useCart } from '../lib/cart';
import { formatPrice } from '../lib/api';

export default function CartButton() {
  const { count, totalKobo, setIsOpen } = useCart();
  if (count === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className='fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-400'
    >
      <ShoppingBag className='h-5 w-5' />
      <span>{count}</span>
      <span className='hidden text-sm font-medium opacity-90 sm:inline'>{formatPrice(totalKobo)}</span>
    </button>
  );
}
