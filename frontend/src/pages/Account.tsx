import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  fetchMe,
  fetchMyOrders,
  changePassword,
  updateProfile,
  fetchDeliveryApplication,
  type User,
  type OrderSummary,
  type DeliveryApplication,
} from '../lib/api';
import { useAuth, hasRole } from '../lib/auth';
import DeliveryApplicationModal from '../components/DeliveryApplicationModal';
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Mail,
  Phone,
  Package,
  CheckCircle,
  Clock,
  MapPin,
  Lock,
  Pencil,
  Check,
  Download,
  ChefHat,
  Bike,
  Shield,
  Plus,
  X,
} from 'lucide-react';
import Logo from '../components/Logo';

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-500/20 text-yellow-300',
  PAID: 'bg-blue-500/20 text-blue-300',
  CONFIRMED: 'bg-blue-500/20 text-blue-300',
  PREPARING: 'bg-purple-500/20 text-purple-300',
  READY_FOR_DISPATCH: 'bg-indigo-500/20 text-indigo-300',
  OUT_FOR_DELIVERY: 'bg-cyan-500/20 text-cyan-300',
  DELIVERED: 'bg-emerald-500/20 text-emerald-300',
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-300',
  PAID: 'bg-emerald-500/20 text-emerald-300',
  FAILED: 'bg-red-500/20 text-red-300',
};

export default function Account() {
  const { isAuthenticated, openAuth, logout, customer, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [deliveryApp, setDeliveryApp] = useState<DeliveryApplication | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showCookPrompt, setShowCookPrompt] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      openAuth();
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [me, myOrders, app] = await Promise.all([fetchMe(), fetchMyOrders(), fetchDeliveryApplication()]);
      setUser(me.user);
      setOrders(myOrders.orders);
      setDeliveryApp(app.rider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
  }

  if (authLoading || loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-brand-900'>
        <Loader2 className='h-10 w-10 animate-spin text-white/70' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center bg-brand-900 px-6 text-center'>
        <Logo />
        <h1 className='mt-8 text-3xl font-black text-white'>Sign in to your account</h1>
        <p className='mt-3 max-w-md text-white/70'>
          Your order history, saved address and account details live here. Sign in or create an account to get started.
        </p>
        <button
          onClick={() => openAuth()}
          className='mt-6 rounded-full bg-white px-8 py-3 font-bold text-black'
        >
          Sign in or register
        </button>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className='flex h-screen w-full flex-col items-center justify-center bg-brand-900 px-6 text-center'>
        <h1 className='text-4xl font-black text-white'>Something went wrong</h1>
        <p className='mt-4 text-white/70'>{error ?? 'Please sign in again.'}</p>
        <button onClick={() => openAuth()} className='mt-6 text-white underline'>
          Sign in
        </button>
      </div>
    );
  }

  const currentOrders = orders.filter((o) => o.status !== 'DELIVERED');
  const previousOrders = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <div className='min-h-screen bg-brand-900 px-6 py-12 md:px-12'>
      <Logo />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className='mx-auto max-w-3xl'
      >
        <div className='mb-8 flex items-center justify-between'>
          <Link to='/' className='inline-flex items-center gap-2 text-white/70 hover:text-white'>
            <ArrowLeft className='h-5 w-5' /> Back to menu
          </Link>
          <button
            onClick={handleLogout}
            className='inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-white/70 transition hover:bg-white/10 hover:text-white'
          >
            <LogOut className='h-4 w-4' /> Sign out
          </button>
        </div>

        <div className='rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
          <div className='flex flex-wrap items-center gap-3'>
            <h1 className='text-3xl font-black text-white'>
              Hi, {user.firstName || user.email.split('@')[0] || 'customer'}
            </h1>
            <span className='rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white/70'>
              Customer
            </span>
            <ProfileEditor user={user} onUpdate={setUser} />
          </div>
          <p className='mt-2 text-white/60'>
            This is your home for orders, delivery history and account settings.
          </p>

          <div className='mt-4 flex flex-wrap gap-3'>
            <button
              onClick={() => (window as unknown as { __openPwaInstallPrompt?: (force?: boolean) => boolean }).__openPwaInstallPrompt?.(true)}
              className='inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400'
            >
              <Download className='h-4 w-4' /> Install app
            </button>
            <button
              onClick={() => setShowCookPrompt(true)}
              className='inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20'
            >
              <ChefHat className='h-4 w-4' /> {hasRole(customer, 'COOK') ? 'Cook portal' : 'Become a cook'}
            </button>
            {deliveryApp ? (
              <span className='inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white/70'>
                <Bike className='h-4 w-4' />
                {deliveryApp.isApproved ? 'Delivery partner' : 'Application: ' + deliveryApp.neighborhoodApproval.toLowerCase()}
              </span>
            ) : (
              <button
                onClick={() => setShowApply(true)}
                className='inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20'
              >
                <Bike className='h-4 w-4' /> {hasRole(customer, 'RIDER') ? 'Delivery portal' : 'Make money with OyeWell'}
              </button>
            )}
            {hasRole(customer, 'ADMIN') && (
              <Link
                to='/admin'
                className='inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20'
              >
                <Shield className='h-4 w-4' /> Admin
              </Link>
            )}
          </div>

          <div className='mt-6 grid gap-4 sm:grid-cols-3'>
            <ProfileRow icon={<Mail className='h-4 w-4' />} label='Email' value={user.email} />
            <ProfileRow icon={<Phone className='h-4 w-4' />} label='Phone' value={user.phone ?? 'Not set'} />
            <ProfileRow
              icon={<Package className='h-4 w-4' />}
              label='Total orders'
              value={orders.length.toString()}
            />
          </div>
        </div>

        <StatsRow current={currentOrders.length} previous={previousOrders.length} />

        <OrderSection title='Active orders' explanation='Orders that are being prepared or on their way to you.' icon={<Clock className='h-5 w-5' />} orders={currentOrders} />
        <OrderSection title='Order history' explanation='Completed and delivered orders you can look back on.' icon={<CheckCircle className='h-5 w-5' />} orders={previousOrders} />

        <ChangePassword />

        {showApply && user && (
          <DeliveryApplicationModal
            firstName={user.firstName}
            lastName={user.lastName}
            phone={user.phone}
            onClose={() => setShowApply(false)}
            onSubmitted={() => {
              setShowApply(false);
              load();
            }}
          />
        )}

        {showCookPrompt &&
          createPortal(
            <div
              className='fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4'
              onClick={() => setShowCookPrompt(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className='w-full max-w-md rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:rounded-3xl'
              >
                <div className='flex items-center justify-between'>
                  <h2 className='text-xl font-black text-white'>Post your food</h2>
                  <button
                    onClick={() => setShowCookPrompt(false)}
                    className='rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white'
                    aria-label='Close'
                  >
                    <X className='h-5 w-5' />
                  </button>
                </div>
                <p className='mt-4 text-white/70'>
                  This is where home cooks share dishes with people nearby. You can set your own price,
                  choose when you are cooking, and customers can order straight from your listing.
                </p>
                <p className='mt-3 text-white/70'>
                  To keep quality and safety in check, every cook goes through a quick application before they can start posting.
                </p>
                <div className='mt-6 flex flex-col gap-3'>
                  {hasRole(customer, 'COOK') ? (
                    <button
                      onClick={() => { setShowCookPrompt(false); navigate('/cook?tab=add'); }}
                      className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400'
                    >
                      <Plus className='h-4 w-4' /> Post a new dish
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowCookPrompt(false); navigate('/cook'); }}
                      className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-black transition hover:bg-emerald-400'
                    >
                      <ChefHat className='h-4 w-4' /> Apply to become a cook
                    </button>
                  )}
                  <button
                    onClick={() => setShowCookPrompt(false)}
                    className='rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10'
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </motion.div>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
      <div className='flex items-center gap-2 text-sm text-white/50'>
        {icon} <span>{label}</span>
      </div>
      <p className='mt-1 break-words text-sm font-medium text-white'>{value}</p>
    </div>
  );
}

function StatsRow({ current, previous }: { current: number; previous: number }) {
  return (
    <div className='mt-6 grid grid-cols-3 gap-4'>
      {[
        { label: 'Active', count: current, color: 'bg-yellow-500/10 text-yellow-300' },
        { label: 'Delivered', count: previous, color: 'bg-emerald-500/10 text-emerald-300' },
        { label: 'All time', count: current + previous, color: 'bg-blue-500/10 text-blue-300' },
      ].map((s) => (
        <div
          key={s.label}
          className={`rounded-3xl border border-white/10 p-5 text-center ${s.color}`}
        >
          <p className='text-3xl font-black'>{s.count}</p>
          <p className='mt-1 text-xs font-bold uppercase tracking-wider opacity-80'>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function OrderSection({
  title,
  explanation,
  icon,
  orders,
}: {
  title: string;
  explanation: string;
  icon: React.ReactNode;
  orders: OrderSummary[];
}) {
  return (
    <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
      <div className='flex items-center gap-2'>
        {icon}
        <h2 className='text-xl font-bold text-white'>{title}</h2>
      </div>
      <p className='mt-1 text-sm text-white/60'>{explanation}</p>
      <OrderList orders={orders} />
    </div>
  );
}

function OrderList({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return <p className='mt-4 text-white/60'>No orders in this section yet.</p>;
  }
  return (
    <div className='mt-5 space-y-4'>
      {orders.map((order, i) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link
            to={`/track/${order.orderNumber}`}
            className='block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10'
          >
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='flex items-center gap-2'>
                  <Package className='h-4 w-4 text-white/60' />
                  <span className='font-bold text-white'>{order.orderNumber}</span>
                </div>
                <p className='mt-1 text-xs text-white/50'>
                  {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[order.status] ?? 'bg-white/10 text-white/70'}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${PAYMENT_COLORS[order.paymentStatus] ?? 'bg-white/10 text-white/70'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            <div className='mt-4 space-y-1 text-sm text-white/70'>
              {order.items.map((item, idx) => (
                <p key={idx}>
                  {item.quantity}× {item.foodName} — {item.optionLabel}
                </p>
              ))}
              {order.sides.length > 0 && (
                <p className='text-white/50'>
                  + {order.sides.map((s) => `${s.quantity}× ${s.name}`).join(', ')}
                </p>
              )}
            </div>

            <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4'>
              <div className='flex items-center gap-2 text-sm text-white/60'>
                <MapPin className='h-4 w-4' />
                <span className='truncate'>{order.address}</span>
              </div>
              <span className='text-lg font-bold text-white'>{order.total}</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function ProfileEditor({ user, onUpdate }: { user: User; onUpdate: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { user: updated } = await updateProfile({ firstName, lastName, phone });
      onUpdate(updated);
      setEditing(false);
      setMsg('Profile updated.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-white/20'
      >
        <Pencil className='h-3.5 w-3.5' /> Rename
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className='mt-4 grid w-full gap-3 sm:grid-cols-3'>
      <input
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder='First name'
        className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
      />
      <input
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder='Last name'
        className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder='Phone number'
        className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white'
      />
      <div className='sm:col-span-3'>
        {msg && <p className='mb-2 text-sm text-white/80'>{msg}</p>}
        <button
          disabled={saving}
          type='submit'
          className='inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 font-bold text-black disabled:opacity-50'
        >
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check className='h-4 w-4' />} Save
        </button>
      </div>
    </form>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await changePassword(current, next);
      setMsg('Password updated successfully.');
      setCurrent('');
      setNext('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to update password');
    }
  }

  return (
    <div className='mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8'>
      <div className='flex items-center gap-2'>
        <Lock className='h-5 w-5 text-white/70' />
        <h2 className='text-xl font-bold text-white'>Change password</h2>
      </div>
      {msg && <p className='mt-4 text-sm text-white/80'>{msg}</p>}
      <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
        <input
          type='password'
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder='Current password'
          required
          className='w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <input
          type='password'
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder='New password'
          required
          minLength={6}
          className='w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white'
        />
        <button type='submit' className='w-full rounded-full bg-white py-3 font-bold text-black'>
          Update password
        </button>
      </form>
    </div>
  );
}
