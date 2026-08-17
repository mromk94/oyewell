import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  Shield,
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
import CustomersTab from '../components/admin/CustomersTab';
import DeliveryTab from '../components/admin/DeliveryTab';
import RidersTab from '../components/admin/RidersTab';
import ModeratorsTab from '../components/admin/ModeratorsTab';
import SettingsTab from '../components/admin/SettingsTab';
import {
  adminLogin,
  fetchDashboard,
  fetchAdminFoods,
  fetchAdminOrders,
  fetchDeliveryZones,
  fetchPaymentMethods,
  fetchSettings,
  fetchSides,
  fetchCustomers,
  fetchRiders,
  fetchRiderLocations,
  fetchCookLocations,
  fetchAdminCooks,
  approveCook,
  grantCookVisibility,
  boostCook,
  rejectCook,
  deleteCook,
  requestCookMoreInfo,
  approveCookPackaging,
  banCook,
  restoreCook,
  fetchAdminCookListings,
  approveCookListing,
  rejectCookListing,
  featureCookListing,
  fetchAdminCookEarnings,
  settleCookEarnings,
} from '../lib/admin';

type Tab = 'dashboard' | 'menu' | 'orders' | 'sides' | 'customers' | 'delivery' | 'payments' | 'settings' | 'email' | 'riders' | 'live-map' | 'cooks' | 'cook-listings' | 'cook-earnings' | 'management' | 'moderation' | 'moderators';

const TABS: Tab[] = [
  'dashboard',
  'menu',
  'orders',
  'sides',
  'customers',
  'delivery',
  'payments',
  'riders',
  'live-map',
  'cooks',
  'cook-listings',
  'cook-earnings',
  'management',
  'moderation',
  'moderators',
  'settings',
  'email',
];

export default function Admin() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [searchParams, setSearchParams] = useSearchParams();
  const current = searchParams.get('tab') ?? 'dashboard';
  const tab = TABS.includes(current as Tab) ? (current as Tab) : 'dashboard';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function setTab(next: Tab) {
    setSearchParams({ tab: next }, { replace: true });
    setMobileNavOpen(false);
  }
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
        // CookListingsTab loads its own data
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

  const activeLabel = [
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
  ].find((t) => t.id === tab);

  const navItems = (
    <>
      <h1 className="hidden px-4 text-2xl font-black text-white md:block">OYE Admin</h1>
      <nav className="mt-4 flex flex-col gap-1 md:mt-6">
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
          { id: 'moderators', label: 'Moderators', icon: Shield },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'email', label: 'Email', icon: Mail },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as unknown as Tab)}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
              tab === id ? 'bg-white text-black' : 'text-white/70 hover:bg-white/5'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>
      <button
        onClick={() => {
          localStorage.removeItem('admin_token');
          setToken(null);
        }}
        className="mt-8 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-white/70 transition hover:bg-white/5"
      >
        <LogOut className="h-5 w-5" /> Sign out
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-brand-900 md:flex-row">
      <Logo />
      <header className="flex items-center justify-between border-b border-white/10 bg-brand-800 p-4 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNavOpen(true)} className="rounded-2xl p-2 text-white hover:bg-white/10">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-white">{activeLabel?.label ?? 'Admin'}</span>
        </div>
      </header>

      <aside className="hidden shrink-0 border-r border-white/10 bg-brand-800 p-4 md:block md:w-64">
        {navItems}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-brand-800 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="px-4 text-2xl font-black text-white">OYE Admin</h1>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-2xl p-2 text-white hover:bg-white/10">
                <X className="h-6 w-6" />
              </button>
            </div>
            {navItems}
          </div>
        </div>
      )}

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
        {tab === 'cook-listings' && <CookListingsTab />}
        {tab === 'cook-earnings' && <CookEarningsTab earnings={cookEarnings} onRefresh={loadTab} />}
        {tab === 'management' && <ManagementDashboard />}
        {tab === 'moderation' && <ModerationPanel />}
        {tab === 'moderators' && <ModeratorsTab />}
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





function CooksTab({ cooks, onRefresh }: { cooks: any[]; onRefresh: () => void }) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [moreInfoReason, setMoreInfoReason] = useState('');
  const [moreInfoFields, setMoreInfoFields] = useState('');
  const [packagingNote, setPackagingNote] = useState('');
  const [banReason, setBanReason] = useState('');

  async function call<T>(fn: () => Promise<T>) {
    setProcessing(selected?.id ?? 'global');
    try {
      await fn();
      onRefresh();
      if (selected) {
        const updated = cooks.find((c) => c.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setProcessing(null);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('Approve this cook?')) return;
    await call(() => approveCook(id));
  }

  async function handleGrantVisibility(id: string) {
    if (!confirm('Grant full visibility to this cook and approve all pending listings?')) return;
    await call(() => grantCookVisibility(id));
  }

  async function handleBoost(id: string, featured: boolean) {
    if (!confirm(featured ? 'Boost this cook by featuring all approved listings?' : 'Remove boost from this cook?')) return;
    await call(() => boostCook(id, featured));
  }

  async function handleReject(id: string) {
    if (!confirm('Reject this cook?')) return;
    await call(() => rejectCook(id));
  }

  async function handleRequestMoreInfo(id: string) {
    if (!moreInfoReason.trim()) return;
    const fields = moreInfoFields.split(',').map((f) => f.trim()).filter(Boolean);
    await call(() => requestCookMoreInfo(id, moreInfoReason, fields));
    setMoreInfoReason('');
    setMoreInfoFields('');
  }

  async function handlePackagingReview(id: string, approved: boolean) {
    await call(() => approveCookPackaging(id, approved, packagingNote));
    setPackagingNote('');
  }

  async function handleBan(id: string) {
    if (!banReason.trim()) return;
    if (!confirm(`Ban this cook? ${banReason}`)) return;
    await call(() => banCook(id, banReason));
    setBanReason('');
  }

  async function handleRestore(id: string) {
    if (!confirm('Restore this cook?')) return;
    await call(() => restoreCook(id));
  }

  async function handleDeleteCook(id: string) {
    if (!confirm('Permanently delete this cook application and all linked listings?')) return;
    await call(() => deleteCook(id));
  }

  function open(cook: any) {
    setSelected(cook);
    setMoreInfoReason('');
    setMoreInfoFields('');
    setPackagingNote('');
    setBanReason('');
  }

  function close() {
    setSelected(null);
  }

  function statusColor(status: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/20 text-emerald-300';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-white/10 text-white/70';
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Home cook applications</h2>
      <p className="mt-1 text-white/60">Approve, review packaging, or manage cook accounts.</p>
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
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor(cook.profileStatus)}`}>
                      {cook.profileStatus?.replace(/_/g, ' ')}
                    </span>
                    {cook.packagingApproved && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">Packaging OK</span>}
                    {cook.banned && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300">Banned</span>}
                    {cook.latitude != null && cook.longitude != null && cook.profileStatus === 'APPROVED' && cook.kitchenStatus === 'OPEN' && (cook.listings || []).some((l: any) => l.status === 'APPROVED' && l.isActive) ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">Visible on Around Me</span>
                    ) : (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300">Not visible</span>
                    )}
                    {(cook.listings || []).some((l: any) => l.featured) && (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300">Boosted</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => open(cook)}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleApprove(cook.id)}
                    disabled={processing === cook.id || cook.profileStatus === 'APPROVED'}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {processing === cook.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleGrantVisibility(cook.id)}
                    disabled={processing === cook.id}
                    className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-blue-400 disabled:opacity-50"
                  >
                    Grant visibility
                  </button>
                  <button
                    onClick={() => handleBoost(cook.id, !(cook.listings || []).some((l: any) => l.featured))}
                    disabled={processing === cook.id}
                    className="rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/30 disabled:opacity-50"
                  >
                    {(cook.listings || []).some((l: any) => l.featured) ? 'Unboost' : 'Boost'}
                  </button>
                  <button
                    onClick={() => handleReject(cook.id)}
                    disabled={processing === cook.id}
                    className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleDeleteCook(cook.id)}
                    disabled={processing === cook.id}
                    className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-red-400 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm md:p-8">
          <div className="mx-auto h-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-brand-900 shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h3 className="text-xl font-bold text-white">{selected.displayName}</h3>
                <button
                  onClick={close}
                  className="rounded-full bg-black/50 p-2 text-white transition hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex-1">
                    {selected.profilePhoto ? (
                      <img
                        src={selected.profilePhoto}
                        alt={selected.displayName}
                        className="h-64 w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/50">
                        No profile photo
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                      <p><span className="text-white/50">Email:</span> {selected.user?.email || '—'}</p>
                      <p><span className="text-white/50">Phone:</span> {selected.user?.phone || '—'}</p>
                      <p><span className="text-white/50">Cuisine:</span> {selected.cuisineSpecialty || '—'}</p>
                      <p><span className="text-white/50">Service radius:</span> {selected.serviceRadiusKm ? `${selected.serviceRadiusKm} km` : '—'}</p>
                      <p><span className="text-white/50">Location:</span> {selected.latitude ?? '—'}, {selected.longitude ?? '—'}</p>
                      <p><span className="text-white/50">Rating:</span> {selected.rating ? selected.rating.toFixed(1) : '—'} ({selected.totalOrders ?? 0} orders)</p>
                      <p><span className="text-white/50">Listings:</span> {selected._count?.listings ?? 0} · <span className="text-white/50">Orders:</span> {selected._count?.orders ?? 0}</p>
                    </div>

                    {selected.bio && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/50">Bio</p>
                        <p className="mt-1 text-white/80">{selected.bio}</p>
                      </div>
                    )}

                    {(selected.categories?.length || selected.signatureDishes?.length) && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                        {selected.categories?.length > 0 && (
                          <p><span className="text-white/50">Categories:</span> {selected.categories.join(', ')}</p>
                        )}
                        {selected.signatureDishes?.length > 0 && (
                          <p className="mt-1"><span className="text-white/50">Signature dishes:</span> {selected.signatureDishes.join(', ')}</p>
                        )}
                        {selected.capacity && <p className="mt-1"><span className="text-white/50">Capacity:</span> {selected.capacity}</p>}
                        {selected.prepTime && <p className="mt-1"><span className="text-white/50">Prep time:</span> {selected.prepTime}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor(selected.profileStatus)}`}>
                        {selected.profileStatus?.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">
                        Kitchen: {selected.kitchenStatus?.replace(/_/g, ' ')}
                      </span>
                      {selected.packagingApproved && (
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">Packaging approved</span>
                      )}
                      {selected.banned && (
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300">Banned</span>
                      )}
                    </div>

                    {selected.packagingPhotos?.length > 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="font-bold text-white">Packaging photos</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {selected.packagingPhotos.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/10 bg-white/5">
                              <img src={url} alt={`Packaging ${i + 1}`} className="h-32 w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="font-bold text-white">Packaging review</p>
                      <textarea
                        value={packagingNote}
                        onChange={(e) => setPackagingNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none focus:border-white"
                        rows={2}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handlePackagingReview(selected.id, true)}
                          disabled={processing === selected.id}
                          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                        >
                          Approve packaging
                        </button>
                        <button
                          onClick={() => handlePackagingReview(selected.id, false)}
                          disabled={processing === selected.id}
                          className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                        >
                          Reject packaging
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="font-bold text-white">Request more info</p>
                      <input
                        type="text"
                        value={moreInfoReason}
                        onChange={(e) => setMoreInfoReason(e.target.value)}
                        placeholder="Reason"
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none focus:border-white"
                      />
                      <input
                        type="text"
                        value={moreInfoFields}
                        onChange={(e) => setMoreInfoFields(e.target.value)}
                        placeholder="Fields needed, comma separated"
                        className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none focus:border-white"
                      />
                      <button
                        onClick={() => handleRequestMoreInfo(selected.id)}
                        disabled={processing === selected.id || !moreInfoReason.trim()}
                        className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-50"
                      >
                        Request more info
                      </button>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      {selected.banned ? (
                        <div>
                          <p className="font-bold text-red-300">Banned{selected.banReason ? `: ${selected.banReason}` : ''}</p>
                          <button
                            onClick={() => handleRestore(selected.id)}
                            disabled={processing === selected.id}
                            className="mt-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            Restore cook
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-white">Ban cook</p>
                          <input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Reason for ban"
                            className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none focus:border-white"
                          />
                          <button
                            onClick={() => handleBan(selected.id)}
                            disabled={processing === selected.id || !banReason.trim()}
                            className="mt-2 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                          >
                            Ban cook
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleApprove(selected.id)}
                        disabled={processing === selected.id || selected.profileStatus === 'APPROVED'}
                        className="rounded-full bg-emerald-500 px-6 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(selected.id)}
                        disabled={processing === selected.id}
                        className="rounded-full bg-red-500/20 px-6 py-2 font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CookListingsTab() {
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit] = useState(20);

  useEffect(() => {
    load();
  }, [status, search, skip, limit]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminCookListings({ status, q: search, skip, limit });
      setListings(res.listings);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm('Approve this listing?')) return;
    setProcessing(id);
    try {
      await approveCookListing(id);
      await load();
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
      await load();
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
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setProcessing(null);
    }
  }

  function open(listing: any) {
    setSelected(listing);
    setMediaIndex(0);
  }

  function close() {
    setSelected(null);
  }

  const media = selected?.media ?? [];
  const activeMedia = media[mediaIndex] ?? null;

  function nextMedia() {
    setMediaIndex((i) => (i + 1) % media.length);
  }

  function prevMedia() {
    setMediaIndex((i) => (i - 1 + media.length) % media.length);
  }

  function statusColor(status: string) {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/20 text-emerald-300';
      case 'PENDING_REVIEW':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-white/10 text-white/70';
    }
  }

  function doSearch() {
    setSearch(query);
    setSkip(0);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value);
    setSkip(0);
  }

  const start = total === 0 ? 0 : skip + 1;
  const end = Math.min(skip + limit, total);
  const canPrev = skip > 0;
  const canNext = skip + limit < total;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Home cook listings</h2>
      <p className="mt-1 text-white/60">Moderate new cook listings.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={handleStatusChange}
          className="rounded-2xl border border-white/20 bg-white/5 p-3 text-white outline-none focus:border-white"
        >
          <option value="" className="bg-brand-900">All statuses</option>
          <option value="PENDING_REVIEW" className="bg-brand-900">Pending review</option>
          <option value="APPROVED" className="bg-brand-900">Approved</option>
          <option value="REJECTED" className="bg-brand-900">Rejected</option>
          <option value="DRAFT" className="bg-brand-900">Draft</option>
          <option value="PAUSED" className="bg-brand-900">Paused</option>
        </select>
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search title or cook..."
            className="flex-1 rounded-2xl border border-white/20 bg-white/5 p-3 text-white placeholder-white/40 outline-none focus:border-white"
          />
          <button
            onClick={doSearch}
            className="rounded-2xl bg-white px-4 py-2 font-bold text-black transition hover:bg-white/90"
          >
            Search
          </button>
          {search && (
            <button
              onClick={() => { setQuery(''); setSearch(''); setSkip(0); }}
              className="rounded-2xl border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-red-300">{error}</p>}

      {loading ? (
        <p className="mt-6 text-white/60">Loading...</p>
      ) : listings.length === 0 ? (
        <p className="mt-6 text-white/50">No cook listings found.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-white">{listing.title}</p>
                  <p className="text-sm text-white/60">{listing.cook?.displayName}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor(listing.status)}`}>
                      {listing.status?.replace(/_/g, ' ')}
                    </span>
                    <span>{formatPrice(listing.priceKobo)}</span>
                    {listing.featured && <span className="text-yellow-300">★ Featured</span>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => open(listing)}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleApprove(listing.id)}
                    disabled={processing === listing.id || listing.status === 'APPROVED'}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {processing === listing.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(listing.id)}
                    disabled={processing === listing.id}
                    className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleFeature(listing.id, !listing.featured)}
                    disabled={processing === listing.id}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                      listing.featured ? 'bg-yellow-500/20 text-yellow-300' : 'border border-white/20 text-white'
                    }`}
                  >
                    {listing.featured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-white/70">
          <p>
            {start}–{end} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSkip((s) => Math.max(0, s - limit))}
              disabled={!canPrev}
              className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setSkip((s) => s + limit)}
              disabled={!canNext}
              className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm md:p-8">
          <div className="mx-auto h-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-brand-900 shadow-2xl">
            <div className="flex h-full flex-col lg:flex-row">
              <div className="relative flex flex-1 flex-col border-b border-white/10 bg-black/30 p-4 lg:border-b-0 lg:border-r">
                <button
                  onClick={close}
                  className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex flex-1 items-center justify-center">
                  {activeMedia ? (
                    activeMedia.type === 'VIDEO' ? (
                      <video
                        src={activeMedia.url}
                        poster={activeMedia.thumbnailUrl}
                        controls
                        playsInline
                        className="max-h-[60vh] w-full rounded-2xl object-contain"
                      />
                    ) : (
                      <img
                        src={activeMedia.url}
                        alt={selected.title}
                        className="max-h-[60vh] w-full rounded-2xl object-contain"
                      />
                    )
                  ) : (
                    <p className="text-white/50">No media</p>
                  )}
                </div>
                {media.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button onClick={prevMedia} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-white/70">
                      {mediaIndex + 1} / {media.length}
                    </span>
                    <button onClick={nextMedia} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="h-96 flex-1 overflow-y-auto p-6 lg:h-auto">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selected.title}</h3>
                    <p className="mt-1 text-xl font-semibold text-emerald-300">{formatPrice(selected.priceKobo)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor(selected.status)}`}>
                    {selected.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                {selected.description && (
                  <p className="mt-4 text-white/80">{selected.description}</p>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Cuisine</p>
                    <p className="font-semibold text-white">{selected.cuisine || '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Prep time</p>
                    <p className="font-semibold text-white">
                      {selected.prepTimeMinutesMax ? `${selected.prepTimeMinutesMax} min` : '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Stock</p>
                    <p className="font-semibold text-white">{selected.stock ?? selected.quantity ?? '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/50">Engagement</p>
                    <p className="font-semibold text-white">{selected.likeCount ?? 0} likes · {selected.viewCount ?? 0} views</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2 text-sm text-white/80">
                  {selected.ingredients && (
                    <p><span className="text-white/50">Ingredients:</span> {selected.ingredients}</p>
                  )}
                  {selected.allergens && (
                    <p><span className="text-white/50">Allergens:</span> {selected.allergens}</p>
                  )}
                  {selected.portionDescription && (
                    <p><span className="text-white/50">Portion:</span> {selected.portionDescription}</p>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h4 className="font-bold text-white">Cook</h4>
                  <div className="mt-2 space-y-1 text-sm text-white/80">
                    <p><span className="text-white/50">Name:</span> {selected.cook?.displayName || '—'}</p>
                    <p><span className="text-white/50">Email:</span> {selected.cook?.user?.email || '—'}</p>
                    <p><span className="text-white/50">Phone:</span> {selected.cook?.user?.phone || '—'}</p>
                    <p><span className="text-white/50">Profile status:</span> {selected.cook?.profileStatus || '—'}</p>
                    <p><span className="text-white/50">Rating:</span> {selected.cook?.rating ? selected.cook.rating.toFixed(1) : '—'}</p>
                    <p><span className="text-white/50">Address:</span> {selected.cook?.address || '—'}</p>
                    <p>
                      <span className="text-white/50">Verified:</span>{' '}
                      {selected.cook?.verified ? 'Yes' : 'No'} ·{' '}
                      <span className="text-white/50">Packaging approved:</span>{' '}
                      {selected.cook?.packagingApproved ? 'Yes' : 'No'} ·{' '}
                      <span className="text-white/50">Banned:</span>{' '}
                      {selected.cook?.banned ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleApprove(selected.id)}
                    disabled={processing === selected.id || selected.status === 'APPROVED'}
                    className="rounded-full bg-emerald-500 px-6 py-2 font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {processing === selected.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(selected.id)}
                    disabled={processing === selected.id}
                    className="rounded-full bg-red-500/20 px-6 py-2 font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleFeature(selected.id, !selected.featured)}
                    disabled={processing === selected.id}
                    className={`rounded-full px-6 py-2 font-bold transition disabled:opacity-50 ${
                      selected.featured ? 'bg-yellow-500/20 text-yellow-300' : 'border border-white/20 text-white'
                    }`}
                  >
                    {selected.featured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CookEarningsTab({ earnings, onRefresh }: { earnings: any; onRefresh: () => void }) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const cooks = earnings?.cooks ?? [];

  async function handleSettle(cookId: string) {
    if (!confirm('Settle all pending earnings for this cook?')) return;
    setProcessing(cookId);
    try {
      await settleCookEarnings(cookId);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Settle failed');
    } finally {
      setProcessing(null);
    }
  }

  const pendingEarnings = (c: any) => (c.earnings ?? []).filter((e: any) => e.status === 'PENDING');

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Cook earnings</h2>
      <p className="mt-1 text-white/60">Pending and settled cook payouts.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-yellow-300">
          <p className="text-sm opacity-80">Pending</p>
          <p className="mt-2 text-3xl font-black">{formatPrice(earnings?.pendingKobo ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-emerald-300">
          <p className="text-sm opacity-80">Settled</p>
          <p className="mt-2 text-3xl font-black">{formatPrice(earnings?.settledKobo ?? 0)}</p>
        </div>
      </div>

      {cooks.length === 0 ? (
        <p className="mt-6 text-white/50">No cook earnings yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {cooks.map((c: any) => {
            const pending = pendingEarnings(c);
            return (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{c.displayName}</p>
                    <p className="text-sm text-white/60">{c.user?.email}</p>
                    <p className="mt-1 text-sm text-yellow-300">Pending: {formatPrice(c.pendingKobo ?? 0)}</p>
                    <p className="text-sm text-emerald-300">Settled: {formatPrice(c.settledKobo ?? 0)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelected(c)}
                      className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleSettle(c.id)}
                      disabled={processing === c.id || (c.pendingKobo ?? 0) <= 0}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {processing === c.id ? '...' : 'Settle'}
                    </button>
                  </div>
                </div>
                {pending.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    {pending.map((e: any) => (
                      <div key={e.id} className="flex justify-between text-sm text-white/70">
                        <span>{e.order?.orderNumber || e.id}</span>
                        <span>{formatPrice(e.amountKobo)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm md:p-8">
          <div className="mx-auto h-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-brand-900 shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h3 className="text-xl font-bold text-white">{selected.displayName}</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full bg-black/50 p-2 text-white transition hover:bg-white/20"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-white/60">{selected.user?.email}</p>
                <p className="mt-4 text-yellow-300">Pending: {formatPrice(selected.pendingKobo ?? 0)}</p>
                <p className="text-emerald-300">Settled: {formatPrice(selected.settledKobo ?? 0)}</p>

                <div className="mt-6 space-y-2">
                  {(selected.earnings ?? []).map((e: any) => (
                    <div
                      key={e.id}
                      className={`flex items-center justify-between rounded-2xl border p-3 text-sm ${
                        e.status === 'SETTLED'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
                      }`}
                    >
                      <span>{e.order?.orderNumber || e.id}</span>
                      <span>{formatPrice(e.amountKobo)} · {e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
