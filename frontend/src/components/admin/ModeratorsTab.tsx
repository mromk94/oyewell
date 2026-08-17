import { useEffect, useState } from 'react';
import { Shield, Plus, Loader2, MapPin, Trash } from 'lucide-react';
import { fetchModerators, createModerator, updateModerator, deleteModerator, addModeratorArea, type ModeratorRecord } from '../../lib/moderatorAdmin';

export default function ModeratorsTab() {
  const [moderators, setModerators] = useState<ModeratorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', employeeId: '', department: '' });
  const [temp, setTemp] = useState<string | null>(null);
  const [areaForm, setAreaForm] = useState<{ employeeId: string; country: string; region: string; city: string; district: string; area: string } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModerators();
      setModerators(data.moderators);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load moderators');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await createModerator(form);
      setTemp(res.tempPassword ?? null);
      setForm({ email: '', firstName: '', lastName: '', employeeId: '', department: '' });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create moderator');
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      await updateModerator(id, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this moderator?')) return;
    try {
      await deleteModerator(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function submitArea(e: React.FormEvent) {
    e.preventDefault();
    if (!areaForm) return;
    setError(null);
    try {
      await addModeratorArea(areaForm.employeeId, {
        scope: areaForm.area ? 'COMMUNITY' : areaForm.district ? 'DISTRICT' : areaForm.city ? 'CITY' : 'GLOBAL',
        country: areaForm.country || undefined,
        region: areaForm.region || undefined,
        city: areaForm.city || undefined,
        district: areaForm.district || undefined,
        area: areaForm.area || undefined,
      });
      setAreaForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add area');
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-black text-white'>Community Moderators</h2>
        <button onClick={() => setShowForm(true)} className='inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-400'>
          <Plus className='h-4 w-4' /> Add moderator
        </button>
      </div>

      {error && <div className='rounded-xl bg-red-500/10 p-3 text-sm text-red-300'>{error}</div>}
      {temp && (
        <div className='rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300'>
          Moderator created. Temporary password: <strong>{temp}</strong>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className='grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2'>
          <input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder='Email' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder='First name' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder='Last name' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
          <input required value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder='Employee ID' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder='Department' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white sm:col-span-2' />
          <div className='flex gap-2 sm:col-span-2'>
            <button type='submit' className='rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white'>Create</button>
            <button onClick={() => setShowForm(false)} className='rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white'>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <Loader2 className='h-6 w-6 animate-spin text-white/50' />
      ) : (
        <div className='divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5'>
          {moderators.map((m) => (
            <div key={m.id} className='p-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex items-start gap-3'>
                  <div className='rounded-full bg-emerald-500/10 p-2'>
                    <Shield className='h-5 w-5 text-emerald-400' />
                  </div>
                  <div>
                    <p className='font-bold text-white'>{m.user.firstName} {m.user.lastName}</p>
                    <p className='text-sm text-white/60'>{m.user.email}</p>
                    <p className='text-xs text-white/40'>{m.employeeId} • {m.department || 'No department'}</p>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {m.areas.map((a) => (
                        <span key={a.id} className='inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70'>
                          <MapPin className='h-3 w-3' /> {a.scope} {a.city || a.district || a.area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <select value={m.status} onChange={(e) => setStatus(m.id, e.target.value)} className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white'>
                    <option value='ACTIVE'>Active</option>
                    <option value='INACTIVE'>Inactive</option>
                    <option value='SUSPENDED'>Suspended</option>
                    <option value='INVITED'>Invited</option>
                  </select>
                  <button onClick={() => setAreaForm({ employeeId: m.id, country: '', region: '', city: '', district: '', area: '' })} className='rounded-lg bg-white/10 p-2 text-white/70 hover:bg-white/20' title='Add area'>
                    <MapPin className='h-4 w-4' />
                  </button>
                  <button onClick={() => remove(m.id)} className='rounded-lg bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20' title='Remove'>
                    <Trash className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!moderators.length && <p className='p-4 text-sm text-white/50'>No community moderators yet.</p>}
        </div>
      )}

      {areaForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <form onSubmit={submitArea} className='w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-brand-900 p-5'>
            <h3 className='font-bold text-white'>Add moderation area</h3>
            <input value={areaForm.country} onChange={(e) => setAreaForm({ ...areaForm, country: e.target.value })} placeholder='Country' className='w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
            <input value={areaForm.region} onChange={(e) => setAreaForm({ ...areaForm, region: e.target.value })} placeholder='Region/State' className='w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
            <input value={areaForm.city} onChange={(e) => setAreaForm({ ...areaForm, city: e.target.value })} placeholder='City' className='w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
            <input value={areaForm.district} onChange={(e) => setAreaForm({ ...areaForm, district: e.target.value })} placeholder='District/LGA' className='w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
            <input value={areaForm.area} onChange={(e) => setAreaForm({ ...areaForm, area: e.target.value })} placeholder='Area/Neighborhood' className='w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white' />
            <div className='flex gap-2'>
              <button type='submit' className='rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white'>Save area</button>
              <button onClick={() => setAreaForm(null)} className='rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white'>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
