import { useEffect, useMemo, useState } from 'react';
import {
  Truck,
  Map,
  Bike,
  Package,
  Settings,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  User,
  Navigation,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatPrice } from '../../lib/api';
import { toast } from '../../lib/toast';
import { MapView } from '../MapView';
import {
  createDeliveryZone,
  deleteDeliveryZone,
  fetchDeliveryPricingRules,
  createDeliveryPricingRule,
  deleteDeliveryPricingRule,
  fetchRiders,
  fetchRiderLocations,
  fetchCookLocations,
  fetchAdminOrders,
  approveRider,
  pauseRider,
  banRider,
  restoreRider,
  assignRider,
  dispatchOrder,
  fetchEligibleRiders,
  updateOrderStatus,
} from '../../lib/admin';

type SubTab = 'overview' | 'zones' | 'pricing' | 'riders' | 'live' | 'dispatch';

const ZONES_TAB: { label: string; id: SubTab; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'zones', label: 'Zones', icon: Map },
  { id: 'pricing', label: 'Pricing Rules', icon: Truck },
  { id: 'riders', label: 'Riders', icon: Bike },
  { id: 'live', label: 'Live Map', icon: MapPin },
  { id: 'dispatch', label: 'Dispatch', icon: Package },
];

function ZoneBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CITY: 'bg-emerald-500/10 text-emerald-300',
    AREA: 'bg-blue-500/10 text-blue-300',
    RADIUS: 'bg-purple-500/10 text-purple-300',
    POLYGON: 'bg-orange-500/10 text-orange-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors[type] ?? 'bg-white/10 text-white'}`}>
      {type}
    </span>
  );
}

export default function DeliveryTab({ zones, onRefresh }: { zones: any[]; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [loading, setLoading] = useState(false);

  const [rules, setRules] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderLocations, setRiderLocations] = useState<any[]>([]);
  const [cookLocations, setCookLocations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Zone creation form
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState<'CITY' | 'AREA' | 'RADIUS' | 'POLYGON'>('CITY');
  const [zoneFee, setZoneFee] = useState('');
  const [zoneEst, setZoneEst] = useState('');
  const [zoneRaw, setZoneRaw] = useState('Lagos');

  // Pricing rule form
  const [ruleZoneId, setRuleZoneId] = useState('');
  const [ruleType, setRuleType] = useState<'NEIGHBORHOOD' | 'PROFESSIONAL'>('NEIGHBORHOOD');
  const [ruleBase, setRuleBase] = useState('');
  const [rulePerMeter, setRulePerMeter] = useState('0');
  const [ruleMinOrder, setRuleMinOrder] = useState('0');
  const [ruleEst, setRuleEst] = useState('');

  // Dispatch
  const [assigning, setAssigning] = useState<any | null>(null);
  const [riderFee, setRiderFee] = useState('');
  const [eligible, setEligible] = useState<any[]>([]);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [riderId, setRiderId] = useState('');

  useEffect(() => {
    if (subTab === 'overview' || subTab === 'riders' || subTab === 'live' || subTab === 'dispatch') {
      loadSupplementary();
    }
  }, [subTab]);

  async function loadSupplementary() {
    setLoading(true);
    try {
      const [riderData, riderLocs, cookLocs, orderData] = await Promise.all([
        fetchRiders(),
        fetchRiderLocations(),
        fetchCookLocations(),
        fetchAdminOrders(0, 200),
      ]);
      setRiders(riderData.riders);
      setRiderLocations(riderLocs.riders);
      setCookLocations(cookLocs.cooks);
      setOrders(orderData.orders);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (subTab === 'pricing' || subTab === 'overview') {
      loadRules();
    }
  }, [subTab]);

  async function loadRules() {
    try {
      const data = await fetchDeliveryPricingRules();
      setRules(data.rules);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pricing rules');
    }
  }

  const mapCenter = useMemo(() => {
    if (riderLocations.length > 0) return { lat: riderLocations[0].lat, lng: riderLocations[0].lng };
    if (cookLocations.length > 0) return { lat: cookLocations[0].lat, lng: cookLocations[0].lng };
    return { lat: 6.5244, lng: 3.3792 };
  }, [riderLocations, cookLocations]);

  function buildBoundary() {
    if (zoneType === 'CITY') return { cities: zoneRaw.split(',').map((c) => c.trim()).filter(Boolean) };
    if (zoneType === 'AREA') return { areas: zoneRaw.split(',').map((c) => c.trim()).filter(Boolean) };
    if (zoneType === 'RADIUS') {
      const [lat, lng, radiusMeters] = zoneRaw.split(',').map((c) => c.trim());
      return { lat: Number(lat), lng: Number(lng), radiusMeters: Number(radiusMeters) };
    }
    if (zoneType === 'POLYGON') {
      const lines = zoneRaw.split('\n').filter(Boolean);
      return { coordinates: lines.map((line) => line.split(',').map((c) => Number(c.trim()))) };
    }
    return {};
  }

  async function handleCreateZone(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createDeliveryZone({
        name: zoneName,
        type: zoneType,
        boundary: buildBoundary(),
        feeKobo: Math.round(Number(zoneFee) * 100),
        estimatedMinutes: Number(zoneEst) || null,
      });
      toast.success('Zone created');
      setZoneName('');
      setZoneFee('');
      setZoneEst('');
      setZoneRaw('');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create zone');
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createDeliveryPricingRule({
        deliveryZoneId: ruleZoneId,
        deliveryType: ruleType,
        baseFeeKobo: Math.round(Number(ruleBase) * 100),
        perMeterKobo: Number(rulePerMeter),
        minOrderKobo: Math.round(Number(ruleMinOrder) * 100),
        estimatedMinutes: Number(ruleEst) || null,
        enabled: true,
      });
      toast.success('Pricing rule created');
      setRuleBase('');
      setRulePerMeter('0');
      setRuleMinOrder('0');
      setRuleEst('');
      loadRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rule');
    }
  }

  async function handleRiderAction(id: string, action: 'approve' | 'pause' | 'ban' | 'restore') {
    try {
      if (action === 'approve') await approveRider(id);
      if (action === 'pause') await pauseRider(id);
      if (action === 'ban') await banRider(id);
      if (action === 'restore') await restoreRider(id);
      toast.success(`Rider ${action}d`);
      loadSupplementary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rider action failed');
    }
  }

  async function openAssign(order: any) {
    setAssigning(order);
    setRiderId(order.riderId ?? '');
    setRiderFee(order.riderFeeKobo ? String(order.riderFeeKobo / 100) : '');
    try {
      const data = await fetchEligibleRiders(order.orderNumber);
      setEligible(data.riders);
      if (!order.riderId && data.riders.length > 0) setRiderId(data.riders[0].id);
    } catch (err) {
      setEligible([]);
    }
  }

  async function handleAssign() {
    if (!assigning || !riderId) return;
    try {
      const feeNgn = Number(riderFee);
      const feeKobo = !Number.isNaN(feeNgn) && feeNgn >= 0 ? Math.round(feeNgn * 100) : 0;
      await assignRider(assigning.orderNumber, riderId, feeKobo);
      setAssigning(null);
      loadSupplementary();
      toast.success('Rider assigned');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed');
    }
  }

  async function handleDispatch(order: any) {
    setDispatching(order.id);
    try {
      await dispatchOrder(order.orderNumber);
      toast.success('Order dispatched to nearest riders');
      loadSupplementary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setDispatching(null);
    }
  }

  async function handleStatusChange(order: any, status: string) {
    try {
      await updateOrderStatus(order.id, status);
      toast.success('Status updated');
      loadSupplementary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    }
  }

  const activeOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const dispatchable = orders.filter((o) => ['PAID', 'CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH'].includes(o.status));
  const outForDelivery = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY');
  const onlineRiders = riders.filter((r) => r.isActive && r.isApproved);

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold text-white'>Delivery &amp; Rider Command Center</h2>

      <div className='flex flex-wrap gap-2'>
        {ZONES_TAB.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              subTab === id ? 'bg-emerald-500 text-black' : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            <Icon className='h-4 w-4' /> {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className='flex items-center gap-2 text-white/60'>
          <Loader2 className='h-5 w-5 animate-spin' /> Loading...
        </div>
      )}

      {subTab === 'overview' && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {[
            { label: 'Delivery zones', value: zones.length, color: 'text-emerald-300' },
            { label: 'Pricing rules', value: rules.length, color: 'text-blue-300' },
            { label: 'Online riders', value: onlineRiders.length, color: 'text-purple-300' },
            { label: 'Active orders', value: activeOrders.length, color: 'text-cyan-300' },
            { label: 'Ready for dispatch', value: dispatchable.length, color: 'text-yellow-300' },
            { label: 'Out for delivery', value: outForDelivery.length, color: 'text-orange-300' },
          ].map((s) => (
            <div key={s.label} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
              <p className='text-2xl font-black text-white'>{s.value}</p>
              <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {subTab === 'zones' && (
        <div className='space-y-6'>
          <form onSubmit={handleCreateZone} className='space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6'>
            <h3 className='text-lg font-semibold text-white'>Create zone</h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <input
                placeholder='Zone name'
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value as any)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              >
                <option value='CITY' className='bg-brand-900'>CITY</option>
                <option value='AREA' className='bg-brand-900'>AREA</option>
                <option value='RADIUS' className='bg-brand-900'>RADIUS</option>
                <option value='POLYGON' className='bg-brand-900'>POLYGON</option>
              </select>
            </div>
            <input
              placeholder='Fee in NGN'
              value={zoneFee}
              onChange={(e) => setZoneFee(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
            <input
              placeholder='Estimated minutes'
              value={zoneEst}
              onChange={(e) => setZoneEst(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
            <textarea
              placeholder={
                zoneType === 'CITY' || zoneType === 'AREA'
                  ? 'Comma-separated names'
                  : zoneType === 'RADIUS'
                  ? 'lat, lng, radiusMeters'
                  : 'One coordinate pair per line: lat, lng'
              }
              value={zoneRaw}
              onChange={(e) => setZoneRaw(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              rows={4}
            />
            <button type='submit' className='rounded-full bg-white px-6 py-2 font-bold text-black'>
              <Plus className='mr-1 inline h-4 w-4' /> Add zone
            </button>
          </form>

          <div className='space-y-3'>
            {zones.map((zone) => (
              <div
                key={zone.id}
                className='flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4'
              >
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='font-bold text-white'>{zone.name}</p>
                    <ZoneBadge type={zone.type} />
                  </div>
                  <p className='text-sm text-white/60'>Fee: {formatPrice(zone.feeKobo)} • {zone._count?.orders ?? 0} active orders</p>
                  <p className='text-xs text-white/40'>{JSON.stringify(zone.boundary)}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete this zone?')) return;
                    try {
                      await deleteDeliveryZone(zone.id);
                      onRefresh();
                      toast.success('Zone deleted');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Delete failed');
                    }
                  }}
                  className='rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'pricing' && (
        <div className='space-y-6'>
          <form onSubmit={handleCreateRule} className='space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6'>
            <h3 className='text-lg font-semibold text-white'>Create pricing rule</h3>
            <div className='grid gap-4 sm:grid-cols-2'>
              <select
                value={ruleZoneId}
                onChange={(e) => setRuleZoneId(e.target.value)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              >
                <option value='' className='bg-brand-900'>Select zone</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id} className='bg-brand-900'>
                    {z.name}
                  </option>
                ))}
              </select>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as any)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              >
                <option value='NEIGHBORHOOD' className='bg-brand-900'>NEIGHBORHOOD</option>
                <option value='PROFESSIONAL' className='bg-brand-900'>PROFESSIONAL</option>
              </select>
            </div>
            <div className='grid gap-4 sm:grid-cols-3'>
              <input
                placeholder='Base fee NGN'
                value={ruleBase}
                onChange={(e) => setRuleBase(e.target.value)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <input
                placeholder='Per-meter fee (kobo)'
                value={rulePerMeter}
                onChange={(e) => setRulePerMeter(e.target.value)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
              <input
                placeholder='Min order NGN'
                value={ruleMinOrder}
                onChange={(e) => setRuleMinOrder(e.target.value)}
                className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
              />
            </div>
            <input
              placeholder='Estimated minutes'
              value={ruleEst}
              onChange={(e) => setRuleEst(e.target.value)}
              className='w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            />
            <button type='submit' className='rounded-full bg-white px-6 py-2 font-bold text-black'>
              <Plus className='mr-1 inline h-4 w-4' /> Add rule
            </button>
          </form>

          <div className='space-y-3'>
            {rules.map((rule) => (
              <div
                key={rule.id}
                className='flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4'
              >
                <div>
                  <p className='font-bold text-white'>
                    {rule.zone?.name} • {rule.deliveryType}
                  </p>
                  <p className='text-sm text-white/60'>
                    Base {formatPrice(rule.baseFeeKobo)} • per m {rule.perMeterKobo} kobo • min {formatPrice(rule.minOrderKobo)} • {rule.estimatedMinutes ?? '-'} min
                  </p>
                  <p className='text-xs text-white/40'>{rule.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete this pricing rule?')) return;
                    try {
                      await deleteDeliveryPricingRule(rule.id);
                      loadRules();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Delete failed');
                    }
                  }}
                  className='rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'riders' && (
        <div className='space-y-3'>
          {riders.map((rider) => (
            <div
              key={rider.id}
              className='flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between'
            >
              <div>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4 text-emerald-300' />
                  <p className='font-bold text-white'>
                    {rider.user?.firstName || rider.user?.email} — {rider.vehicle || 'No vehicle'}
                  </p>
                </div>
                <p className='text-sm text-white/60'>
                  {rider.isApproved ? <CheckCircle className='mr-1 inline h-3 w-3 text-emerald-400' /> : <XCircle className='mr-1 inline h-3 w-3 text-red-400' />}
                  {rider.isApproved ? 'Approved' : 'Pending'} • {rider.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className='flex gap-2'>
                {!rider.isApproved && (
                  <button onClick={() => handleRiderAction(rider.id, 'approve')} className='rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-300'>
                    Approve
                  </button>
                )}
                {rider.isApproved && rider.isActive && (
                  <button onClick={() => handleRiderAction(rider.id, 'pause')} className='rounded-full bg-yellow-500/20 px-3 py-1.5 text-sm font-bold text-yellow-300'>
                    Pause
                  </button>
                )}
                {rider.isApproved && !rider.isActive && (
                  <button onClick={() => handleRiderAction(rider.id, 'restore')} className='rounded-full bg-blue-500/20 px-3 py-1.5 text-sm font-bold text-blue-300'>
                    Restore
                  </button>
                )}
                <button onClick={() => handleRiderAction(rider.id, 'ban')} className='rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300'>
                  Ban
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'live' && (
        <div className='space-y-4'>
          <MapView
            center={mapCenter}
            markers={[
              ...riderLocations.map((r) => ({ id: `r-${r.id}`, point: { lat: r.lat, lng: r.lng }, label: `Rider: ${r.name}` })),
              ...cookLocations.map((c) => ({ id: `c-${c.id}`, point: { lat: c.lat, lng: c.lng }, label: `Cook: ${c.name}` })),
            ]}
            height={400}
          />
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
              <p className='text-sm font-bold text-white'>{riderLocations.length} active rider locations</p>
              <p className='text-xs text-white/60'>Last update shown for approved, online riders</p>
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
              <p className='text-sm font-bold text-white'>{cookLocations.length} open kitchens</p>
              <p className='text-xs text-white/60'>Approved cooks with available listings</p>
            </div>
          </div>
        </div>
      )}

      {subTab === 'dispatch' && (
        <div className='space-y-4'>
          {dispatchable.map((order) => (
            <div
              key={order.id}
              className='rounded-2xl border border-white/10 bg-white/5 p-4'
            >
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <div className='flex items-center gap-2'>
                    <Package className='h-4 w-4 text-emerald-300' />
                    <p className='font-bold text-white'>{order.orderNumber}</p>
                    <span className='rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white'>{order.status}</span>
                  </div>
                  <p className='text-sm text-white/60'>
                    {order.address} • {formatPrice(order.totalKobo)} • {order.items?.length ?? 0} items
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => openAssign(order)}
                    className='rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300'
                  >
                    Assign
                  </button>
                  <button
                    onClick={() => handleDispatch(order)}
                    disabled={dispatching === order.id}
                    className='inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50'
                  >
                    {dispatching === order.id && <Loader2 className='h-4 w-4 animate-spin' />}
                    <Navigation className='h-4 w-4' /> Auto-dispatch
                  </button>
                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <button
                      onClick={() => handleStatusChange(order, 'DELIVERED')}
                      className='rounded-full bg-blue-500/20 px-4 py-2 text-sm font-bold text-blue-300'
                    >
                      Mark delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {dispatchable.length === 0 && !loading && (
            <div className='rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60'>
              <AlertCircle className='mx-auto mb-2 h-6 w-6' /> No orders ready for dispatch.
            </div>
          )}

          {assigning && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
              <div className='w-full max-w-lg rounded-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl'>
                <h3 className='text-xl font-bold text-white'>Assign rider</h3>
                <p className='text-sm text-white/60'>
                  {assigning.orderNumber} • {formatPrice(assigning.totalKobo)}
                </p>

                <div className='mt-4 max-h-48 space-y-2 overflow-y-auto'>
                  {eligible.map((rider) => (
                    <button
                      key={rider.id}
                      onClick={() => setRiderId(rider.id)}
                      className={`w-full rounded-xl p-2 text-left text-sm transition ${
                        riderId === rider.id ? 'bg-emerald-500/20 text-emerald-100' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <p className='font-medium'>
                        {rider.firstName || rider.email || rider.id} — {rider.vehicle || 'No vehicle'}
                      </p>
                      <p className='text-xs text-white/60'>
                        {Math.round(rider.distanceMeters ?? 0)}m • ~{rider.estimatedMinutes ?? 0} min
                      </p>
                    </button>
                  ))}
                </div>

                <input
                  placeholder='Rider fee NGN'
                  value={riderFee}
                  onChange={(e) => setRiderFee(e.target.value)}
                  className='mt-4 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                />

                <div className='mt-4 flex gap-2'>
                  <button onClick={() => setAssigning(null)} className='flex-1 rounded-full border border-white/20 py-2 text-white'>
                    Close
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={!riderId}
                    className='flex-1 rounded-full bg-emerald-500 py-2 font-bold text-black disabled:opacity-50'
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
