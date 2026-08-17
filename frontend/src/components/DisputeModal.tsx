import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '../lib/toast';
import { createDispute } from '../lib/api';

const DISPUTE_TYPES = [
  'Missing or wrong items',
  'Food quality issue',
  'Rider issue',
  'Cook issue',
  'Other',
];

interface Props {
  orderId: string;
  cookId?: string;
  riderId?: string;
  onClose: () => void;
}

export default function DisputeModal({ orderId, cookId, riderId, onClose }: Props) {
  const [type, setType] = useState(DISPUTE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type.trim()) return;
    setLoading(true);
    try {
      await createDispute({ type, orderId, cookId, riderId, description });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open dispute');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4'
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='w-full max-w-md rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:rounded-3xl'
      >
        <div className='flex items-center justify-between'>
          <h2 className='text-xl font-black text-white'>Open a dispute</h2>
          <button
            onClick={onClose}
            className='rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
            aria-label='Close'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {submitted ? (
          <div className='mt-6 text-center'>
            <AlertTriangle className='mx-auto h-12 w-12 text-emerald-400' />
            <p className='mt-4 text-white'>Your dispute has been submitted. Our moderation team will review it.</p>
            <button
              onClick={onClose}
              className='mt-6 w-full rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400'
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
            <label className='block text-sm font-medium text-white/70'>Issue type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className='w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-emerald-500'
            >
              {DISPUTE_TYPES.map((t) => (
                <option key={t} value={t} className='bg-brand-900 text-white'>
                  {t}
                </option>
              ))}
            </select>

            <label className='block text-sm font-medium text-white/70'>Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Describe what went wrong...'
              rows={4}
              className='w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-3 text-white placeholder-white/40 outline-none focus:border-emerald-500'
            />

            <button
              type='submit'
              disabled={loading || !type.trim()}
              className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 font-bold text-white transition hover:bg-red-400 disabled:opacity-50'
            >
              {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : <AlertTriangle className='h-4 w-4' />} Open dispute
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
