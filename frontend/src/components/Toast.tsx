import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toasts: Toast[] = [];
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

function addToast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).slice(2, 9);
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

export const toast = {
  success: (message: string) => addToast(message, 'success'),
  error: (message: string) => addToast(message, 'error'),
  info: (message: string) => addToast(message, 'info'),
  warning: (message: string) => addToast(message, 'warning'),
};

export function useToasts() {
  const [_, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return toasts;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-blue-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
};

const BORDERS: Record<ToastType, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-amber-500/30',
};

export default function Toaster() {
  const items = useToasts();

  function remove(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-end justify-start gap-2 p-4 sm:p-6">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border ${BORDERS[t.type]} bg-brand-900/95 p-4 shadow-2xl backdrop-blur`}
          >
            <div className="mt-0.5 shrink-0">{ICONS[t.type]}</div>
            <p className="flex-1 text-sm font-medium text-white">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="shrink-0 text-white/50 transition hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
