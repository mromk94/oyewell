import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Yes, continue',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4'
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='w-full max-w-sm rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:rounded-3xl'
      >
        <div className='flex items-center justify-between'>
          <h2 className='text-xl font-black text-white'>{title}</h2>
          <button
            onClick={onCancel}
            className='rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
            aria-label='Close'
          >
            <X className='h-5 w-5' />
          </button>
        </div>
        <div className='mt-4 flex gap-3'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10'>
            <AlertTriangle className='h-5 w-5 text-yellow-400' />
          </div>
          <p className='text-sm leading-relaxed text-white/80'>{message}</p>
        </div>
        <div className='mt-6 flex gap-3'>
          <button
            onClick={onCancel}
            className='flex-1 rounded-full border border-white/20 bg-transparent py-3 font-bold text-white transition hover:bg-white/10'
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-full py-3 font-bold text-white transition ${
              danger
                ? 'bg-red-500 hover:bg-red-400'
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
