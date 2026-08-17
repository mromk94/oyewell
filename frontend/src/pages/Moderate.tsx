import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check, X, Loader2, AlertCircle, LogOut, Home, Utensils, ChefHat, Bike, MessageSquare, AlertTriangle, Inbox, Package } from 'lucide-react';
import { login as apiLogin, setCustomerToken, getCustomerToken, removeCustomerToken, fetchMe, type User, hasRole } from '../lib/api';
import { fetchModeratorMe, fetchModeratorDashboard, fetchModeratorTickets, updateModeratorTicket, fetchModeratorDisputes, updateModeratorDispute, fetchModeratorReports, updateModeratorReport, fetchModeratorCooks, decideCookApproval, fetchModeratorFoods, decideFoodApproval, fetchModeratorListings, decideListingApproval, fetchModeratorRiders, decideRiderApproval } from '../lib/moderator';
import ConfirmModal from '../components/ConfirmModal';
import Logo from '../components/Logo';
import ModeratorHierarchy from '../components/moderator/ModeratorHierarchy';

type Tab = 'dashboard' | 'pending' | 'open' | 'closed' | 'cooks' | 'foods' | 'moderators';

export default function Moderate() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');

  const [dashboard, setDashboard] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [cooks, setCooks] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function check() {
    const token = getCustomerToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await fetchMe();
      await fetchModeratorMe();
      if (!hasRole(user, 'MODERATOR')) throw new Error('Not a moderator');
      setCustomer(user);
    } catch (e) {
      setCustomer(null);
      removeCustomerToken();
      setError(e instanceof Error ? e.message : 'Moderator access required');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { check(); }, []);

  useEffect(() => {
    if (!customer) return;
    loadDashboard();
  }, [customer]);

  async function loadDashboard() {
    const data = await fetchModeratorDashboard();
    setDashboard(data);
  }

  async function loadPending() {
    const [t, d, r] = await Promise.all([
      fetchModeratorTickets('OPEN'),
      fetchModeratorDisputes('OPEN'),
      fetchModeratorReports('OPEN'),
    ]);
    setTickets(t.tickets);
    setDisputes(d.disputes);
    setReports(r.reports);
  }

  async function loadOpen() {
    const [t, d, r] = await Promise.all([
      fetchModeratorTickets('IN_PROGRESS'),
      fetchModeratorDisputes('UNDER_REVIEW'),
      fetchModeratorReports('UNDER_REVIEW'),
    ]);
    setTickets(t.tickets);
    setDisputes(d.disputes);
    setReports(r.reports);
  }

  async function loadClosed() {
    const [t, d, r] = await Promise.all([
      fetchModeratorTickets('RESOLVED'),
      fetchModeratorDisputes('RESOLVED'),
      fetchModeratorReports('RESOLVED'),
    ]);
    setTickets(t.tickets);
    setDisputes(d.disputes);
    setReports(r.reports);
  }

  async function loadApprovals() {
    const [c, f, l, ri] = await Promise.all([fetchModeratorCooks(), fetchModeratorFoods(), fetchModeratorListings(), fetchModeratorRiders()]);
    setCooks(c.cooks);
    setFoods(f.foods);
    setListings(l.listings);
    setRiders(ri.riders);
  }

  useEffect(() => {
    if (!customer) return;
    if (tab === 'pending') loadPending();
    if (tab === 'open') loadOpen();
    if (tab === 'closed') loadClosed();
    if (tab === 'cooks' || tab === 'foods') loadApprovals();
  }, [tab, customer]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      if (!res.token) throw new Error('Login failed');
      setCustomerToken(res.token);
      await check();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    removeCustomerToken();
    setCustomer(null);
    navigate('/');
  }

  if (loading) {
    return (
      <div className='flex h-screen w-full items-center justify-center bg-brand-900 text-white'>
        <Loader2 className='h-10 w-10 animate-spin' />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className='min-h-screen bg-brand-900 p-6 text-white'>
        <div className='mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8'>
          <div className='mb-6 flex items-center gap-3'>
            <Shield className='h-8 w-8 text-emerald-400' />
            <h1 className='text-2xl font-black'>Community Moderator</h1>
          </div>
          {error && (
            <div className='mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300'>
              <AlertCircle className='inline h-4 w-4' /> {error}
            </div>
          )}
          <form onSubmit={handleLogin} className='space-y-4'>
            <div>
              <label className='mb-1 block text-sm text-white/60'>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type='email' required className='w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400' />
            </div>
            <div>
              <label className='mb-1 block text-sm text-white/60'>Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type='password' required className='w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-emerald-400' />
            </div>
            <button type='submit' disabled={loading} className='w-full rounded-xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'>
              {loading ? <Loader2 className='mx-auto h-5 w-5 animate-spin' /> : 'Sign in to /moderate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-brand-900 text-white'>
      <header className='sticky top-0 z-30 border-b border-white/10 bg-brand-900/95 px-4 py-4 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-6xl items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Logo />
            <h1 className='text-lg font-black'>Moderator Portal</h1>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-white/60'>{customer.email}</span>
            <button onClick={() => navigate('/')} className='rounded-full bg-white/10 p-2 hover:bg-white/20'>
              <Home className='h-4 w-4' />
            </button>
            <button onClick={logout} className='rounded-full bg-white/10 p-2 hover:bg-white/20'>
              <LogOut className='h-4 w-4' />
            </button>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-6xl p-4'>
        <div className='mb-4 flex flex-wrap gap-2'>
          {(['dashboard', 'pending', 'open', 'closed', 'cooks', 'foods', 'moderators'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${tab === t ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
            >
              {t === 'dashboard' && 'Dashboard'}
              {t === 'pending' && 'Pending issues'}
              {t === 'open' && 'Open issues'}
              {t === 'closed' && 'Closed issues'}
              {t === 'cooks' && 'Cook approvals'}
              {t === 'foods' && 'Food approvals'}
              {t === 'moderators' && 'Moderators'}
            </button>
          ))}
        </div>

        {error && (
          <div className='mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300'>
            <AlertCircle className='inline h-4 w-4' /> {error}
          </div>
        )}

        {tab === 'dashboard' && dashboard && <Dashboard dashboard={dashboard} />}
        {tab === 'pending' && <IssueList tickets={tickets} disputes={disputes} reports={reports} onError={setError} onRefresh={loadPending} />}
        {tab === 'open' && <IssueList tickets={tickets} disputes={disputes} reports={reports} onError={setError} onRefresh={loadOpen} />}
        {tab === 'closed' && <IssueList tickets={tickets} disputes={disputes} reports={reports} onError={setError} onRefresh={loadClosed} />}
        {tab === 'cooks' && <ApprovalList cooks={cooks} listings={listings} riders={riders} type='cooks' onError={setError} onRefresh={loadApprovals} />}
        {tab === 'foods' && <ApprovalList cooks={cooks} listings={listings} riders={riders} foods={foods} type='foods' onError={setError} onRefresh={loadApprovals} />}
        {tab === 'moderators' && <ModeratorHierarchy onError={setError} />}
      </main>
    </div>
  );
}

function Dashboard({ dashboard }: { dashboard: any }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      <StatCard icon={Inbox} label='Open tickets' value={dashboard.tickets?.open ?? 0} sub={dashboard.tickets?.inProgress ?? 0} subLabel='in progress' />
      <StatCard icon={AlertTriangle} label='Under review disputes' value={dashboard.disputes?.underReview ?? 0} sub={dashboard.disputes?.open ?? 0} subLabel='new' />
      <StatCard icon={MessageSquare} label='Open reports' value={dashboard.reports?.open ?? 0} sub={dashboard.reports?.underReview ?? 0} subLabel='under review' />
      <StatCard icon={ChefHat} label='Pending cooks' value={dashboard.approvals?.pendingCooks ?? 0} />
      <StatCard icon={Utensils} label='Pending foods' value={dashboard.approvals?.pendingFoods ?? 0} />
      <StatCard icon={Package} label='Pending listings' value={dashboard.approvals?.pendingListings ?? 0} />
      <StatCard icon={Bike} label='Pending riders' value={dashboard.approvals?.pendingRiders ?? 0} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, subLabel }: { icon: any; label: string; value: number; sub?: number; subLabel?: string }) {
  return (
    <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
      <div className='mb-3 flex items-center gap-2 text-emerald-400'>
        <Icon className='h-5 w-5' />
        <span className='text-sm font-bold'>{label}</span>
      </div>
      <div className='text-3xl font-black'>{value}</div>
      {sub !== undefined && <div className='mt-1 text-xs text-white/50'>{sub} {subLabel}</div>}
    </div>
  );
}

function IssueList({ tickets, disputes, reports, onError, onRefresh }: { tickets: any[]; disputes: any[]; reports: any[]; onError: (e: string) => void; onRefresh: () => void }) {
  return (
    <div className='space-y-4'>
      <Section title='Tickets' items={tickets} render={(t) => <TicketRow key={t.id} ticket={t} onError={onError} onRefresh={onRefresh} />} />
      <Section title='Disputes' items={disputes} render={(d) => <DisputeRow key={d.id} dispute={d} onError={onError} onRefresh={onRefresh} />} />
      <Section title='Reports' items={reports} render={(r) => <ReportRow key={r.id} report={r} onError={onError} onRefresh={onRefresh} />} />
    </div>
  );
}

function Section({ title, items, render }: { title: string; items: any[]; render: (i: any) => JSX.Element }) {
  if (!items.length) return null;
  return (
    <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
      <h2 className='mb-3 flex items-center gap-2 text-lg font-bold'>{title} <span className='rounded-full bg-white/10 px-2 py-0.5 text-xs'>{items.length}</span></h2>
      <div className='divide-y divide-white/10'>{items.map(render)}</div>
    </div>
  );
}

function TicketRow({ ticket, onError, onRefresh }: { ticket: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [resolution, setResolution] = useState(ticket.resolution ?? '');
  const [busy, setBusy] = useState(false);

  async function update() {
    setBusy(true);
    try {
      await updateModeratorTicket(ticket.id, { status, resolution });
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <Package className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{ticket.ticketNumber}</span>
        <StatusBadge status={ticket.status} />
      </div>
      <p className='text-sm text-white/70'>{ticket.subject}</p>
      <div className='mt-3 grid gap-2 sm:grid-cols-3'>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white'>
          <option value='OPEN'>Open</option>
          <option value='IN_PROGRESS'>In progress</option>
          <option value='WAITING_CUSTOMER'>Waiting customer</option>
          <option value='RESOLVED'>Resolved</option>
          <option value='CLOSED'>Closed</option>
        </select>
        <input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder='Resolution note' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2' />
      </div>
      <button onClick={update} disabled={busy} className='mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'>
        {busy ? <Loader2 className='h-3 w-3 animate-spin' /> : <Check className='h-3 w-3' />} Update
      </button>
    </div>
  );
}

function DisputeRow({ dispute, onError, onRefresh }: { dispute: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [status, setStatus] = useState(dispute.status);
  const [resolution, setResolution] = useState(dispute.resolution ?? '');
  const [refund, setRefund] = useState(dispute.refundKobo ? dispute.refundKobo / 100 : '');
  const [busy, setBusy] = useState(false);

  async function update() {
    setBusy(true);
    try {
      await updateModeratorDispute(dispute.id, { status, resolution, refundKobo: refund ? Number(refund) * 100 : undefined });
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <AlertTriangle className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{dispute.disputeNumber}</span>
        <StatusBadge status={dispute.status} />
      </div>
      <p className='text-sm text-white/70'>{dispute.type} <span className='text-white/40'>• {dispute.description}</span></p>
      <div className='mt-3 grid gap-2 sm:grid-cols-4'>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white'>
          <option value='OPEN'>Open</option>
          <option value='UNDER_REVIEW'>Under review</option>
          <option value='WAITING_FOR_CUSTOMER'>Waiting customer</option>
          <option value='WAITING_FOR_PROVIDER'>Waiting provider</option>
          <option value='RESOLVED'>Resolved</option>
          <option value='CLOSED'>Closed</option>
        </select>
        <input type='number' value={refund} onChange={(e) => setRefund(e.target.value)} placeholder='Refund (₦)' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white' />
        <input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder='Resolution note' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2' />
      </div>
      <button onClick={update} disabled={busy} className='mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'>
        {busy ? <Loader2 className='h-3 w-3 animate-spin' /> : <Check className='h-3 w-3' />} Update
      </button>
    </div>
  );
}

function ReportRow({ report, onError, onRefresh }: { report: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [status, setStatus] = useState(report.status);
  const [resolution, setResolution] = useState(report.resolution ?? '');
  const [busy, setBusy] = useState(false);

  async function update() {
    setBusy(true);
    try {
      await updateModeratorReport(report.id, { status, resolution });
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <MessageSquare className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{report.targetType}</span>
        <StatusBadge status={report.status} />
      </div>
      <p className='text-sm text-white/70'>{report.reason}</p>
      <p className='text-xs text-white/40'>{report.details}</p>
      <div className='mt-3 grid gap-2 sm:grid-cols-3'>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white'>
          <option value='OPEN'>Open</option>
          <option value='UNDER_REVIEW'>Under review</option>
          <option value='RESOLVED'>Resolved</option>
          <option value='DISMISSED'>Dismissed</option>
          <option value='ESCALATED'>Escalated</option>
        </select>
        <input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder='Resolution note' className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2' />
      </div>
      <button onClick={update} disabled={busy} className='mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'>
        {busy ? <Loader2 className='h-3 w-3 animate-spin' /> : <Check className='h-3 w-3' />} Update
      </button>
    </div>
  );
}

function ApprovalList({ cooks, listings, riders, foods, type, onError, onRefresh }: { cooks?: any[]; listings?: any[]; riders?: any[]; foods?: any[]; type: 'cooks' | 'foods'; onError: (e: string) => void; onRefresh: () => void }) {
  return (
    <div className='space-y-4'>
      {type === 'cooks' && (
        <>
          <Section title='Cooks' items={cooks ?? []} render={(c) => <CookRow key={c.id} cook={c} onError={onError} onRefresh={onRefresh} />} />
          <Section title='Riders' items={riders ?? []} render={(r) => <RiderRow key={r.id} rider={r} onError={onError} onRefresh={onRefresh} />} />
        </>
      )}
      {type === 'foods' && (
        <>
          <Section title='Foods' items={foods ?? []} render={(f) => <FoodRow key={f.id} food={f} onError={onError} onRefresh={onRefresh} />} />
          <Section title='Cook listings' items={listings ?? []} render={(l) => <ListingRow key={l.id} listing={l} onError={onError} onRefresh={onRefresh} />} />
        </>
      )}
    </div>
  );
}

function CookRow({ cook, onError, onRefresh }: { cook: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await decideCookApproval(cook.id, action);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <ChefHat className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{cook.user?.firstName} {cook.user?.lastName}</span>
        <StatusBadge status={cook.profileStatus} />
      </div>
      <p className='text-sm text-white/60'>{cook.user?.email}</p>
      <div className='mt-2 flex gap-2'>
        <button onClick={() => setConfirm('approve')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'><Check className='h-3 w-3' /> Approve</button>
        <button onClick={() => setConfirm('reject')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50'><X className='h-3 w-3' /> Reject</button>
      </div>
      {confirm && (
        <ConfirmModal
          open={!!confirm}
          title={confirm === 'approve' ? 'Approve' : 'Reject'}
          message={confirm === 'approve' ? 'Are you sure you want to approve this?' : 'Are you sure you want to reject this?'}
          confirmLabel={confirm === 'approve' ? 'Approve' : 'Reject'}
          danger={confirm === 'reject'}
          onConfirm={() => {
            const action = confirm;
            setConfirm(null);
            if (action) act(action);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function RiderRow({ rider, onError, onRefresh }: { rider: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await decideRiderApproval(rider.id, action);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <Bike className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{rider.user?.firstName} {rider.user?.lastName}</span>
      </div>
      <p className='text-sm text-white/60'>{rider.vehicle} • {rider.operatingArea}</p>
      <div className='mt-2 flex gap-2'>
        <button onClick={() => setConfirm('approve')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'><Check className='h-3 w-3' /> Approve</button>
        <button onClick={() => setConfirm('reject')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50'><X className='h-3 w-3' /> Reject</button>
      </div>
      {confirm && (
        <ConfirmModal
          open={!!confirm}
          title={confirm === 'approve' ? 'Approve' : 'Reject'}
          message={confirm === 'approve' ? 'Are you sure you want to approve this?' : 'Are you sure you want to reject this?'}
          confirmLabel={confirm === 'approve' ? 'Approve' : 'Reject'}
          danger={confirm === 'reject'}
          onConfirm={() => {
            const action = confirm;
            setConfirm(null);
            if (action) act(action);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function FoodRow({ food, onError, onRefresh }: { food: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await decideFoodApproval(food.id, action);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <Utensils className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{food.name}</span>
      </div>
      <p className='text-sm text-white/60'>{food.description}</p>
      <div className='mt-2 flex gap-2'>
        <button onClick={() => setConfirm('approve')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'><Check className='h-3 w-3' /> Approve</button>
        <button onClick={() => setConfirm('reject')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50'><X className='h-3 w-3' /> Reject</button>
      </div>
      {confirm && (
        <ConfirmModal
          open={!!confirm}
          title={confirm === 'approve' ? 'Approve' : 'Reject'}
          message={confirm === 'approve' ? 'Are you sure you want to approve this?' : 'Are you sure you want to reject this?'}
          confirmLabel={confirm === 'approve' ? 'Approve' : 'Reject'}
          danger={confirm === 'reject'}
          onConfirm={() => {
            const action = confirm;
            setConfirm(null);
            if (action) act(action);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ListingRow({ listing, onError, onRefresh }: { listing: any; onError: (e: string) => void; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      await decideListingApproval(listing.id, action);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className='py-4'>
      <div className='mb-1 flex items-center gap-2'>
        <Package className='h-4 w-4 text-white/50' />
        <span className='font-semibold'>{listing.title}</span>
      </div>
      <p className='text-sm text-white/60'>{listing.description}</p>
      <div className='mt-2 flex gap-2'>
        <button onClick={() => setConfirm('approve')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50'><Check className='h-3 w-3' /> Approve</button>
        <button onClick={() => setConfirm('reject')} disabled={busy} className='inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50'><X className='h-3 w-3' /> Reject</button>
      </div>
      {confirm && (
        <ConfirmModal
          open={!!confirm}
          title={confirm === 'approve' ? 'Approve' : 'Reject'}
          message={confirm === 'approve' ? 'Are you sure you want to approve this?' : 'Are you sure you want to reject this?'}
          confirmLabel={confirm === 'approve' ? 'Approve' : 'Reject'}
          danger={confirm === 'reject'}
          onConfirm={() => {
            const action = confirm;
            setConfirm(null);
            if (action) act(action);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-yellow-500/20 text-yellow-300',
    IN_PROGRESS: 'bg-blue-500/20 text-blue-300',
    UNDER_REVIEW: 'bg-blue-500/20 text-blue-300',
    RESOLVED: 'bg-emerald-500/20 text-emerald-300',
    CLOSED: 'bg-white/10 text-white/50',
    DISMISSED: 'bg-white/10 text-white/50',
    ESCALATED: 'bg-red-500/20 text-red-300',
    PENDING_APPROVAL: 'bg-yellow-500/20 text-yellow-300',
    APPROVED: 'bg-emerald-500/20 text-emerald-300',
    REJECTED: 'bg-red-500/20 text-red-300',
  };
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${colors[status] ?? 'bg-white/10'}`}>{status.replace(/_/g, ' ')}</span>;
}
