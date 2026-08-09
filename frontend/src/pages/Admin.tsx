import { useEffect, useState } from 'react';
import { toast } from '../lib/toast';
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
} from 'lucide-react';
import { formatPrice } from '../lib/api';
import { MenuTab as MenuTabNew } from '../components/admin/MenuTab';
import { SidesTab as SidesTabNew } from '../components/admin/SidesTab';
import { PaymentsTab as PaymentsTabNew } from '../components/admin/PaymentsTab';
import { OrdersTab as OrdersTabNew } from '../components/admin/OrdersTab';
import {
  adminLogin,
  fetchDashboard,
  fetchAdminFoods,
  updateFood,
  archiveFood,
  createFood,
  fetchAdminOrders,
  updateOrderStatus,
  fetchDeliveryZones,
  createDeliveryZone,
  deleteDeliveryZone,
  fetchPaymentMethods,
  updatePaymentMethod,
  fetchSettings,
  updateSettings,
  fetchSides,
  createSide,
  updateSide,
  deleteSide,
  fetchCustomers,
  fetchCustomerOrders,
} from '../lib/admin';

type Tab = 'dashboard' | 'menu' | 'orders' | 'sides' | 'customers' | 'delivery' | 'payments' | 'settings';

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
      <aside className="shrink-0 border-b border-white/10 bg-brand-800 p-4 md:w-64 md:border-b-0 md:border-r">
        <h1 className="px-4 text-2xl font-black text-white">OYE Admin</h1>
        <nav className="mt-6 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'menu', label: 'Menu', icon: Utensils },
            { id: 'orders', label: 'Orders', icon: Package },
            { id: 'sides', label: 'Sides', icon: Salad },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'delivery', label: 'Delivery', icon: Truck },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium ${
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
          className="mt-8 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-white/70 hover:bg-white/5"
        >
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        {loading && <p className="text-white/60">Loading...</p>}
        {error && <p className="text-red-300">{error}</p>}

        {tab === 'dashboard' && dashboard && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Active orders', value: dashboard.active },
                { label: 'New orders', value: dashboard.new },
                { label: 'Preparing', value: dashboard.preparing },
                { label: 'Out for delivery', value: dashboard.outForDelivery },
                { label: 'Completed', value: dashboard.completed },
                { label: 'Revenue', value: formatPrice(dashboard.revenueKobo ?? 0) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <p className="text-sm text-white/60">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {dashboard.popularItems?.length > 0 && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-bold text-white">Popular items</h2>
                <div className="mt-4 space-y-3">
                  {dashboard.popularItems.map((item: any) => (
                    <div key={item.foodName} className="flex justify-between text-white/90">
                      <span>{item.foodName}</span>
                      <span className="font-semibold text-white">{item._count.id} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'menu' && <MenuTabNew foods={foods} onRefresh={loadTab} />}
        {tab === 'orders' && <OrdersTabNew orders={orders} onRefresh={loadTab} />}
        {tab === 'delivery' && <DeliveryTab zones={zones} onRefresh={loadTab} />}
        {tab === 'sides' && <SidesTabNew sides={sides} onRefresh={loadTab} />}
        {tab === 'customers' && <CustomersTab customers={customers} onRefresh={loadTab} />}
        {tab === 'payments' && <PaymentsTabNew methods={methods} onRefresh={loadTab} />}
        {tab === 'settings' && <SettingsTab settings={settings} onRefresh={loadTab} />}
      </main>
    </div>
  );
}

function MenuTab({ foods, onRefresh }: { foods: any[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [orderingMode, setOrderingMode] = useState('PLATE');
  const [options, setOptions] = useState<{ label: string; value: string; priceKobo: string; stock: string }[]>([
    { label: '', value: '', priceKobo: '', stock: '' },
  ]);

  async function handleToggle(food: any, field: string) {
    try {
      const next =
        field === 'status'
          ? food.status === 'PUBLISHED'
            ? 'DRAFT'
            : 'PUBLISHED'
          : !food[field];
      await updateFood(food.id, { [field]: next });
      onRefresh();
      toast.success(`${field} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!name.trim() || !slug.trim()) {
        toast.error('Name and slug are required');
        return;
      }
      const validOptions = options
        .filter((o) => o.label.trim() && o.priceKobo.trim())
        .map((o) => ({
          label: o.label,
          value: o.value,
          priceKobo: Number(o.priceKobo),
          stock: o.stock.trim() ? Number(o.stock) : null,
        }));
      await createFood({
        name,
        slug,
        description,
        heroImage,
        orderingMode,
        options: validOptions,
      });
      setName('');
      setSlug('');
      setDescription('');
      setHeroImage('');
      setImageName('');
      setOptions([{ label: '', value: '', priceKobo: '', stock: '' }]);
      setCreateOpen(false);
      onRefresh();
      toast.success('Food created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create food');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Menu</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-white px-6 py-2 font-bold text-black"
        >
          Create food
        </button>
      </div>

      {createOpen && (
        <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <input
            placeholder="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <input
            placeholder="Hero image URL"
            value={heroImage}
            onChange={(e) => setHeroImage(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <label className="block">
            <span className="text-sm text-white/70">Or upload an image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1_500_000) {
                  toast.warning('Image is too large. Use a smaller file or a URL.');
                  return;
                }
                setImageName(file.name);
                const reader = new FileReader();
                reader.onload = (ev) => setHeroImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
              className="mt-2 block w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
            />
            {imageName && <span className="mt-1 text-xs text-white/60">{imageName}</span>}
          </label>
          <select
            value={orderingMode}
            onChange={(e) => setOrderingMode(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          >
            <option value="PLATE">Plate</option>
            <option value="PORTION">Portion</option>
            <option value="PIECE">Piece</option>
          </select>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-4">
                <input
                  placeholder="Label"
                  value={o.label}
                  onChange={(e) => {
                    const next = [...options];
                    next[i].label = e.target.value;
                    setOptions(next);
                  }}
                  className="rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
                />
                <input
                  placeholder="Value"
                  value={o.value}
                  onChange={(e) => {
                    const next = [...options];
                    next[i].value = e.target.value;
                    setOptions(next);
                  }}
                  className="rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
                />
                <input
                  placeholder="Price (kobo)"
                  value={o.priceKobo}
                  onChange={(e) => {
                    const next = [...options];
                    next[i].priceKobo = e.target.value;
                    setOptions(next);
                  }}
                  className="rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
                />
                <input
                  placeholder="Stock"
                  value={o.stock}
                  onChange={(e) => {
                    const next = [...options];
                    next[i].stock = e.target.value;
                    setOptions(next);
                  }}
                  className="rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOptions([...options, { label: '', value: '', priceKobo: '', stock: '' }])}
            className="rounded-full border border-white/20 px-4 py-2 text-white"
          >
            Add option
          </button>
          <div className="flex gap-3">
            <button type="submit" className="rounded-full bg-white px-6 py-2 font-bold text-black">
              Save
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-full border border-white/20 px-6 py-2 text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {foods.map((food) => (
          <div
            key={food.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-bold text-white">{food.name}</p>
              <p className="text-sm text-white/60">{food.orderingMode}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggle(food, 'isAvailable')}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  food.isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}
              >
                {food.isAvailable ? 'Available' : 'Unavailable'}
              </button>
              <button
                onClick={() => handleToggle(food, 'featured')}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  food.featured ? 'bg-yellow-500/20 text-yellow-300' : 'border border-white/20 text-white/70'
                }`}
              >
                {food.featured ? 'Featured' : 'Feature'}
              </button>
              <button
                onClick={() => handleToggle(food, 'status')}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  food.status === 'PUBLISHED' ? 'bg-white text-black' : 'border border-white/20 text-white/70'
                }`}
              >
                {food.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </button>
              <button
                onClick={async () => {
                  try {
                    await archiveFood(food.id);
                    onRefresh();
                    toast.success('Food archived');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Archive failed');
                  }
                }}
                className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ orders, onRefresh }: { orders: any[]; onRefresh: () => void }) {
  const statuses = ['PENDING_PAYMENT', 'PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED'];

  async function updateStatus(order: any, status: string) {
    await updateOrderStatus(order.id, status);
    onRefresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Orders</h2>
      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-white">{order.orderNumber}</p>
              <p className="text-white/70">{order.paymentStatus}</p>
            </div>
            <p className="mt-1 text-sm text-white/60">{order.address}</p>
            <p className="text-sm text-white/60">{order.phone}</p>
            <p className="mt-2 font-bold text-white">{formatPrice(order.totalKobo)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(order, s)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    order.status === s ? 'bg-white text-black' : 'border border-white/20 text-white/70'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
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

function PaymentsTab({ methods, onRefresh }: { methods: any[]; onRefresh: () => void }) {
  async function toggle(method: any) {
    await updatePaymentMethod(method.id, { enabled: !method.enabled });
    onRefresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Payment methods</h2>
      <div className="mt-6 space-y-4">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div>
              <p className="font-bold text-white">{method.name}</p>
              <p className="text-sm text-white/60">{method.provider}</p>
            </div>
            <button
              onClick={() => toggle(method)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                method.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'border border-white/20 text-white/70'
              }`}
            >
              {method.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidesTab({ sides, onRefresh }: { sides: any[]; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceKobo, setPriceKobo] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createSide({
      name,
      description,
      priceKobo: Number(priceKobo) * 100,
      isAvailable: true,
    });
    setCreateOpen(false);
    setName('');
    setDescription('');
    setPriceKobo('');
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Sides</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-white px-6 py-2 font-bold text-black"
        >
          Add side
        </button>
      </div>

      {createOpen && (
        <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <input
            placeholder="Name (e.g. Extra meat)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <input
            placeholder="Price in NGN"
            value={priceKobo}
            onChange={(e) => setPriceKobo(e.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white"
          />
          <div className="flex gap-3">
            <button type="submit" className="rounded-full bg-white px-6 py-2 font-bold text-black">
              Save
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-full border border-white/20 px-6 py-2 text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-4">
        {sides.map((side) => (
          <div
            key={side.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-bold text-white">{side.name}</p>
              <p className="text-sm text-white/60">{formatPrice(side.priceKobo)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await updateSide(side.id, { isAvailable: !side.isAvailable });
                  onRefresh();
                }}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  side.isAvailable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}
              >
                {side.isAvailable ? 'Available' : 'Unavailable'}
              </button>
              <button
                onClick={async () => {
                  await deleteSide(side.id);
                  onRefresh();
                }}
                className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
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
