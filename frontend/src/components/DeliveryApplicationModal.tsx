import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Bike, CheckCircle, ChevronRight, ChevronLeft, Loader2, FileText } from 'lucide-react';
import { applyAsDeliveryPartner, fetchRiderOnboardingFields, type OnboardingField } from '../lib/api';

const MODES = [
  { id: 'WALK', label: 'Walking', icon: 'W' },
  { id: 'BICYCLE', label: 'Bicycle', icon: 'B' },
  { id: 'MOTORCYCLE', label: 'Motorcycle', icon: 'M' },
  { id: 'CAR', label: 'Car', icon: 'C' },
];

const STEPS = [
  { id: 'about', label: 'About you' },
  { id: 'mode', label: 'How you deliver' },
  { id: 'area', label: 'Where' },
  { id: 'kyc', label: 'Verification' },
  { id: 'review', label: 'Review' },
];

export default function DeliveryApplicationModal({
  firstName,
  lastName,
  phone,
  onClose,
  onSubmitted,
}: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('MOTORCYCLE');
  const [vehicle, setVehicle] = useState('');
  const [area, setArea] = useState('');
  const [radius, setRadius] = useState(5000);
  const [fields, setFields] = useState<OnboardingField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRiderOnboardingFields()
      .then((res) => setFields(res.fields))
      .catch(() => setError('Could not load onboarding form'))
      .finally(() => setFieldsLoading(false));
  }, []);

  const visibleFields = fields.filter((f) => {
    if (!f.gatingRule) return true;
    const [gateKey, gateValue] = f.gatingRule.split('=');
    return onboardingData[gateKey]?.toString() === gateValue;
  });

  function updateOnboarding(key: string, value: any) {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await applyAsDeliveryPartner({
        deliveryMode: mode,
        vehicle,
        operatingArea: area,
        serviceRadiusMeters: radius,
        kycSubmitted: !!(onboardingData.idDocumentUrl || onboardingData.facePhotoUrl),
        onboardingData,
      });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Application failed');
    } finally {
      setSubmitting(false);
    }
  }

  function canNext() {
    if (step === 1 && !mode) return false;
    if (step === 2 && !area.trim()) return false;
    if (step === 3) {
      for (const f of visibleFields) {
        if (f.required && (!onboardingData[f.key] || (Array.isArray(onboardingData[f.key]) && !onboardingData[f.key].length))) return false;
      }
    }
    return true;
  }

  if (fieldsLoading) {
    return createPortal(
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
        <Loader2 className='h-8 w-8 animate-spin text-emerald-400' />
      </div>,
      document.body
    );
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
            <h2 className='text-xl font-bold text-white'>Become a delivery partner</h2>
            <p className='text-xs text-white/60'>Earn money delivering food around you</p>
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
              <StepPanel key='about'>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <div className='mb-4 flex items-center gap-2 text-emerald-300'>
                    <User className='h-5 w-5' /> <span className='font-bold'>About you</span>
                  </div>
                  <p className='text-sm text-white/70'>
                    We'll use your profile name and phone to contact you.
                  </p>
                  <div className='mt-4 space-y-3 text-white/80'>
                    <p><span className='text-white/50'>Name:</span> {firstName || ''} {lastName || ''}</p>
                    <p><span className='text-white/50'>Phone:</span> {phone || 'Not set'}</p>
                  </div>
                </div>
              </StepPanel>
            )}

            {step === 1 && (
              <StepPanel key='mode'>
                <p className='mb-4 text-sm text-white/70'>How do you plan to deliver?</p>
                <div className='grid grid-cols-2 gap-3'>
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                        mode === m.id
                          ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Bike className='h-6 w-6' />
                      <span className='text-sm font-bold'>{m.label}</span>
                    </button>
                  ))}
                </div>
                <label className='mt-4 block text-sm text-white/60'>
                  Vehicle description (optional)
                  <input
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder='e.g. Red Honda motorcycle'
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
                  />
                </label>
              </StepPanel>
            )}

            {step === 2 && (
              <StepPanel key='area'>
                <p className='mb-4 text-sm text-white/70'>Where do you want to deliver?</p>
                <label className='block text-sm text-white/60'>
                  Your area or neighborhood
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder='e.g. Ikeja GRA, Lagos'
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
                  />
                </label>
                <label className='mt-4 block text-sm text-white/60'>
                  Delivery radius (meters)
                  <input
                    type='number'
                    value={radius}
                    onChange={(e) => setRadius(Math.max(500, Math.min(20000, Number(e.target.value))))}
                    className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                  />
                </label>
              </StepPanel>
            )}

            {step === 3 && (
              <StepPanel key='kyc'>
                <p className='mb-4 text-sm text-white/70'>Verification & references</p>
                <div className='space-y-4'>
                  {visibleFields.map((f) => (
                    <OnboardingInput key={f.id} field={f} value={onboardingData[f.key] ?? ''} onChange={(v) => updateOnboarding(f.key, v)} />
                  ))}
                  {fields.length === 0 && (
                    <p className='text-sm text-white/50'>No verification fields are currently configured.</p>
                  )}
                </div>
                {error && <p className='mt-3 text-sm text-red-300'>{error}</p>}
              </StepPanel>
            )}

            {step === 4 && (
              <StepPanel key='review'>
                <p className='mb-4 text-sm text-white/70'>Review your application</p>
                <div className='space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80'>
                  <p className='flex justify-between'><span className='text-white/50'>Name</span> {firstName || ''} {lastName || ''}</p>
                  <p className='flex justify-between'><span className='text-white/50'>Phone</span> {phone || '—'}</p>
                  <p className='flex justify-between'><span className='text-white/50'>Delivery mode</span> {MODES.find((m) => m.id === mode)?.label}</p>
                  <p className='flex justify-between'><span className='text-white/50'>Vehicle</span> {vehicle || '—'}</p>
                  <p className='flex justify-between'><span className='text-white/50'>Area</span> {area}</p>
                  <p className='flex justify-between'><span className='text-white/50'>Radius</span> {radius} m</p>
                  {visibleFields.map((f) => onboardingData[f.key] ? (
                    <p key={f.key} className='flex justify-between'>
                      <span className='text-white/50'>{f.label}</span>
                      <span className='truncate max-w-[150px]'>{String(onboardingData[f.key])}</span>
                    </p>
                  ) : null)}
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
              disabled={!canNext()}
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
              Submit application
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

function OnboardingInput({
  field,
  value,
  onChange,
}: {
  field: OnboardingField;
  value: any;
  onChange: (v: any) => void;
}) {
  const inputClass =
    'mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40';

  if (field.type === 'textarea') {
    return (
      <label className='block text-sm text-white/60'>
        {field.label} {field.required && <span className='text-red-300'>*</span>}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} rows={3} />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className='block text-sm text-white/60'>
        {field.label} {field.required && <span className='text-red-300'>*</span>}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value='' className='bg-brand-900'>Select...</option>
          {field.options.map((o) => (
            <option key={o} value={o} className='bg-brand-900'>{o}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'file') {
    return (
      <label className='block text-sm text-white/60'>
        {field.label} {field.required && <span className='text-red-300'>*</span>}
        <div className='mt-2 flex items-center gap-2'>
          <FileText className='h-5 w-5 text-white/50' />
          <input
            type='url'
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder='https://...'
            className='flex-1 rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40'
          />
        </div>
      </label>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className='flex items-start gap-3 text-sm text-white/70'>
        <input type='checkbox' checked={!!value} onChange={(e) => onChange(e.target.checked)} className='mt-1 h-4 w-4' />
        <span>{field.label} {field.required && <span className='text-red-300'>*</span>}</span>
      </label>
    );
  }

  return (
    <label className='block text-sm text-white/60'>
      {field.label} {field.required && <span className='text-red-300'>*</span>}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        className={inputClass}
      />
    </label>
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
