import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptModal({
  open,
  title = 'Enter the code',
  message = 'Please enter the code to continue.',
  placeholder = 'Code',
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  };

  if (!open) return null;
  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-0 pt-20 backdrop-blur-sm sm:items-center sm:pt-0 sm:p-4'
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
        <p className='mt-3 text-sm leading-relaxed text-white/70'>{message}</p>
        <form onSubmit={submit} className='mt-4 space-y-4'>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder-white/40 outline-none focus:border-emerald-500'
            autoComplete='off'
          />
          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 rounded-full border border-white/20 bg-transparent py-3 font-bold text-white transition hover:bg-white/10'
            >
              {cancelLabel}
            </button>
            <button
              type='submit'
              disabled={!value.trim()}
              className='flex-1 rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
