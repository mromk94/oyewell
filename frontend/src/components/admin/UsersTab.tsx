import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  Bike,
  ChefHat,
  Search,
  X,
  ShoppingBag,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Wallet,
  MapPin,
  AlertTriangle,
  Slash,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatPrice } from '../../lib/api';
import { toast } from '../../lib/toast';
import {
  updateCustomerRole,
  fetchCustomerOrders,
  fetchCustomerAudit,
  searchCustomers,
  banCustomer,
  suspendCustomer,
  activateCustomer,
  adjustCustomerBalance,
  deleteCustomer,
} from '../../lib/admin';

type SubTab = 'all' | 'customers' | 'admins' | 'riders' | 'cooks' | 'banned' | 'suspended';

const TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Users },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'riders', label: 'Riders', icon: Bike },
  { id: 'cooks', label: 'Cooks', icon: ChefHat },
  { id: 'banned', label: 'Banned', icon: Slash },
  { id: 'suspended', label: 'Suspended', icon: AlertTriangle },
];

const PAGE = 20;

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const status = useMemo(() => {
    if (subTab === 'banned') return 'banned';
    if (subTab === 'suspended') return 'suspended';
    return subTab === 'all' ? undefined : 'active';
  }, [subTab]);

  const role = useMemo(() => {
    if (subTab === 'customers') return 'CUSTOMER';
    if (subTab === 'admins') return 'ADMIN';
    if (subTab === 'riders') return 'RIDER';
    if (subTab === 'cooks') return 'COOK';
    return undefined;
  }, [subTab]);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const params: any = { skip: offset, limit: PAGE };
      if (debouncedQuery) params.q = debouncedQuery;
      if (role) params.role = role;
      if (status) params.status = status;
      const data = await searchCustomers(params);
      setUsers(data.customers);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, role, status]);

  useEffect(() => {
    setSkip(0);
    load(0);
  }, [load]);

  const isToday = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((c) => c.role === 'ADMIN').length;
    const riders = users.filter((c) => c.role === 'RIDER').length;
    const cooks = users.filter((c) => c.role === 'COOK').length;
    const customers = users.filter((c) => c.role === 'CUSTOMER').length;
    const active = users.filter((c) => c.isActive).length;
    const banned = users.filter((c) => !c.isActive && c.banReason).length;
    const suspended = users.filter((c) => !c.isActive && !c.banReason).length;
    const newToday = users.filter((c) => isToday(c.createdAt)).length;
    const totalBalance = users.reduce((sum, c) => sum + (c.balanceKobo || 0), 0);
    return { total, admins, riders, cooks, customers, active, banned, suspended, newToday, totalBalance };
  }, [users]);

  async function handleRole(id: string, role: string) {
    if (!window.confirm(`Change user role to ${role}?`)) return;
    try {
      await updateCustomerRole(id, role);
      load(skip);
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Role update failed');
    }
  }

  async function handleBan(id: string, reason?: string) {
    try {
      await banCustomer(id, reason);
      load(skip);
      if (selected?.customer?.id === id) setSelected(null);
      toast.success('User banned');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ban failed');
    }
  }

  async function handleSuspend(id: string, reason?: string) {
    try {
      await suspendCustomer(id, reason);
      load(skip);
      if (selected?.customer?.id === id) setSelected(null);
      toast.success('User suspended');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suspend failed');
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateCustomer(id);
      load(skip);
      if (selected?.customer?.id === id) setSelected(null);
      toast.success('User activated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Activation failed');
    }
  }

  async function handleBalance(id: string, amount: number, note?: string) {
    try {
      await adjustCustomerBalance(id, amount, note);
      load(skip);
      if (selected?.customer?.id === id) {
        setSelected((s: any) => (s ? { ...s, customer: { ...s.customer, balanceKobo: (s.customer.balanceKobo || 0) + amount } } : null));
      }
      toast.success(`Balance adjusted by ${formatPrice(Math.abs(amount))} ${amount > 0 ? 'credit' : 'debit'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Balance adjustment failed');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
      await deleteCustomer(id);
      load(skip);
      if (selected?.customer?.id === id) setSelected(null);
      toast.success('User deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function openDetail(customer: any) {
    setSelected({ customer, orders: [], audit: [] });
    setDetailLoading(true);
    try {
      const [orders, audit] = await Promise.all([fetchCustomerOrders(customer.id), fetchCustomerAudit(customer.id)]);
      setSelected({ customer, orders: orders.orders, audit: audit.logs });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  }

  function statusBadge(customer: any) {
    if (!customer.isActive) {
      return customer.banReason ? (
        <span className='rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-300'>Banned</span>
      ) : (
        <span className='rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-300'>Suspended</span>
      );
    }
    return <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-300'>Active</span>;
  }

  function roleBadge(role: string) {
    const styles: Record<string, string> = {
      ADMIN: 'bg-purple-500/10 text-purple-300',
      RIDER: 'bg-blue-500/10 text-blue-300',
      COOK: 'bg-orange-500/10 text-orange-300',
      CUSTOMER: 'bg-white/10 text-white/70',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles[role] ?? styles.CUSTOMER}`}>
        {role || 'CUSTOMER'}
      </span>
    );
  }

  const primaryAddress = (customer: any) => customer.addresses?.find((a: any) => a.isDefault) || customer.addresses?.[0];

  const pageCount = Math.ceil(total / PAGE);
  const currentPage = Math.floor(skip / PAGE) + 1;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-2xl font-bold text-white'>User Command Center</h2>
        <p className='text-sm text-white/60'>{total.toLocaleString()} registered users</p>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {[
          { label: 'Total users', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-emerald-300' },
          { label: 'Banned', value: stats.banned, color: 'text-red-300' },
          { label: 'Suspended', value: stats.suspended, color: 'text-yellow-300' },
          { label: 'Admins', value: stats.admins, color: 'text-purple-300' },
          { label: 'Riders', value: stats.riders, color: 'text-blue-300' },
          { label: 'Cooks', value: stats.cooks, color: 'text-orange-300' },
          { label: 'New today', value: stats.newToday, color: 'text-emerald-300' },
          { label: 'Total balance', value: formatPrice(stats.totalBalance), color: 'text-white' },
        ].map((s) => (
          <div key={s.label} className='rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm'>
            <p className='text-2xl font-black text-white'>{s.value}</p>
            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
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

      <div className='relative'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40' />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search name, email, phone...'
          className='w-full rounded-2xl border border-white/20 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-white/40 focus:border-emerald-500 focus:outline-none'
        />
      </div>

      <div className='space-y-3'>
        {loading && <p className='text-center text-sm text-white/60'><Loader2 className='mx-auto h-5 w-5 animate-spin' /> Loading...</p>}
        {!loading && users.map((customer) => {
          const address = primaryAddress(customer);
          return (
            <div
              key={customer.id}
              className='rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:flex sm:items-start sm:justify-between'
            >
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='font-bold text-white'>
                    {customer.firstName} {customer.lastName}
                  </p>
                  {roleBadge(customer.role)}
                  {statusBadge(customer)}
                </div>
                <div className='mt-2 grid gap-x-4 gap-y-1 text-xs text-white/60 sm:grid-cols-2'>
                  <span className='flex items-center gap-1'>
                    <Mail className='h-3 w-3' /> {customer.email || '-'}
                  </span>
                  <span className='flex items-center gap-1'>
                    <Phone className='h-3 w-3' /> {customer.phone || '-'}
                  </span>
                  <span className='flex items-center gap-1'>
                    <Calendar className='h-3 w-3' /> {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                  <span className='flex items-center gap-1'>
                    <ShoppingBag className='h-3 w-3' /> {customer._count?.orders ?? 0} orders
                  </span>
                  <span className='flex items-center gap-1'>
                    <Wallet className='h-3 w-3' /> {formatPrice(customer.balanceKobo || 0)}
                  </span>
                  <span className='flex items-center gap-1'>
                    <MapPin className='h-3 w-3' /> {address?.address ?? 'No address'}
                  </span>
                </div>
              </div>
              <div className='mt-3 flex flex-wrap gap-2 sm:mt-0'>
                <button
                  onClick={() => openDetail(customer)}
                  className='rounded-full border border-white/20 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10'
                >
                  View
                </button>
                {customer.isActive && (
                  <>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Ban reason (optional):');
                        if (reason === null) return;
                        handleBan(customer.id, reason || undefined);
                      }}
                      className='rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-bold text-red-300 hover:bg-red-500/30'
                    >
                      Ban
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Suspension reason (optional):');
                        if (reason === null) return;
                        handleSuspend(customer.id, reason || undefined);
                      }}
                      className='rounded-full bg-yellow-500/20 px-3 py-1.5 text-sm font-bold text-yellow-300 hover:bg-yellow-500/30'
                    >
                      Suspend
                    </button>
                  </>
                )}
                {!customer.isActive && (
                  <button
                    onClick={() => handleActivate(customer.id)}
                    className='rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30'
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => {
                    const raw = window.prompt('Enter amount in kobo to credit (+) or debit (-):');
                    if (!raw) return;
                    const amount = Number(raw);
                    if (Number.isNaN(amount) || amount === 0) {
                      toast.error('Enter a non-zero number');
                      return;
                    }
                    const note = window.prompt('Note (optional):') || undefined;
                    handleBalance(customer.id, amount, note);
                  }}
                  className='rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30'
                >
                  Balance
                </button>
                {customer.role !== 'ADMIN' && (
                  <button
                    onClick={() => handleRole(customer.id, 'ADMIN')}
                    className='rounded-full bg-purple-500/20 px-3 py-1.5 text-sm font-bold text-purple-300 hover:bg-purple-500/30'
                  >
                    Make admin
                  </button>
                )}
                {customer.role !== 'CUSTOMER' && (
                  <button
                    onClick={() => handleRole(customer.id, 'CUSTOMER')}
                    className='rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/20'
                  >
                    Make customer
                  </button>
                )}
                <button
                  onClick={() => handleDelete(customer.id)}
                  className='rounded-full bg-red-500 px-3 py-1.5 text-sm font-bold text-black hover:bg-red-400'
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {!loading && users.length === 0 && <p className='text-center text-sm text-white/60'>No users match.</p>}
      </div>

      {pageCount > 1 && (
        <div className='flex items-center justify-between border-t border-white/10 pt-4'>
          <button
            onClick={() => { const s = Math.max(skip - PAGE, 0); setSkip(s); load(s); }}
            disabled={skip === 0}
            className='inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50'
          >
            <ChevronLeft className='h-4 w-4' /> Previous
          </button>
          <span className='text-sm text-white/60'>
            Page {currentPage} of {pageCount}
          </span>
          <button
            onClick={() => { const s = skip + PAGE; setSkip(s); load(s); }}
            disabled={currentPage >= pageCount}
            className='inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50'
          >
            Next <ChevronRight className='h-4 w-4' />
          </button>
        </div>
      )}

      {selected &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4'
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className='h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-3xl'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-bold text-white'>
                  {selected.customer.firstName} {selected.customer.lastName}
                </h3>
                <button onClick={() => setSelected(null)} className='rounded-full bg-white/10 p-2 text-white hover:bg-white/20'>
                  <X className='h-5 w-5' />
                </button>
              </div>
              <p className='mt-1 flex flex-wrap items-center gap-2 text-white/60'>
                {selected.customer.email} • {selected.customer.phone} • {roleBadge(selected.customer.role)} {statusBadge(selected.customer.role)}
              </p>

              <div className='mt-6 grid gap-3 sm:grid-cols-2'>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <p className='text-xs text-white/50'>Balance</p>
                  <p className='text-2xl font-black text-white'>{formatPrice(selected.customer.balanceKobo || 0)}</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <p className='text-xs text-white/50'>Registered</p>
                  <p className='text-2xl font-black text-white'>{new Date(selected.customer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className='mt-6'>
                <h4 className='mb-3 font-bold text-white'>Addresses</h4>
                {(selected.customer.addresses || []).length === 0 ? (
                  <p className='text-white/60'>No addresses on file.</p>
                ) : (
                  <div className='space-y-2'>
                    {selected.customer.addresses.map((a: any) => (
                      <div
                        key={a.id}
                        className={`rounded-2xl border p-3 text-sm ${a.isDefault ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}
                      >
                        <p className='font-bold text-white'>{a.address}</p>
                        <p className='text-white/60'>{a.neighborhood ? `${a.neighborhood} • ` : ''}{a.label || 'Address'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {detailLoading ? (
                <div className='mt-6 flex items-center gap-2 text-white/60'>
                  <Loader2 className='h-5 w-5 animate-spin' /> Loading details...
                </div>
              ) : (
                <>
                  <div className='mt-6'>
                    <h4 className='mb-3 font-bold text-white'>Orders</h4>
                    {selected.orders.length === 0 ? (
                      <p className='text-white/60'>No orders yet.</p>
                    ) : (
                      <div className='space-y-2'>
                        {selected.orders.map((order: any) => (
                          <div
                            key={order.id}
                            className='flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4'
                          >
                            <div>
                              <p className='font-bold text-white'>{order.orderNumber}</p>
                              <p className='text-xs text-white/60'>
                                {new Date(order.createdAt).toLocaleDateString()} • {order.status.replace(/_/g, ' ')} • {order.paymentStatus}
                              </p>
                            </div>
                            <p className='font-bold text-white'>{formatPrice(order.totalKobo)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className='mt-6'>
                    <h4 className='mb-3 flex items-center gap-2 font-bold text-white'>
                      <Activity className='h-4 w-4' /> Activity audit
                    </h4>
                    {selected.audit.length === 0 ? (
                      <p className='text-white/60'>No audit logs.</p>
                    ) : (
                      <div className='space-y-2'>
                        {selected.audit.map((log: any, idx: number) => (
                          <div key={idx} className='rounded-2xl border border-white/10 bg-white/5 p-3 text-sm'>
                            <p className='font-bold text-white'>{log.action}</p>
                            <p className='text-white/60'>{new Date(log.createdAt).toLocaleString()}</p>
                            {log.reason && <p className='text-white/50'>{log.reason}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className='mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4'>
                {selected.customer.isActive && (
                  <>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Ban reason (optional):');
                        if (reason === null) return;
                        handleBan(selected.customer.id, reason || undefined);
                      }}
                      className='rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/30'
                    >
                      Ban
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Suspension reason (optional):');
                        if (reason === null) return;
                        handleSuspend(selected.customer.id, reason || undefined);
                      }}
                      className='rounded-full bg-yellow-500/20 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-500/30'
                    >
                      Suspend
                    </button>
                  </>
                )}
                {!selected.customer.isActive && (
                  <button
                    onClick={() => handleActivate(selected.customer.id)}
                    className='rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400'
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => {
                    const raw = window.prompt('Amount in kobo to credit (+) or debit (-):');
                    if (!raw) return;
                    const amount = Number(raw);
                    if (Number.isNaN(amount) || amount === 0) {
                      toast.error('Enter a non-zero number');
                      return;
                    }
                    const note = window.prompt('Note (optional):') || undefined;
                    handleBalance(selected.customer.id, amount, note);
                  }}
                  className='rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30'
                >
                  Adjust balance
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
