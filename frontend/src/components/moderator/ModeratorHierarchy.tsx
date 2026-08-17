import { useEffect, useState } from 'react';
import { Shield, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { fetchHierarchyModerators, requestModeratorAction, fetchModeratorActionRequests, resolveModeratorAction, type HierarchyModerator, type ActionRequest } from '../../lib/moderatorHierarchy';
import ConfirmModal from '../ConfirmModal';

export default function ModeratorHierarchy({ onError }: { onError: (e: string) => void }) {
  const [moderators, setModerators] = useState<HierarchyModerator[]>([]);
  const [actions, setActions] = useState<ActionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'SUSPEND' | 'INACTIVE' | 'DELETE' | 'BAN' } | null>(null);
  const [resolve, setResolve] = useState<{ id: string; decision: 'approve' | 'reject' } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([fetchHierarchyModerators(), fetchModeratorActionRequests()]);
      setModerators(m.moderators);
      setActions(a.actions);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function doRequest(id: string, action: 'SUSPEND' | 'INACTIVE' | 'DELETE' | 'BAN') {
    setBusy(id + action);
    try {
      await requestModeratorAction(id, action);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  async function doResolve(id: string, decision: 'approve' | 'reject') {
    setBusy(id + decision);
    try {
      await resolveModeratorAction(id, decision);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Resolve failed');
    } finally {
      setBusy(null);
      setResolve(null);
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='flex items-center gap-2 text-lg font-black text-white'><Shield className='h-5 w-5 text-emerald-400' /> Lesser moderators</h3>
        <p className='text-sm text-white/60'>Request actions on moderators in regions below your tier.</p>
      </div>

      {loading ? (
        <Loader2 className='h-6 w-6 animate-spin text-white/50' />
      ) : (
        <div className='divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5'>
          {moderators.map((m) => (
            <div key={m.id} className='p-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-bold text-white'>{m.user.firstName} {m.user.lastName}</p>
                  <p className='text-sm text-white/60'>{m.user.email}</p>
                  <p className='text-xs text-white/40'>{m.employeeId} • {m.status}</p>
                  {m.region && <p className='text-xs text-emerald-300'>{m.region.type}: {m.region.name}</p>}
                </div>
                <div className='flex flex-wrap gap-2'>
                  {(['INACTIVE', 'SUSPEND', 'BAN', 'DELETE'] as const).map((action) => (
                    <button
                      key={action}
                      onClick={() => setConfirm({ id: m.id, action })}
                      disabled={!!busy}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition ${
                        action === 'DELETE' ? 'bg-red-500 hover:bg-red-400' : 'bg-white/10 hover:bg-white/20'
                      } disabled:opacity-50`}
                    >
                      {busy === m.id + action ? <Loader2 className='h-3 w-3 animate-spin' /> : action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {!moderators.length && <p className='p-4 text-sm text-white/50'>No lesser moderators in your region.</p>}
        </div>
      )}

      <div>
        <h3 className='flex items-center gap-2 text-lg font-black text-white'><AlertTriangle className='h-5 w-5 text-yellow-400' /> Pending actions for your review</h3>
        <p className='text-sm text-white/60'>Approve or reject actions requested by lower-tier moderators.</p>
      </div>

      {loading ? null : (
        <div className='divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5'>
          {actions.map((a) => (
            <div key={a.id} className='p-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-bold text-white'>{a.data.action} {a.targetType.toLowerCase().replace(/_/g, ' ')}</p>
                  <p className='text-sm text-white/60'>{a.target?.user?.email}</p>
                  <p className='text-xs text-white/40'>{new Date(a.submittedAt).toLocaleString()}</p>
                  {a.note && <p className='text-xs text-white/50'>{a.note}</p>}
                </div>
                <div className='flex gap-2'>
                  <button onClick={() => setResolve({ id: a.id, decision: 'approve' })} className='rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400'>
                    <Check className='h-3 w-3' />
                  </button>
                  <button onClick={() => setResolve({ id: a.id, decision: 'reject' })} className='rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-400'>
                    <X className='h-3 w-3' />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!actions.length && <p className='p-4 text-sm text-white/50'>No pending action requests.</p>}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          open
          title='Request moderator action'
          message={`Request ${confirm.action.toLowerCase()} for this moderator? A higher-tier moderator or admin will review it.`}
          confirmLabel='Request'
          danger
          onConfirm={() => doRequest(confirm.id, confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {resolve && (
        <ConfirmModal
          open
          title={`${resolve.decision === 'approve' ? 'Approve' : 'Reject'} action`}
          message={`Are you sure you want to ${resolve.decision} this request?`}
          confirmLabel={resolve.decision === 'approve' ? 'Approve' : 'Reject'}
          danger={resolve.decision === 'reject'}
          onConfirm={() => doResolve(resolve.id, resolve.decision)}
          onCancel={() => setResolve(null)}
        />
      )}
    </div>
  );
}
