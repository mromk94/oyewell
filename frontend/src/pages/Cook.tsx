import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat,
  Plus,
  Utensils,
  ClipboardList,
  Banknote,
  User,
  LogOut,
  Loader2,
  AlertCircle,
  Star,
  Upload,
  X,
  CheckCircle,
  ArrowLeft,
  Wallet,
} from 'lucide-react';
import { useAuth, hasRole } from '../lib/auth';
import { formatPrice } from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  type CookProfile,
  type CookListing,
  type CookOrder,
  type CookMediaInput,
  applyAsCook,
  fetchCookMe,
  updateCookMe,
  updateCookListing,
  deleteCookListing,
  setKitchenStatus,
  createCookListing,
  fetchCookListings,
  fetchCookOrders,
  acceptCookOrder,
  preparingCookOrder,
  readyCookOrder,
  fetchCookEarnings,
} from '../lib/cook';

const TABS = ['dashboard', 'add', 'menu', 'orders', 'earnings', 'profile'] as const;

export default function Cook() {
  const { customer, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = TABS.includes(searchParams.get('tab') as any) ? (searchParams.get('tab') as typeof TABS[number]) : 'dashboard';
  const [cook, setCook] = useState<CookProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>(initialTab);
  const [editing, setEditing] = useState<CookListing | null>(null);

  useEffect(() => {
    if (!customer || !hasRole(customer, 'COOK')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchCookMe()
      .then((res) => setCook(res.cook))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [customer]);

  if (authLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-brand-900'>
        <Loader2 className='h-10 w-10 animate-spin text-white/70' />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center bg-brand-900 p-6 text-center text-white'>
        <ChefHat className='mb-4 h-12 w-12 text-emerald-400' />
        <h1 className='text-3xl font-black'>Cook Portal</h1>
        <p className='mt-2 text-white/70'>Sign in to become an OyeWell Cook.</p>
        <button
          onClick={() => navigate('/login')}
          className='mt-6 rounded-full bg-emerald-500 px-8 py-3 font-bold text-black hover:bg-emerald-400'
        >
          Sign in
        </button>
      </div>
    );
  }

  if (!hasRole(customer, 'COOK')) {
    return <CookApply />;
  }

  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-brand-900'>
        <Loader2 className='h-10 w-10 animate-spin text-white/70' />
      </div>
    );
  }

  if (error || !cook) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-brand-900 p-6 text-center text-white'>
        <AlertCircle className='mb-2 h-10 w-10 text-red-300' />
        <p>{error ?? 'Cook profile not found'}</p>
      </div>
    );
  }

  const isEnforced = ['SUSPENDED', 'ADMIN_DISABLED', 'PENDING_APPROVAL'].includes(cook.kitchenStatus);

  return (
    <div className='min-h-screen bg-brand-900 text-white'>
      <header className='sticky top-0 z-30 border-b border-white/10 bg-brand-900/95 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-4xl items-center justify-between px-4 py-4'>
          <div className='flex items-center gap-2'>
            <ChefHat className='h-6 w-6 text-emerald-400' />
            <h1 className='text-lg font-black'>Cook Portal</h1>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className='inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white'
          >
            <LogOut className='h-4 w-4' /> Sign out
          </button>
        </div>
      </header>

      <main className='mx-auto max-w-4xl p-4'>
        <div className='mb-6 rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-sm text-white/60'>Your kitchen</p>
          <p className='text-xl font-black'>{cook.displayName}</p>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300'>
              <Wallet className='h-3 w-3' /> {formatPrice(cook.user?.balanceKobo ?? 0)}
            </span>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300'>
              <Star className='h-3 w-3' /> {cook.rating.toFixed(1)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                cook.kitchenStatus === 'OPEN' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'
              }`}
            >
              {cook.kitchenStatus === 'OPEN' ? 'Open' : 'Paused'}
            </span>
            {cook.profileStatus !== 'APPROVED' && (
              <span className='rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-300'>
                {cook.profileStatus.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {!isEnforced && cook.profileStatus === 'APPROVED' && (
            <button
              onClick={async () => {
                try {
                  const target = cook.kitchenStatus === 'OPEN' ? 'PAUSED' : 'OPEN';
                  const res = await setKitchenStatus(target);
                  if (res.cook) setCook(res.cook);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Update failed');
                }
              }}
              className='mt-3 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400'
            >
              {cook.kitchenStatus === 'OPEN' ? 'Pause kitchen' : 'Open kitchen'}
            </button>
          )}
        </div>

        {error && (
          <div className='mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200'>
            <AlertCircle className='mb-1 h-4 w-4' /> {error}
          </div>
        )}

        <nav className='mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6'>
          {[
            { id: 'dashboard', label: 'Home', icon: ChefHat },
            { id: 'add', label: 'Add Food', icon: Plus },
            { id: 'menu', label: 'My Food', icon: Utensils },
            { id: 'orders', label: 'Orders', icon: ClipboardList },
            { id: 'earnings', label: 'Earnings', icon: Banknote },
            { id: 'profile', label: 'Profile', icon: User },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-xs font-bold transition ${
                tab === t.id ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <t.icon className='h-5 w-5' />
              {t.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode='wait'>
          {tab === 'dashboard' && <DashboardPanel key='dashboard' cook={cook} />}
          {tab === 'add' && (
            <AddFoodPanel
              key={editing ? 'edit' : 'add'}
              editing={editing}
              onCreated={() => { setEditing(null); setTab('menu'); }}
              onUpdated={() => { setEditing(null); setTab('menu'); }}
              onError={setError}
            />
          )}
          {tab === 'menu' && <MenuPanel key='menu' onError={setError} onEdit={(l) => { setEditing(l); setTab('add'); }} />}
          {tab === 'orders' && <OrdersPanel key='orders' onError={setError} />}
          {tab === 'earnings' && <EarningsPanel key='earnings' onError={setError} />}
          {tab === 'profile' && <ProfilePanel key='profile' cook={cook} onUpdate={setCook} onError={setError} />}
        </AnimatePresence>
      </main>
    </div>
  );
}

function CookApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    cuisineSpecialty: '',
    serviceRadiusKm: '5',
    profilePhoto: '',
    categories: '',
    signatureDishes: '',
    capacity: '',
    prepTime: '',
    packagingPhotos: '',
    neighborhood: '',
    latitude: '',
    longitude: '',
    safety: {
      hygiene: false,
      allergens: false,
      temperature: false,
      labeling: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const packagingPhotos = form.packagingPhotos.split('\n').map((u) => u.trim()).filter(Boolean);
      const safetyAcknowledgements = Object.entries(form.safety)
        .filter(([, v]) => v)
        .map(([k]) => k);
      await applyAsCook({
        displayName: form.displayName,
        bio: form.bio,
        cuisineSpecialty: form.cuisineSpecialty,
        serviceRadiusKm: Number(form.serviceRadiusKm) || 5,
        profilePhoto: form.profilePhoto,
        categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
        signatureDishes: form.signatureDishes.split(',').map((c) => c.trim()).filter(Boolean),
        capacity: form.capacity,
        prepTime: form.prepTime,
        neighborhood: form.neighborhood || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        packagingPhotos,
        safetyAcknowledgements,
      });
      setShowSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Application failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='flex min-h-screen w-full flex-col items-center justify-center bg-brand-900 p-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6'
      >
        <ChefHat className='mb-2 h-10 w-10 text-emerald-400' />
        <h1 className='text-2xl font-black'>Become an OyeWell Cook</h1>
        <p className='mt-2 text-sm text-white/60'>Apply to cook and sell food in your neighborhood.</p>
        {error && <p className='mt-4 text-sm text-red-300'>{error}</p>}
        <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
          {step === 1 ? (
            <div className='space-y-4'>
              <input
                placeholder='Kitchen / display name'
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
                required
              />
              <input
                placeholder='What you cook (cuisine)'
                value={form.cuisineSpecialty}
                onChange={(e) => setForm({ ...form, cuisineSpecialty: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                type='number'
                placeholder='Delivery radius (km)'
                value={form.serviceRadiusKm}
                onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                placeholder='Profile photo URL'
                value={form.profilePhoto}
                onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                placeholder='Categories (comma separated)'
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                placeholder='Signature dishes (comma separated)'
                value={form.signatureDishes}
                onChange={(e) => setForm({ ...form, signatureDishes: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                placeholder='Capacity (e.g. 20 meals/day)'
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                placeholder='Average prep time'
                value={form.prepTime}
                onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
              />
              <input
                placeholder='Neighborhood (e.g. Yaba, Ikeja GRA)'
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
                required
              />
              <div className='flex gap-2'>
                <input
                  type='number'
                  step='any'
                  placeholder='Latitude'
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
                />
                <input
                  type='number'
                  step='any'
                  placeholder='Longitude'
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
                />
              </div>
              <button
                type='button'
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setForm({ ...form, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }),
                    () => setError('Could not get location')
                  );
                }}
                className='w-full rounded-full border border-white/20 bg-white/5 py-3 font-bold text-white transition hover:bg-white/10'
              >
                Use my location
              </button>
              <textarea
                placeholder='Tell customers about your kitchen'
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
                rows={3}
              />
              <button
                type='button'
                onClick={() => setStep(2)}
                className='w-full rounded-full bg-white/10 py-3 font-bold text-white transition hover:bg-white/20'
              >
                Continue
              </button>
            </div>
          ) : (
            <div className='space-y-4'>
              <p className='text-sm text-white/60'>Packaging & safety</p>
              <textarea
                placeholder='Packaging photo URLs (one per line)'
                value={form.packagingPhotos}
                onChange={(e) => setForm({ ...form, packagingPhotos: e.target.value })}
                className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
                rows={4}
              />
              {Object.entries(form.safety).map(([key, checked]) => (
                <label key={key} className='flex items-center gap-2 text-sm text-white/80'>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        safety: { ...form.safety, [key]: e.target.checked },
                      })
                    }
                    className='h-4 w-4 rounded border-white/30'
                  />
                  {key === 'hygiene' && 'I follow good food hygiene practices'}
                  {key === 'allergens' && 'I handle allergens safely and label them'}
                  {key === 'temperature' && 'I keep hot and cold foods at safe temperatures'}
                  {key === 'labeling' && 'I label packages with contents and date'}
                </label>
              ))}
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={() => setStep(1)}
                  className='flex-1 rounded-full bg-white/10 py-3 font-bold text-white transition hover:bg-white/20'
                >
                  Back
                </button>
                <button
                  type='submit'
                  disabled={loading}
                  className='flex-1 rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
                >
                  {loading ? <Loader2 className='mx-auto h-5 w-5 animate-spin' /> : 'Submit application'}
                </button>
              </div>
            </div>
          )}
        </form>
      </motion.div>
      {showSuccess &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4'
            onClick={() => setShowSuccess(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-md rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:rounded-3xl'
            >
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-black text-white'>Application received</h2>
                <button
                  onClick={() => setShowSuccess(false)}
                  className='rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
                  aria-label='Close'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
              <div className='mt-6 flex flex-col items-center text-center'>
                <CheckCircle className='h-16 w-16 text-emerald-400' />
                <p className='mt-4 text-white/70'>
                  Your cook application has been submitted and is under review. We'll notify you once your kitchen is approved.
                </p>
              </div>
              <button
                onClick={() => { setShowSuccess(false); navigate('/account'); }}
                className='mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400'
              >
                <ArrowLeft className='h-4 w-4' /> Back to profile
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function DashboardPanel({ cook }: { cook: CookProfile }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
        <p className='text-sm text-white/60'>Status</p>
        <p className='text-2xl font-black'>{cook.kitchenStatus.replace(/_/g, ' ')}</p>
        <p className='text-sm text-white/50'>{cook.profileStatus.replace(/_/g, ' ')}</p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-sm text-white/60'>Rating</p>
          <div className='mt-1 flex items-center gap-2 text-2xl font-black'>
            <Star className='h-6 w-6 text-emerald-400' />
            {cook.rating.toFixed(1)}
          </div>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-sm text-white/60'>Total orders</p>
          <p className='text-2xl font-black'>{cook.totalOrders}</p>
        </div>
      </div>
    </motion.div>
  );
}

function AddFoodPanel({
  editing,
  onCreated,
  onUpdated,
  onError,
}: {
  editing?: CookListing | null;
  onCreated?: () => void;
  onUpdated?: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    portionDescription: '',
    prepTime: '',
    quantity: '',
    ingredients: '',
    allergens: '',
    cuisine: '',
  });
  const [media, setMedia] = useState<CookMediaInput[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editing) {
      setForm({
        title: '',
        description: '',
        price: '',
        portionDescription: '',
        prepTime: '',
        quantity: '',
        ingredients: '',
        allergens: '',
        cuisine: '',
      });
      setMedia([]);
      return;
    }
    setForm({
      title: editing.title,
      description: editing.description ?? '',
      price: (editing.priceKobo / 100).toFixed(2),
      portionDescription: editing.portionDescription ?? '',
      prepTime: editing.prepTimeMinutesMax ? String(editing.prepTimeMinutesMax) : '',
      quantity: String(editing.quantity ?? editing.stock ?? ''),
      ingredients: editing.ingredients ?? '',
      allergens: editing.allergens ?? '',
      cuisine: editing.cuisine ?? '',
    });
    setMedia(editing.media.map((m) => ({ type: m.type, url: m.url, thumbnailUrl: m.thumbnailUrl ?? null })));
  }, [editing]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      const uploaded: CookMediaInput[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 2_500_000) throw new Error(`${file.name} is too large. Use a smaller file or a web URL.`);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        uploaded.push({ type, url: dataUrl, thumbnailUrl: null });
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function addUrlMedia() {
    const url = newMediaUrl.trim();
    if (!url) return;
    setMedia((prev) => [...prev, { type: newMediaType, url, thumbnailUrl: null }]);
    setNewMediaUrl('');
  }

  function removeMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const priceKobo = Math.round(Number(form.price) * 100);
      if (Number.isNaN(priceKobo) || priceKobo <= 0) throw new Error('Price is required');
      const payload = {
        title: form.title,
        description: form.description,
        priceKobo,
        portionDescription: form.portionDescription,
        prepTimeMinutesMax: Number(form.prepTime) || undefined,
        quantity: Number(form.quantity) || 0,
        stock: Number(form.quantity) || 0,
        ingredients: form.ingredients,
        allergens: form.allergens,
        cuisine: form.cuisine,
        media,
      };
      if (editing) {
        const shouldResubmit = !['APPROVED', 'PAUSED'].includes(editing.status);
        await updateCookListing(editing.id, { ...payload, resubmit: shouldResubmit });
        onUpdated?.();
      } else {
        await createCookListing(payload);
        onCreated?.();
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
      <h2 className='text-xl font-bold'>{editing ? 'Edit food' : 'Add a new food'}</h2>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <input
          placeholder='Food name'
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          required
        />
        <input
          type='number'
          step='0.01'
          placeholder='Price (NGN)'
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          required
        />
        <input
          placeholder='Portion (e.g., 1 plate)'
          value={form.portionDescription}
          onChange={(e) => setForm({ ...form, portionDescription: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          type='number'
          placeholder='Preparation time (minutes)'
          value={form.prepTime}
          onChange={(e) => setForm({ ...form, prepTime: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          type='number'
          placeholder='How many can you make?'
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          placeholder='Cuisine (e.g., Nigerian)'
          value={form.cuisine}
          onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          placeholder='Main ingredients'
          value={form.ingredients}
          onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          placeholder='Allergens'
          value={form.allergens}
          onChange={(e) => setForm({ ...form, allergens: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <textarea
          placeholder='Description'
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          rows={3}
        />

        <div className='rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4'>
          <p className='text-sm text-white/60'>Food photos or videos</p>

          {media.length > 0 && (
            <div className='grid max-h-64 min-w-0 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3'>
              {media.map((m, i) => (
                <div key={i} className='relative aspect-square min-w-0 overflow-hidden rounded-xl'>
                  {m.type === 'VIDEO' ? (
                    <video src={m.url} className='h-full w-full object-cover' muted playsInline />
                  ) : (
                    <img src={m.url} alt='' className='h-full w-full object-cover' />
                  )}
                  <button
                    type='button'
                    onClick={() => removeMedia(i)}
                    className='absolute right-1 top-1 rounded-full bg-black/60 p-1 text-xs text-white hover:bg-red-500/80'
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className='flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-white/70 hover:bg-white/10'>
            <Upload className='h-6 w-6' />
            <span className='mt-2 text-sm'>Tap to upload photos or videos</span>
            <input
              type='file'
              accept='image/*,video/*'
              multiple
              onChange={handleFileChange}
              className='hidden'
              disabled={uploading}
            />
          </label>

          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <input
              placeholder='Or paste a media URL'
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              className='min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-white'
            />
            <select
              value={newMediaType}
              onChange={(e) => setNewMediaType(e.target.value as 'IMAGE' | 'VIDEO')}
              className='w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-white sm:w-auto'
            >
              <option value='IMAGE' className='bg-brand-900'>Photo</option>
              <option value='VIDEO' className='bg-brand-900'>Video</option>
            </select>
            <button
              type='button'
              onClick={addUrlMedia}
              className='w-full rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 sm:w-auto'
            >
              Add
            </button>
          </div>

          {uploading && (
            <div className='flex items-center gap-2 text-emerald-300'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='animate-pulse text-sm font-semibold'>Uploading your media…</span>
            </div>
          )}
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
        >
          {loading ? <Loader2 className='mx-auto h-5 w-5 animate-spin' /> : editing ? 'Save changes' : 'Add food'}
        </button>
      </form>
    </motion.div>
  );
}

function MenuPanel({ onError, onEdit }: { onError: (msg: string) => void; onEdit: (l: CookListing) => void }) {
  const [listings, setListings] = useState<CookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCookListings()
      .then((res) => setListings(res.listings))
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleStatus(id: string, status: string) {
    try {
      await updateCookListing(id, { status });
      const res = await fetchCookListings();
      setListings(res.listings);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function doDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await deleteCookListing(id);
      const res = await fetchCookListings();
      setListings(res.listings);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) return <Loader2 className='mx-auto h-8 w-8 animate-spin text-white/70' />;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
        {listings.length === 0 && <p className='text-white/60'>No listings yet. Add your first food.</p>}
      {listings.map((l) => (
        <div key={l.id} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='font-bold'>{l.title}</p>
              <p className='text-sm text-white/60'>{formatPrice(l.priceKobo)}</p>
              <p className='mt-1 flex items-center gap-2'>
                <StatusBadge status={l.status} />
                <span className='text-xs text-white/50'>{l.stock} left</span>
              </p>
            </div>
            <div className='flex flex-wrap justify-end gap-2'>
              <button
                onClick={() => onEdit(l)}
                className='rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10'
              >
                Edit
              </button>
              {l.status === 'APPROVED' && (
                <button
                  onClick={() => toggleStatus(l.id, 'PAUSED')}
                  className='rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20'
                >
                  Pause
                </button>
              )}
              {l.status === 'PAUSED' && (
                <button
                  onClick={() => toggleStatus(l.id, 'APPROVED')}
                  className='rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400'
                >
                  Resume
                </button>
              )}
              <button
                onClick={() => setDeleteId(l.id)}
                className='rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/30'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
      </motion.div>
      <ConfirmModal
        open={!!deleteId}
        title='Delete this food?'
        message='This will permanently remove the listing. Customers will no longer be able to order it.'
        confirmLabel='Yes, delete'
        cancelLabel='Keep it'
        danger
        onConfirm={doDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: 'bg-emerald-500/20 text-emerald-300',
    PENDING_REVIEW: 'bg-yellow-500/20 text-yellow-300',
    DRAFT: 'bg-blue-500/20 text-blue-300',
    PAUSED: 'bg-red-500/20 text-red-300',
    REJECTED: 'bg-red-500/30 text-red-300',
    SOLD_OUT: 'bg-orange-500/20 text-orange-300',
    ARCHIVED: 'bg-white/10 text-white/50',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles[status] ?? 'bg-white/10 text-white/70'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function OrdersPanel({ onError }: { onError: (msg: string) => void }) {
  const [orders, setOrders] = useState<CookOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ orderNumber: string; type: 'accept' | 'preparing' | 'ready' } | null>(null);

  useEffect(() => {
    fetchCookOrders()
      .then((res) => setOrders(res.orders))
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function action(orderNumber: string, type: 'accept' | 'preparing' | 'ready') {
    setPending({ orderNumber, type });
    try {
      if (type === 'accept') await acceptCookOrder(orderNumber);
      if (type === 'preparing') await preparingCookOrder(orderNumber);
      if (type === 'ready') await readyCookOrder(orderNumber);
      const res = await fetchCookOrders();
      setOrders(res.orders);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setPending(null);
    }
  }

  if (loading) return <Loader2 className='mx-auto h-8 w-8 animate-spin text-white/70' />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
      {orders.length === 0 && <p className='text-white/60'>No orders yet.</p>}
      {orders.map((o) => (
        <div key={o.id} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <div className='flex items-center justify-between'>
            <p className='font-bold'>{o.orderNumber}</p>
            <span className='text-xs text-white/60'>{o.status.replace(/_/g, ' ')}</span>
          </div>
          <p className='text-sm text-white/70'>{o.items.map((i) => `${i.foodName} x${i.quantity}`).join(', ')}</p>
          <p className='text-sm text-emerald-300'>{o.total}</p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {o.paymentStatus === 'PAID' && o.status === 'CONFIRMED' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => action(o.orderNumber, 'accept')}
                disabled={pending?.orderNumber === o.orderNumber}
                className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
              >
                {pending?.orderNumber === o.orderNumber && pending?.type === 'accept' && <Loader2 className='h-3 w-3 animate-spin' />}
                Accept
              </motion.button>
            )}
            {!['OUT_FOR_DELIVERY', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(o.status) && o.pickupCode && (
              <div className='w-full rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-center'>
                <p className='text-xs text-yellow-200'>Give this pickup code to the rider</p>
                <p className='text-2xl font-black tracking-widest text-yellow-300'>{o.pickupCode}</p>
              </div>
            )}
            {o.status === 'COOK_ACCEPTED' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => action(o.orderNumber, 'preparing')}
                disabled={pending?.orderNumber === o.orderNumber}
                className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
              >
                {pending?.orderNumber === o.orderNumber && pending?.type === 'preparing' && <Loader2 className='h-3 w-3 animate-spin' />}
                Start cooking
              </motion.button>
            )}
            {o.status === 'PREPARING' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => action(o.orderNumber, 'ready')}
                disabled={pending?.orderNumber === o.orderNumber}
                className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
              >
                {pending?.orderNumber === o.orderNumber && pending?.type === 'ready' && <Loader2 className='h-3 w-3 animate-spin' />}
                Food is ready
              </motion.button>
            )}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function EarningsPanel({ onError }: { onError: (msg: string) => void }) {
  const [summary, setSummary] = useState<{ totalKobo: number; settledKobo: number } | null>(null);

  useEffect(() => {
    fetchCookEarnings().then(setSummary).catch((e) => onError(e.message));
  }, []);

  if (!summary) return <Loader2 className='mx-auto h-8 w-8 animate-spin text-white/70' />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
      <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
        <p className='text-sm text-white/60'>Total earnings</p>
        <p className='text-2xl font-black'>{formatPrice(summary.totalKobo)}</p>
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
        <p className='text-sm text-white/60'>Settled</p>
        <p className='text-2xl font-black'>{formatPrice(summary.settledKobo)}</p>
      </div>
    </motion.div>
  );
}

function ProfilePanel({
  cook,
  onUpdate,
  onError,
}: {
  cook: CookProfile;
  onUpdate: (c: CookProfile) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({ ...cook });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateCookMe({
        displayName: form.displayName,
        bio: form.bio,
        cuisineSpecialty: form.cuisineSpecialty,
        serviceRadiusKm: form.serviceRadiusKm,
        profilePhoto: form.profilePhoto,
      });
      if (res.cook) onUpdate(res.cook);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='space-y-4'>
      <form onSubmit={handleSave} className='space-y-4'>
        <input
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          value={form.cuisineSpecialty ?? ''}
          onChange={(e) => setForm({ ...form, cuisineSpecialty: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          placeholder='Cuisine specialty'
        />
        <input
          type='number'
          value={form.serviceRadiusKm}
          onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          placeholder='Delivery radius (km)'
        />
        <input
          value={form.profilePhoto ?? ''}
          onChange={(e) => setForm({ ...form, profilePhoto: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          placeholder='Profile photo URL'
        />
        <textarea
          value={form.bio ?? ''}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className='w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-white'
          rows={3}
          placeholder='Bio'
        />
        <button
          type='submit'
          disabled={saving}
          className='w-full rounded-full bg-emerald-500 py-3 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50'
        >
          {saving ? <Loader2 className='mx-auto h-5 w-5 animate-spin' /> : 'Save profile'}
        </button>
      </form>
    </motion.div>
  );
}
