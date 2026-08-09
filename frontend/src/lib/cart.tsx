import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { FoodOption, Side } from './api';

export interface CartItem {
  id: string;
  foodSlug: string;
  foodName: string;
  foodImage?: string | null;
  option: FoodOption;
  quantity: number;
  sides: Side[];
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  totalKobo: number;
  count: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('oye_cart');
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('oye_cart', JSON.stringify(items));
  }, [items]);

  const totalKobo = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.option.priceKobo * item.quantity + item.sides.reduce((s, side) => s + side.priceKobo, 0),
        0
      ),
    [items]
  );

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  function addItem(item: Omit<CartItem, 'id'>) {
    setItems((prev) => [...prev, { ...item, id: generateId() }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }

  function clear() {
    setItems([]);
  }

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clear, totalKobo, count, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
