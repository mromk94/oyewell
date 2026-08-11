import { useEffect, useMemo, useState } from 'react';
import { Map, Users, CheckCircle, XCircle, Loader2, User, Phone, Search } from 'lucide-react';
import { toast } from '../../lib/toast';
import { MapView } from '../MapView';
import {
  approveRider,
  pauseRider,
  banRider,
  restoreRider,
  deleteRider,
  fetchRiderLocations,
  fetchCookLocations,
} from '../../lib/admin';

type SubTab = 'all' | 'pending' | 'live';

const TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'all', label: 'All Riders', icon: Users },
  { id: 'pending', label: 'Pending Approval', icon: CheckCircle },
  { id: 'live', label: 'Live Map', icon: Map },
];

export default function RidersTab({ riders, onRefresh }: { riders: any[]; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [riderLocations, setRiderLocations] = useState<any[]>([]);
  const [cookLocations, setCookLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (subTab === 'live') {
      loadLocations();
    }
  }, [subTab]);

  async function loadLocations() {
    setLoadingLocations(true);
    try {
      const [riderData, cookData] = await Promise.all([fetchRiderLocations(), fetchCookLocations()]);
      setRiderLocations(riderData.riders);
      setCookLocations(cookData.cooks);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  }

  async function action(id: string, fn: (id: string) => Promise<any>, label: string) {
    if (!window.confirm(`${label} this rider?`)) return;
    setProcessing(`${label}:${id}`);
    try {
      await fn(id);
      onRefresh();
      toast.success(`Rider ${label.toLowerCase()}ed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rider action failed');
    } finally {
      setProcessing(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = riders;
    if (subTab === 'pending') {
      list = riders.filter((r) => !r.isApproved);
    }
    if (!q) return list;
    return list.filter(
      (r) =>
        r.user?.firstName?.toLowerCase().includes(q) ||
        r.user?.lastName?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.user?.phone?.toLowerCase().includes(q) ||
        r.vehicle?.toLowerCase().includes(q)
    );
  }, [riders, query, subTab]);

  const mapCenter = useMemo(() => {
    if (riderLocations.length > 0) return { lat: riderLocations[0].lat, lng: riderLocations[0].lng };
    if (cookLocations.length > 0) return { lat: cookLocations[0].lat, lng: cookLocations[0].lng };
    return { lat: 6.5244, lng: 3.3792 };
  }, [riderLocations, cookLocations]);

  const onlineCount = riders.filter((r) => r.isApproved && r.isActive).length;
  const pendingCount = riders.filter((r) => !r.isApproved).length;

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold text-white'>Rider Command Center</h2>

      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-2xl font-black text-white'>{riders.length}</p>
          <p className='text-sm font-medium text-white/60'>Total riders</p>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-2xl font-black text-emerald-300'>{onlineCount}</p>
          <p className='text-sm font-medium text-white/60'>Approved &amp; active</p>
        </div>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <p className='text-2xl font-black text-yellow-300'>{pendingCount}</p>
          <p className='text-sm font-medium text-white/60'>Pending approval</p>
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        {TABS.map(({ id, label, icon: Icon }) => (
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

      {(subTab === 'all' || subTab === 'pending') && (
        <div className='space-y-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40' />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search riders...'
              className='w-full rounded-2xl border border-white/20 bg-white/5 py-2.5 pl-10 pr-4 text-white'
            />
          </div>

          <div className='space-y-3'>
            {filtered.map((rider) => (
              <div
                key={rider.id}
                className='rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex sm:items-center sm:justify-between'
              >
                <div>
                  <div className='flex items-center gap-2'>
                    <User className='h-4 w-4 text-emerald-300' />
                    <p className='font-bold text-white'>
                      {rider.user?.firstName || rider.user?.lastName
                        ? `${rider.user?.firstName ?? ''} ${rider.user?.lastName ?? ''}`.trim()
                        : rider.user?.email}{' '}
                      — {rider.vehicle || 'No vehicle'}
                    </p>
                  </div>
                  <div className='mt-1 flex flex-wrap gap-2 text-xs text-white/60'>
                    <span className='flex items-center gap-1'>
                      <Phone className='h-3 w-3' /> {rider.user?.phone || '-'}
                    </span>
                    <span className='rounded-full bg-white/10 px-2 py-0.5'>{rider.user?.email}</span>
                    {rider.isApproved ? (
                      <span className='flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300'>
                        <CheckCircle className='h-3 w-3' /> Approved
                      </span>
                    ) : (
                      <span className='flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-yellow-300'>
                        <XCircle className='h-3 w-3' /> Pending
                      </span>
                    )}
                    {rider.isActive ? (
                      <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300'>Active</span>
                    ) : (
                      <span className='rounded-full bg-red-500/10 px-2 py-0.5 text-red-300'>Inactive</span>
                    )}
                  </div>
                </div>
                <div className='mt-3 flex flex-wrap gap-2 sm:mt-0'>
                  {!rider.isApproved && (
                    <button
                      onClick={() => action(rider.id, approveRider, 'Approve')}
                      disabled={processing === `Approve:${rider.id}`}
                      className='rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-300 disabled:opacity-50'
                    >
                      {processing === `Approve:${rider.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Approve'}
                    </button>
                  )}
                  {rider.isApproved && rider.isActive && (
                    <button
                      onClick={() => action(rider.id, pauseRider, 'Pause')}
                      disabled={processing === `Pause:${rider.id}`}
                      className='rounded-full bg-yellow-500/20 px-3 py-1.5 text-sm font-bold text-yellow-300 disabled:opacity-50'
                    >
                      {processing === `Pause:${rider.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Pause'}
                    </button>
                  )}
                  {rider.isApproved && !rider.isActive && (
                    <button
                      onClick={() => action(rider.id, restoreRider, 'Restore')}
                      disabled={processing === `Restore:${rider.id}`}
                      className='rounded-full bg-blue-500/20 px-3 py-1.5 text-sm font-bold text-blue-300 disabled:opacity-50'
                    >
                      {processing === `Restore:${rider.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Restore'}
                    </button>
                  )}
                  <button
                    onClick={() => action(rider.id, banRider, 'Ban')}
                    disabled={processing === `Ban:${rider.id}`}
                    className='rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300 disabled:opacity-50'
                  >
                    {processing === `Ban:${rider.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Ban'}
                  </button>
                  <button
                    onClick={() => action(rider.id, deleteRider, 'Delete')}
                    disabled={processing === `Delete:${rider.id}`}
                    className='rounded-full bg-red-500 px-3 py-1.5 text-sm font-bold text-black disabled:opacity-50'
                  >
                    {processing === `Delete:${rider.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className='text-center text-sm text-white/60'>No riders match.</p>
            )}
          </div>
        </div>
      )}

      {subTab === 'live' && (
        <div className='space-y-4'>
          {loadingLocations && (
            <div className='flex items-center gap-2 text-white/60'>
              <Loader2 className='h-5 w-5 animate-spin' /> Loading map...
            </div>
          )}
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
            </div>
            <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
              <p className='text-sm font-bold text-white'>{cookLocations.length} open kitchens</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
