import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, Loader2 } from 'lucide-react';
import { toast } from '../lib/toast';
import { createReport } from '../lib/reports';

const COMMON_REASONS = [
  'Unprofessional behavior',
  'Food safety concern',
  'Wrong or missing items',
  'Harassment or discrimination',
  'Fraud or scam',
  'Other',
];

interface Props {
  targetId: string;
  targetType: 'RIDER' | 'COOK' | 'LISTING' | 'USER';
  title?: string;
  onClose: () => void;
}

export default function ReportModal({ targetId, targetType, title, onClose }: Props) {
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await createReport({ targetId, targetType, reason, details });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send report');
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
          <h2 className='text-xl font-black text-white'>{title ?? 'Report'}</h2>
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
            <Flag className='mx-auto h-12 w-12 text-emerald-400' />
            <p className='mt-4 text-white'>Thank you. Your report has been sent to our moderation team.</p>
            <button
              onClick={onClose}
              className='mt-6 w-full rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400'
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
            <label className='block text-sm font-medium text-white/70'>Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className='w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-emerald-500'
            >
              {COMMON_REASONS.map((r) => (
                <option key={r} value={r} className='bg-brand-900 text-white'>
                  {r}
                </option>
              ))}
            </select>

            <label className='block text-sm font-medium text-white/70'>Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder='Tell us more about what happened...'
              rows={4}
              className='w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-3 text-white placeholder-white/40 outline-none focus:border-emerald-500'
            />

            <button
              type='submit'
              disabled={loading || !reason.trim()}
              className='inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 font-bold text-white transition hover:bg-red-400 disabled:opacity-50'
            >
              {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : <Flag className='h-4 w-4' />} Send report
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
