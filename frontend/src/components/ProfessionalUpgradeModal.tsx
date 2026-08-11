import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, Calendar, CheckCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { applyProfessionalUpgrade } from '../lib/rider';

const REQUIREMENTS = [
  'Valid government-issued ID',
  'Vehicle registration or ownership proof',
  'No outstanding violations',
  'Professional packaging standard (will be tested)',
];

const STEPS = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'documents', label: 'Documents' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'review', label: 'Review' },
];

export default function ProfessionalUpgradeModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState(0);
  const [documents, setDocuments] = useState<string[]>([]);
  const [newDocument, setNewDocument] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addDocument() {
    if (newDocument.trim() && !documents.includes(newDocument.trim())) {
      setDocuments([...documents, newDocument.trim()]);
      setNewDocument('');
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await applyProfessionalUpgrade({
        documents,
        preferredDate,
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Application failed');
    } finally {
      setSubmitting(false);
    }
  }

  function canNext() {
    if (step === 1 && documents.length === 0) return false;
    if (step === 2 && !preferredDate) return false;
    return true;
  }

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4'>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className='relative flex h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-brand-900 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-3xl'
      >
        <div className='flex items-center justify-between border-b border-white/10 px-6 py-4'>
          <div>
            <h2 className='text-xl font-bold text-white'>Upgrade to Professional</h2>
            <p className='text-xs text-white/60'>Higher-tier delivery, premium service</p>
          </div>
          <button onClick={onClose} aria-label='Close' className='rounded-full p-2 text-white/70 hover:bg-white/10'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='px-6 pt-4'>
          <div className='flex items-center justify-between gap-1'>
            {STEPS.map((s, i) => (
              <div key={s.id} className='flex flex-1 flex-col items-center gap-1'>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    i <= step ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {i < step ? <CheckCircle className='h-3.5 w-3.5' /> : i + 1}
                </div>
                <span className='text-[10px] text-white/60'>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className='flex-1 overflow-y-auto px-6 py-6'>
          <AnimatePresence mode='wait'>
            {step === 0 && (
              <StepPanel key='requirements'>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <div className='mb-4 flex items-center gap-2 text-emerald-300'>
                    <ShieldCheck className='h-5 w-5' /> <span className='font-bold'>Professional standard</span>
                  </div>
                  <p className='text-sm text-white/70'>
                    Professional partners can deliver larger, longer-distance orders. Before you qualify, you need:
                  </p>
                  <ul className='mt-4 space-y-2 text-sm text-white/80'>
                    {REQUIREMENTS.map((r, i) => (
                      <li key={i} className='flex items-center gap-2'>
                        <CheckCircle className='h-4 w-4 text-emerald-400' /> {r}
                      </li>
                    ))}
                  </ul>
                  <label className='mt-6 flex items-start gap-3 text-sm text-white/70'>
                    <input type='checkbox' checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className='mt-1 h-4 w-4' />
                    <span>I understand the requirements and want to continue.</span>
                  </label>
                </div>
              </StepPanel>
            )}

            {step === 1 && (
              <StepPanel key='documents'>
                <p className='mb-4 text-sm text-white/70'>Add document URLs for verification.</p>
                <div className='flex gap-2'>
                  <input
                    value={newDocument}
                    onChange={(e) => setNewDocument(e.target.value)}
                    placeholder='https://... or document link'
                    className='flex-1 rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
                  />
                  <button onClick={addDocument} className='rounded-2xl bg-emerald-500 px-4 font-bold text-black'>
                    Add
                  </button>
                </div>
                <div className='mt-4 space-y-2'>
                  {documents.map((d, i) => (
                    <div key={i} className='flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80'>
                      <span className='flex items-center gap-2'><FileText className='h-4 w-4' /> {d}</span>
                      <button onClick={() => setDocuments(documents.filter((_, j) => j !== i))} className='text-red-300'>Remove</button>
                    </div>
                  ))}
                </div>
              </StepPanel>
            )}

            {step === 2 && (
              <StepPanel key='inspection'>
                <p className='mb-4 text-sm text-white/70'>Schedule your inspection.</p>
                <label className='block text-sm text-white/60'>
                  Preferred date and time
                  <input
                    type='datetime-local'
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                  />
                </label>
                <p className='mt-4 text-sm text-white/50'>
                  <Calendar className='inline h-4 w-4' /> We'll confirm a time slot with you.
                </p>
              </StepPanel>
            )}

            {step === 3 && (
              <StepPanel key='review'>
                <p className='mb-4 text-sm text-white/70'>Review your upgrade request</p>
                <div className='space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80'>
                  <p className='flex justify-between'><span className='text-white/50'>Documents</span> {documents.length}</p>
                  <p className='flex justify-between'><span className='text-white/50'>Preferred date</span> {preferredDate ? new Date(preferredDate).toLocaleString() : '—'}</p>
                </div>
                {error && <p className='mt-3 text-sm text-red-300'>{error}</p>}
              </StepPanel>
            )}
          </AnimatePresence>
        </div>

        <div className='flex items-center justify-between border-t border-white/10 px-6 py-4'>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
            className='inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 disabled:opacity-0'
          >
            <ChevronLeft className='h-4 w-4' /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext() || (step === 0 && !agreed)}
              className='inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
            >
              Next <ChevronRight className='h-4 w-4' />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className='inline-flex items-center gap-1 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
            >
              {submitting ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle className='h-4 w-4' />}
              Request inspection
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

function StepPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
