import { useEffect, useMemo, useState } from 'react';
import { Map, Users, CheckCircle, XCircle, Loader2, User, Phone, Search, Settings, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { MapView } from '../MapView';
import {
  approveRider,
  rejectRider,
  pauseRider,
  banRider,
  restoreRider,
  deleteRider,
  fetchRiderLocations,
  fetchCookLocations,
  fetchRiderOnboardingFieldsAdmin,
  createRiderOnboardingField,
  updateRiderOnboardingField,
  deleteRiderOnboardingField,
} from '../../lib/admin';

type SubTab = 'all' | 'pending' | 'live' | 'onboarding';

const TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'all', label: 'All Riders', icon: Users },
  { id: 'pending', label: 'Pending Approval', icon: CheckCircle },
  { id: 'live', label: 'Live Map', icon: Map },
  { id: 'onboarding', label: 'Onboarding Fields', icon: Settings },
];

export default function RidersTab({ riders, onRefresh }: { riders: any[]; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [riderLocations, setRiderLocations] = useState<any[]>([]);
  const [cookLocations, setCookLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [reviewRider, setReviewRider] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewTab, setReviewTab] = useState<'approve' | 'reject'>('approve');
  const [fields, setFields] = useState<any[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);

  useEffect(() => {
    if (subTab === 'live') {
      loadLocations();
    }
    if (subTab === 'onboarding') {
      loadOnboardingFields();
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

  async function loadOnboardingFields() {
    setFieldsLoading(true);
    try {
      const { fields } = await fetchRiderOnboardingFieldsAdmin();
      setFields(fields);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load onboarding fields');
    } finally {
      setFieldsLoading(false);
    }
  }

  async function handleReviewAction(id: string, action: 'approve' | 'reject') {
    setProcessing(`${action}:${id}`);
    try {
      if (action === 'approve') {
        await approveRider(id, reviewNote);
        toast.success('Rider approved');
      } else {
        await rejectRider(id, reviewNote);
        toast.success('Rider rejected');
      }
      setReviewRider(null);
      setReviewNote('');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(null);
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
                      onClick={() => { setReviewRider(rider); setReviewNote(''); setReviewTab('approve'); }}
                      className='rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-300'
                    >
                      Review
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

      {subTab === 'onboarding' && (
        <OnboardingFieldsPanel
          fields={fields}
          loading={fieldsLoading}
          onRefresh={loadOnboardingFields}
          editingField={editingField}
          setEditingField={setEditingField}
        />
      )}

      {reviewRider && (
        <ReviewModal
          rider={reviewRider}
          note={reviewNote}
          setNote={setReviewNote}
          tab={reviewTab}
          setTab={setReviewTab}
          processing={processing}
          onAction={handleReviewAction}
          onClose={() => { setReviewRider(null); setReviewNote(''); }}
        />
      )}
    </div>
  );
}

function OnboardingFieldsPanel({
  fields,
  loading,
  onRefresh,
  editingField,
  setEditingField,
}: {
  fields: any[];
  loading: boolean;
  onRefresh: () => void;
  editingField: any | null;
  setEditingField: (f: any) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  function startCreate() {
    setIsCreating(true);
    setForm({ key: '', label: '', type: 'text', required: false, active: true, order: 0, gatingRule: '', options: [] });
  }

  function startEdit(field: any) {
    setEditingField(field);
    setForm({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      active: field.active,
      order: field.order,
      gatingRule: field.gatingRule || '',
      options: (field.options || []).join(', '),
    });
  }

  function reset() {
    setIsCreating(false);
    setEditingField(null);
    setForm({});
  }

  async function save() {
    const payload = {
      ...form,
      required: Boolean(form.required),
      active: form.active !== false,
      order: Number(form.order) || 0,
      options: typeof form.options === 'string' ? form.options.split(',').map((s: string) => s.trim()).filter(Boolean) : form.options || [],
    };
    setSaving(true);
    try {
      if (editingField) {
        await updateRiderOnboardingField(editingField.id, payload);
        toast.success('Field updated');
      } else {
        await createRiderOnboardingField(payload);
        toast.success('Field created');
      }
      reset();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this onboarding field?')) return;
    try {
      await deleteRiderOnboardingField(id);
      onRefresh();
      toast.success('Field deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) return <Loader2 className='mx-auto h-8 w-8 animate-spin text-white/70' />;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-bold text-white'>Verification & reference fields</h3>
        {!isCreating && !editingField && (
          <button onClick={startCreate} className='inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400'>
            <Plus className='h-4 w-4' /> Add field
          </button>
        )}
      </div>

      {(isCreating || editingField) && (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <input value={form.key || ''} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder='Key' className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white' />
            <input value={form.label || ''} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder='Label' className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white' />
            <select value={form.type || 'text'} onChange={(e) => setForm({ ...form, type: e.target.value })} className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white'>
              {['text', 'textarea', 'select', 'number', 'checkbox', 'file', 'phone'].map((t) => (
                <option key={t} value={t} className='bg-brand-900'>{t}</option>
              ))}
            </select>
            <input type='number' value={form.order || 0} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} placeholder='Order' className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white' />
            <input value={form.gatingRule || ''} onChange={(e) => setForm({ ...form, gatingRule: e.target.value })} placeholder='Gating rule (e.g. country=Nigeria)' className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white' />
            <input value={typeof form.options === 'string' ? form.options : (form.options || []).join(', ')} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder='Options (comma separated)' className='rounded-2xl border border-white/20 bg-white/5 p-3 text-white' />
          </div>
          <div className='mt-3 flex flex-wrap items-center gap-4'>
            <label className='flex items-center gap-2 text-sm text-white/70'>
              <input type='checkbox' checked={!!form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /> Required
            </label>
            <label className='flex items-center gap-2 text-sm text-white/70'>
              <input type='checkbox' checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
            </label>
          </div>
          <div className='mt-4 flex gap-2'>
            <button onClick={save} disabled={saving} className='rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-50'>{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={reset} className='rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10'>Cancel</button>
          </div>
        </div>
      )}

      <div className='space-y-2'>
        {fields.map((f) => (
          <div key={f.id} className='flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4'>
            <div>
              <p className='font-bold text-white'>{f.label} <span className='text-xs font-normal text-white/50'>({f.key})</span></p>
              <p className='text-xs text-white/60'>{f.type} · {f.required ? 'required' : 'optional'} · {f.active ? 'active' : 'inactive'} {f.gatingRule ? `· gating: ${f.gatingRule}` : ''}</p>
            </div>
            <div className='flex gap-2'>
              <button onClick={() => startEdit(f)} className='rounded-full bg-white/10 p-2 text-white hover:bg-white/20' aria-label='Edit'><Edit2 className='h-4 w-4' /></button>
              <button onClick={() => remove(f.id)} className='rounded-full bg-red-500/20 p-2 text-red-300 hover:bg-red-500/30' aria-label='Delete'><Trash2 className='h-4 w-4' /></button>
            </div>
          </div>
        ))}
        {fields.length === 0 && !isCreating && <p className='text-sm text-white/60'>No onboarding fields configured.</p>}
      </div>
    </div>
  );
}

function ReviewModal({
  rider,
  note,
  setNote,
  tab,
  setTab,
  processing,
  onAction,
  onClose,
}: {
  rider: any;
  note: string;
  setNote: (s: string) => void;
  tab: 'approve' | 'reject';
  setTab: (t: 'approve' | 'reject') => void;
  processing: string | null;
  onAction: (id: string, action: 'approve' | 'reject') => void;
  onClose: () => void;
}) {
  const data = rider.onboardingData && typeof rider.onboardingData === 'object' ? rider.onboardingData : {};
  const fields = Object.entries(data).filter(([k]) => !k.startsWith('__'));

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4'>
      <div className='w-full max-w-lg rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:rounded-3xl'>
        <div className='flex items-center justify-between'>
          <h3 className='text-xl font-bold text-white'>Review rider application</h3>
          <button onClick={onClose} className='rounded-full p-2 text-white/70 hover:bg-white/10'><X className='h-5 w-5' /></button>
        </div>

        <div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80'>
          <p className='flex justify-between'><span className='text-white/50'>Name</span> {rider.user?.firstName || ''} {rider.user?.lastName || ''}</p>
          <p className='flex justify-between'><span className='text-white/50'>Email</span> {rider.user?.email}</p>
          <p className='flex justify-between'><span className='text-white/50'>Phone</span> {rider.user?.phone || '—'}</p>
          <p className='flex justify-between'><span className='text-white/50'>Vehicle</span> {rider.vehicle || '—'}</p>
          <p className='flex justify-between'><span className='text-white/50'>Mode</span> {rider.deliveryMode}</p>
          <p className='flex justify-between'><span className='text-white/50'>Area</span> {rider.operatingArea || '—'}</p>
          <p className='flex justify-between'><span className='text-white/50'>Radius</span> {rider.serviceRadiusMeters} m</p>
          {fields.map(([k, v]) => (
            <p key={k} className='flex justify-between'>
              <span className='text-white/50'>{k}</span>
              <span className='truncate max-w-[160px]'>{String(v)}</span>
            </p>
          ))}
        </div>

        <div className='mt-4 flex gap-2'>
          <button onClick={() => setTab('approve')} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${tab === 'approve' ? 'bg-emerald-500 text-black' : 'border border-white/20 text-white'}`}>Approve</button>
          <button onClick={() => setTab('reject')} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${tab === 'reject' ? 'bg-red-500 text-white' : 'border border-white/20 text-white'}`}>Reject</button>
        </div>

        <label className='mt-4 block text-sm text-white/70'>
          {tab === 'approve' ? 'Approval note (optional)' : 'Rejection reason (optional)'}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
            rows={3}
          />
        </label>

        <div className='mt-4 flex justify-end gap-2'>
          <button onClick={onClose} className='rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10'>Cancel</button>
          <button
            onClick={() => onAction(rider.id, tab)}
            disabled={!!processing}
            className={`rounded-full px-5 py-2 text-sm font-bold text-black ${tab === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-400'}`}
          >
            {processing === `${tab}:${rider.id}` ? <Loader2 className='h-4 w-4 animate-spin' /> : (tab === 'approve' ? 'Approve' : 'Reject')}
          </button>
        </div>
      </div>
    </div>
  );
}
