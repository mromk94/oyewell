import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Utensils,
  Truck,
  CreditCard,
  Settings,
  LogOut,
  Package,
  Salad,
  Users,
  Mail,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Logo from '../components/Logo';
import { formatPrice } from '../lib/api';
import { MenuTab as MenuTabNew } from '../components/admin/MenuTab';
import { SidesTab as SidesTabNew } from '../components/admin/SidesTab';
import { PaymentsTab as PaymentsTabNew } from '../components/admin/PaymentsTab';
import { OrdersTab as OrdersTabNew } from '../components/admin/OrdersTab';
import EmailTab from '../components/admin/EmailTab';
import {
  adminLogin,
  fetchDashboard,
  fetchAdminFoods,
  fetchAdminOrders,
  fetchDeliveryZones,
  createDeliveryZone,
  deleteDeliveryZone,
  fetchPaymentMethods,
  fetchSettings,
  updateSettings,
  fetchSides,
  fetchCustomers,
  fetchCustomerOrders,
} from '../lib/admin';

type Tab = 'dashboard' | 'menu' | 'orders' | 'sides' | 'customers' | 'delivery' | 'payments' | 'settings' | 'email';

export default function Admin() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [dashboard, setDashboard] = useState<any>(null);
  const [foods, setFoods] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [sides, setSides] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (!token) return;
    loadTab();
  }, [token, tab]);

  async function loadTab() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'dashboard') {
        setDashboard(await fetchDashboard());
      } else if (tab === 'menu') {
        const { foods } = await fetchAdminFoods();
        setFoods(foods);
      } else if (tab === 'orders') {
        const { orders } = await fetchAdminOrders();
        setOrders(orders);
      } else if (tab === 'delivery') {
        const { zones } = await fetchDeliveryZones();
        setZones(zones);
      } else if (tab === 'payments') {
        const { methods } = await fetchPaymentMethods();
        setMethods(methods);
      } else if (tab === 'sides') {
        const { sides } = await fetchSides();
        setSides(sides);
      } else if (tab === 'customers') {
        const { customers } = await fetchCustomers();
        setCustomers(customers);
      } else if (tab === 'settings') {
        const { settings } = await fetchSettings();
        setSettings(settings ?? {});
      } else if (tab === 'email') {
        // EmailTab loads its own data
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      if (e instanceof Error && e.message.includes('Unauthorized')) {
        setToken(null);
        localStorage.removeItem('admin_token');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError(null);
    try {
      await adminLogin(email, password);
      setToken(localStorage.getItem('admin_token'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-900 px-6">
        <Logo />
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="mt-2 text-white/60">Sign in to manage OYE Well.</p>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          <div className="mt-6 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-2xl border border-white/20 bg-white/5 p-4 text-white outline-none focus:border-white"
            />
            <button
              onClick={handleLogin}
              className="w-full rounded-full bg-white py-3 font-bold text-black"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-900 md:flex-row">
      <Logo />
      <aside className="shrink-0 border-b border-white/10 bg-brand-800 p-4 md:w-64 md:border-b-0 md:border-r">
        <h1 className="px-4 text-2xl font-black text-white">OYE Admin</h1>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2 md:mt-6 md:flex-col md:gap-0 md:space-y-1 md:overflow-visible">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'menu', label: 'Menu', icon: Utensils },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'sides', label: 'Sides', icon: Salad },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'delivery', label: 'Delivery', icon: Truck },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'email', label: 'Email', icon: Mail },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl p-3 text-sm font-medium transition md:w-full md:gap-3 md:px-4 md:py-3 md:text-left ${
                tab === id ? 'bg-white text-black' : 'text-white/70 hover:bg-white/5'
              }`}
              title={label}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            localStorage.removeItem('admin_token');
            setToken(null);
          }}
          className="mt-4 flex w-full shrink-0 items-center gap-2 rounded-2xl p-3 text-sm font-medium text-white/70 transition hover:bg-white/5 md:mt-8 md:gap-3 md:px-4 md:py-3"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" /> <span className="hidden md:inline">Sign out</span>
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        {loading && <p className="text-white/60">Loading...</p>}
        {error && <p className="text-red-300">{error}</p>}

        {tab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Dashboard overview</h2>
                <p className="text-white/60">Today's snapshot of orders, revenue and activity.</p>
              </div>
              <span className="text-sm text-white/50">{new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Active orders', value: dashboard.active, color: 'bg-blue-500/10 text-blue-300' },
                { label: 'New orders', value: dashboard.new, color: 'bg-yellow-500/10 text-yellow-300' },
                { label: 'Preparing', value: dashboard.preparing, color: 'bg-purple-500/10 text-purple-300' },
                { label: 'Out for delivery', value: dashboard.outForDelivery, color: 'bg-cyan-500/10 text-cyan-300' },
                { label: 'Completed', value: dashboard.completed, color: 'bg-emerald-500/10 text-emerald-300' },
                { label: 'Revenue', value: formatPrice(dashboard.revenueKobo ?? 0), color: 'bg-white/10 text-white' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border border-white/10 p-5 ${stat.color}`}
                >
                  <p className="text-sm opacity-80">{stat.label}</p>
                  <p className="mt-2 text-3xl font-black">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {dashboard.popularItems?.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <TrendingUp className="h-5 w-5 text-emerald-300" /> Popular items
                  </h3>
                  <div className="mt-4 space-y-3">
                    {dashboard.popularItems.map((item: any) => (
                      <div key={item.foodName} className="flex items-center justify-between text-white/90">
                        <span>{item.foodName}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-white">{item._count.id} orders</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dashboard.lowStockFoods?.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <AlertTriangle className="h-5 w-5 text-yellow-300" /> Low stock alerts
                  </h3>
                  <div className="mt-4 space-y-3">
                    {dashboard.lowStockFoods.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-white/90">
                        <span>{item.name}</span>
                        <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-bold text-red-300">No options</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'menu' && <MenuTabNew foods={foods} onRefresh={loadTab} />}
        {tab === 'orders' && <OrdersTabNew orders={orders} onRefresh={loadTab} />}
        {tab === 'delivery' && <DeliveryTab zones={zones} onRefresh={loadTab} />}
        {tab === 'sides' && <SidesTabNew sides={sides} onRefresh={loadTab} />}
        {tab === 'customers' && <CustomersTab customers={customers} />}
        {tab === 'payments' && <PaymentsTabNew methods={methods} onRefresh={loadTab} />}
        {tab === 'settings' && <SettingsTab settings={settings} onRefresh={loadTab} />}
        {tab === 'email' && <EmailTab />}
      </main>
    </div>
  );
}

function DeliveryTab({ zones, onRefresh }: { zones: any[]; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [est, setEst] = useState('');
  const [cities, setCities] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createDeliveryZone({
      name,
      type: 'CITY',
      boundary: { cities: cities.split(',').map((c) => c.trim()).filter(Boolean) },
      feeKobo: Number(fee) * 100,
      estimatedMinutes: Number(est) || null,
    });
    setName('');
    setFee('');
    setEst('');
    setCities('');
    onRefresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Delivery zones</h2>
      <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <input
          placeholder="Zone name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <input
          placeholder="Cities (comma separated)"
          value={cities}
          onChange={(e) => setCities(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <input
          placeholder="Fee in NGN"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <input
          placeholder="Estimated minutes"
          value={est}
          onChange={(e) => setEst(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <button type="submit" className="rounded-full bg-white px-6 py-2 font-bold text-black">
          Add zone
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div>
              <p className="font-bold text-white">{zone.name}</p>
              <p className="text-sm text-white/60">{zone.type}</p>
              <p className="text-sm text-white/60">Fee: {formatPrice(zone.feeKobo)}</p>
            </div>
            <button
              onClick={async () => {
                await deleteDeliveryZone(zone.id);
                onRefresh();
              }}
              className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersTab({ customers }: { customers: any[] }) {
  const [selected, setSelected] = useState<any | null>(null);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Customers</h2>
      <div className="mt-6 space-y-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">{customer.firstName} {customer.lastName}</p>
                <p className="text-sm text-white/60">{customer.email}</p>
                <p className="text-sm text-white/60">{customer.phone}</p>
                <p className="text-sm text-white/60">Orders: {customer._count?.orders ?? 0}</p>
              </div>
              <button
                onClick={async () => {
                  const { orders } = await fetchCustomerOrders(customer.id);
                  setSelected({ customer, orders });
                }}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
              >
                View orders
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-bold text-white">{selected.customer.email}'s orders</h3>
          <div className="mt-4 space-y-3">
            {selected.orders.length === 0 ? (
              <p className="text-white/60">No orders yet.</p>
            ) : (
              selected.orders.map((order: any) => (
                <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">{order.orderNumber}</span>
                    <span className="text-white/70">{formatPrice(order.totalKobo)}</span>
                  </div>
                  <p className="text-sm text-white/60">{order.status} · {order.paymentStatus}</p>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setSelected(null)}
            className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm text-white"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ settings, onRefresh }: { settings: any; onRefresh: () => void }) {
  const [name, setName] = useState(settings?.name ?? '');
  const [phone, setPhone] = useState(settings?.contactPhone ?? '');
  const [email, setEmail] = useState(settings?.contactEmail ?? '');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings({ name, contactPhone: phone, contactEmail: email });
    onRefresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Settings</h2>
      <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <input
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <input
          placeholder="Contact phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <input
          placeholder="Contact email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
        />
        <button type="submit" className="rounded-full bg-white px-6 py-2 font-bold text-black">
          Save settings
        </button>
      </form>
    </div>
  );
}
