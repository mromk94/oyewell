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
  Bike,
  ChefHat,
  Map,
} from 'lucide-react';
import Logo from '../components/Logo';
import { MapView } from '../components/MapView';
import { formatPrice } from '../lib/api';
import { MenuTab as MenuTabNew } from '../components/admin/MenuTab';
import { SidesTab as SidesTabNew } from '../components/admin/SidesTab';
import { PaymentsTab as PaymentsTabNew } from '../components/admin/PaymentsTab';
import { OrdersTab as OrdersTabNew } from '../components/admin/OrdersTab';
import EmailTab from '../components/admin/EmailTab';
import ManagementDashboard from '../components/admin/ManagementDashboard';
import ModerationPanel from '../components/admin/ModerationPanel';
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
  updateCustomerRole,
  fetchRiders,
  fetchRiderLocations,
  fetchCookLocations,
  approveRider,
  pauseRider,
  suspendRider,
  banRider,
  restoreRider,
  fetchAdminCooks,
  approveCook,
  rejectCook,
  fetchAdminCookListings,
  approveCookListing,
  rejectCookListing,
  featureCookListing,
  fetchAdminCookEarnings,
} from '../lib/admin';

type Tab = 'dashboard' | 'menu' | 'orders' | 'sides' | 'customers' | 'delivery' | 'payments' | 'settings' | 'email' | 'riders' | 'live-map' | 'cooks' | 'cook-listings' | 'cook-earnings' | 'management' | 'moderation';

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
  const [pendingRiders, setPendingRiders] = useState<any[]>([]);
  const [riderLocations, setRiderLocations] = useState<any[]>([]);
  const [cookLocations, setCookLocations] = useState<any[]>([]);
  const [cooks, setCooks] = useState<any[]>([]);
  const [cookListings, setCookListings] = useState<any[]>([]);
  const [cookEarnings, setCookEarnings] = useState<any>({});

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
      } else if (tab === 'riders') {
        const { riders } = await fetchRiders();
        setPendingRiders(riders);
      } else if (tab === 'live-map') {
        const [riderData, cookData] = await Promise.all([fetchRiderLocations(), fetchCookLocations()]);
        setRiderLocations(riderData.riders);
        setCookLocations(cookData.cooks);
      } else if (tab === 'cooks') {
        const { cooks } = await fetchAdminCooks();
        setCooks(cooks);
      } else if (tab === 'cook-listings') {
        const { listings } = await fetchAdminCookListings();
        setCookListings(listings);
      } else if (tab === 'cook-earnings') {
        const earnings = await fetchAdminCookEarnings();
        setCookEarnings(earnings);
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
            { id: 'riders', label: 'Riders', icon: Bike },
            { id: 'live-map', label: 'Live Map', icon: Map },
            { id: 'cooks', label: 'Cooks', icon: ChefHat },
            { id: 'cook-listings', label: 'Cook Listings', icon: Utensils },
            { id: 'cook-earnings', label: 'Cook Earnings', icon: TrendingUp },
            { id: 'management', label: 'Management', icon: LayoutDashboard },
            { id: 'moderation', label: 'Moderation', icon: AlertTriangle },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'email', label: 'Email', icon: Mail },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as unknown as Tab)}
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
                { label: 'Riders online', value: dashboard.ridersOnline ?? 0, color: 'bg-emerald-500/10 text-emerald-300' },
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

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Map className="h-5 w-5 text-emerald-300" /> Active deliveries by zone
                </h3>
                <div className="mt-4 space-y-3">
                  {dashboard.ordersByZone?.length > 0 ? (
                    dashboard.ordersByZone.map((item: any) => (
                      <div key={item.deliveryZoneId} className="flex items-center justify-between text-white/90">
                        <span>{item.deliveryZoneId || 'Unzoned'}</span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-white">{item._count.id} orders</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/50">No active deliveries right now.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'menu' && <MenuTabNew foods={foods} onRefresh={loadTab} />}
        {tab === 'orders' && <OrdersTabNew orders={orders} onRefresh={loadTab} />}
        {tab === 'delivery' && <DeliveryTab zones={zones} onRefresh={loadTab} />}
        {tab === 'sides' && <SidesTabNew sides={sides} onRefresh={loadTab} />}
        {tab === 'customers' && <CustomersTab customers={customers} onRefresh={loadTab} />}
        {tab === 'payments' && <PaymentsTabNew methods={methods} onRefresh={loadTab} />}
        {tab === 'settings' && <SettingsTab settings={settings} onRefresh={loadTab} />}
        {tab === 'email' && <EmailTab />}
        {tab === 'riders' && <RidersTab riders={pendingRiders} onRefresh={loadTab} />}
        {tab === 'live-map' && <LiveMapTab riders={riderLocations} cooks={cookLocations} />}
        {tab === 'cooks' && <CooksTab cooks={cooks} onRefresh={loadTab} />}
        {tab === 'cook-listings' && <CookListingsTab listings={cookListings} onRefresh={loadTab} />}
        {tab === 'cook-earnings' && <CookEarningsTab earnings={cookEarnings} />}
        {tab === 'management' && <ManagementDashboard />}
        {tab === 'moderation' && <ModerationPanel />}
      </main>
    </div>
  );
}

function LiveMapTab({ riders, cooks }: { riders: any[]; cooks: any[] }) {
  const points = [...riders, ...cooks];
  const center =
    points.length > 0
      ? {
          lat: points.reduce((sum, p) => sum + p.lat, 0) / points.length,
          lng: points.reduce((sum, p) => sum + p.lng, 0) / points.length,
        }
      : { lat: 6.5244, lng: 3.3792 };
  const markers = [
    ...riders.map((r) => ({ id: `r-${r.id}`, point: { lat: r.lat, lng: r.lng }, label: `Rider: ${r.name}` })),
    ...cooks.map((c) => ({ id: `c-${c.id}`, point: { lat: c.lat, lng: c.lng }, label: `Cook: ${c.name} (${c.listings} listings)` })),
  ];
  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Live Map</h2>
      <p className="mt-1 text-white/60">Riders and active cooks. Cooks show listing density.</p>
      {points.length === 0 ? (
        <p className="mt-6 text-white/50">No active riders or cooks on the map right now.</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <MapView center={center} markers={markers} height={400} />
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {riders.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span className="text-emerald-300">Rider: {r.name}</span>
                <span className="text-white/50">Last update: {new Date(r.updatedAt).toLocaleTimeString()}</span>
              </li>
            ))}
            {cooks.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="text-amber-300">Cook: {c.name}</span>
                <span className="text-white/50">{c.listings} listings</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
              <p className="text-sm text-white/60">{zone.type} • {zone._count?.orders ?? 0} active orders</p>
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

function RidersTab({ riders, onRefresh }: { riders: any[]; onRefresh: () => void }) {
  const [processing, setProcessing] = useState<string | null>(null);

  async function action(id: string, fn: (id: string) => Promise<any>, label: string) {
    if (!confirm(`${label} this rider?`)) return;
    setProcessing(`${label}:${id}`);
    try {
      await fn(id);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Riders</h2>
      <p className="mt-1 text-white/60">Approve, pause, suspend, ban and restore riders.</p>
      {riders.length === 0 ? (
        <p className="mt-6 text-white/50">No riders registered.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {riders.map((rider) => (
            <div key={rider.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold text-white">{rider.user?.firstName} {rider.user?.lastName}</p>
                  <p className="text-sm text-white/60">{rider.user?.email}</p>
                  <p className="text-sm text-white/60">{rider.user?.phone}</p>
                  <p className="mt-2 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">{rider.isApproved ? 'Approved' : 'Pending'}</span>
                    <span className={`rounded-full px-2 py-0.5 ${rider.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{rider.isActive ? 'Active' : 'Inactive'}</span>
                    <span className={`rounded-full px-2 py-0.5 ${rider.available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{rider.available ? 'Online' : 'Offline'}</span>
                  </p>
                  <p className="mt-1 text-sm text-white/60">Vehicle: {rider.vehicle || '—'}</p>
                  <p className="text-sm text-white/60">Bank: {rider.bankName || '—'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!rider.isApproved && (
                    <button
                      onClick={() => action(rider.id, approveRider, 'Approve')}
                      disabled={processing === `Approve:${rider.id}`}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {rider.isApproved && rider.isActive && (
                    <button
                      onClick={() => action(rider.id, pauseRider, 'Pause')}
                      disabled={processing === `Pause:${rider.id}`}
                      className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/30 disabled:opacity-50"
                    >
                      Pause
                    </button>
                  )}
                  {rider.isApproved && rider.isActive && (
                    <button
                      onClick={() => action(rider.id, suspendRider, 'Suspend')}
                      disabled={processing === `Suspend:${rider.id}`}
                      className="rounded-full bg-orange-500/20 px-4 py-2 text-sm font-bold text-orange-300 transition hover:bg-orange-500/30 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  )}
                  {!rider.isActive && rider.isApproved && (
                    <button
                      onClick={() => action(rider.id, restoreRider, 'Restore')}
                      disabled={processing === `Restore:${rider.id}`}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                  {rider.isApproved && (
                    <button
                      onClick={() => action(rider.id, banRider, 'Ban')}
                      disabled={processing === `Ban:${rider.id}`}
                      className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Ban
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomersTab({ customers, onRefresh }: { customers: any[]; onRefresh: () => void }) {
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={async () => {
                    if (!confirm(`Make ${customer.email} an admin?`)) return;
                    await updateCustomerRole(customer.id, 'ADMIN');
                    onRefresh();
                  }}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Make admin
                </button>
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

function CooksTab({ cooks, onRefresh }: { cooks: any[]; onRefresh: () => void }) {
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleApprove(id: string) {
    if (!confirm('Approve this cook?')) return;
    setProcessing(id);
    try {
      await approveCook(id);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this cook?')) return;
    setProcessing(id);
    try {
      await rejectCook(id);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Home cook applications</h2>
      <p className="mt-1 text-white/60">Approve or reject new cook registrations.</p>
      {cooks.length === 0 ? (
        <p className="mt-6 text-white/50">No cooks registered.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {cooks.map((cook) => (
            <div key={cook.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-white">{cook.displayName}</p>
                  <p className="text-sm text-white/60">{cook.user?.email}</p>
                  <p className="text-sm text-white/60">{cook.user?.phone}</p>
                  <p className="mt-2 text-sm text-white/60">Status: {cook.profileStatus}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => handleApprove(cook.id)}
                    disabled={processing === cook.id || cook.profileStatus === 'APPROVED'}
                    className="rounded-full bg-emerald-500 px-6 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {processing === cook.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(cook.id)}
                    disabled={processing === cook.id}
                    className="rounded-full bg-red-500/20 px-6 py-2 font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CookListingsTab({ listings, onRefresh }: { listings: any[]; onRefresh: () => void }) {
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleApprove(id: string) {
    if (!confirm('Approve this listing?')) return;
    setProcessing(id);
    try {
      await approveCookListing(id);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this listing?')) return;
    setProcessing(id);
    try {
      await rejectCookListing(id);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setProcessing(null);
    }
  }

  async function handleFeature(id: string, featured: boolean) {
    setProcessing(id);
    try {
      await featureCookListing(id, featured);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Home cook listings</h2>
      <p className="mt-1 text-white/60">Moderate new cook listings.</p>
      {listings.length === 0 ? (
        <p className="mt-6 text-white/50">No cook listings yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-white">{listing.title}</p>
                  <p className="text-sm text-white/60">{listing.cook?.displayName}</p>
                  <p className="text-sm text-white/60">{formatPrice(listing.priceKobo)} · {listing.status}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => handleApprove(listing.id)}
                    disabled={processing === listing.id || listing.status === 'APPROVED'}
                    className="rounded-full bg-emerald-500 px-6 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {processing === listing.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(listing.id)}
                    disabled={processing === listing.id}
                    className="rounded-full bg-red-500/20 px-6 py-2 font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleFeature(listing.id, !listing.featured)}
                    disabled={processing === listing.id}
                    className={`rounded-full px-6 py-2 font-bold transition disabled:opacity-50 ${
                      listing.featured ? 'bg-yellow-500/20 text-yellow-300' : 'border border-white/20 text-white'
                    }`}
                  >
                    {listing.featured ? 'Featured' : 'Feature'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CookEarningsTab({ earnings }: { earnings: any }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Cook earnings</h2>
      <p className="mt-1 text-white/60">Pending and settled cook payouts.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-yellow-300">
          <p className="text-sm opacity-80">Pending</p>
          <p className="mt-2 text-3xl font-black">{formatPrice(earnings.pendingKobo ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-emerald-300">
          <p className="text-sm opacity-80">Settled</p>
          <p className="mt-2 text-3xl font-black">{formatPrice(earnings.settledKobo ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}
