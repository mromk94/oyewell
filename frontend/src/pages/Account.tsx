import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMe, fetchMyOrders, removeCustomerToken, changePassword, type User, type OrderSummary } from '../lib/api';
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMe().catch(() => null), fetchMyOrders().catch(() => ({ orders: [] }))])
      .then(([me, ordersData]) => {
        if (!me) {
          navigate('/login');
          return;
        }
        setUser(me.user);
        setOrders(ordersData.orders);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load account'))
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleLogout() {
    removeCustomerToken();
    navigate('/');
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-900">
        <Loader2 className="h-10 w-10 animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-brand-900 px-6 text-center">
        <h1 className="text-4xl font-black text-white">Something went wrong</h1>
        <p className="mt-4 text-white/70">{error ?? 'Please sign in again.'}</p>
        <Link to="/login" className="mt-6 text-white underline">
          Sign in
        </Link>
      </div>
    );
  }

  const currentOrders = orders.filter((o) => o.status !== 'DELIVERED');
  const previousOrders = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <div className="min-h-screen bg-brand-900 px-6 py-12 md:px-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft className="h-5 w-5" /> Back to menu
          </Link>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 text-white/70 hover:text-white">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>

        <h1 className="text-4xl font-black text-white">
          Hi, {user.firstName || user.email}
        </h1>
        <p className="mt-2 text-white/60">{user.email}</p>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">Current Orders</h2>
          <OrderList orders={currentOrders} />
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">Order History</h2>
          <OrderList orders={previousOrders} />
        </div>

        <ChangePassword />
      </div>
    </div>
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
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white">Change password</h2>
      {msg && <p className="mt-4 text-sm text-white/80">{msg}</p>}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          required
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password"
          required
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
        />
        <button type="submit" className="w-full rounded-full bg-white py-3 font-bold text-black">
          Update password
        </button>
      </form>
    </div>
  );
}

function OrderList({ orders }: { orders: OrderSummary[] }) {
  if (orders.length === 0) {
    return <p className="mt-4 text-white/60">No orders yet.</p>;
  }
  return (
    <div className="mt-4 space-y-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          to={`/track/${order.orderNumber}`}
          className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-white">{order.orderNumber}</span>
            <span className="text-sm text-white/60">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="mt-1 text-sm text-white/60">
            {order.items.map((i) => `${i.foodName} × ${i.quantity}`).join(', ')}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-white/80">{order.status.replace(/_/g, ' ')}</span>
            <span className="font-semibold text-white">{order.total}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
