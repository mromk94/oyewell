import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Users, Shield, Bike, ChefHat, Search, X, ShoppingBag, Phone, Mail, Calendar, Loader2 } from 'lucide-react';
import { formatPrice } from '../../lib/api';
import { toast } from '../../lib/toast';
import { updateCustomerRole, fetchCustomerOrders } from '../../lib/admin';

type SubTab = 'all' | 'admins' | 'riders' | 'cooks';

const TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Users },
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'riders', label: 'Riders', icon: Bike },
  { id: 'cooks', label: 'Cooks', icon: ChefHat },
];

export default function CustomersTab({ customers, onRefresh }: { customers: any[]; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isToday = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const admins = customers.filter((c) => c.role === 'ADMIN').length;
    const riders = customers.filter((c) => c.role === 'RIDER').length;
    const cooks = customers.filter((c) => c.role === 'COOK').length;
    const newToday = customers.filter((c) => isToday(c.createdAt)).length;
    return { total, admins, riders, cooks, newToday };
  }, [customers]);

  const visible = useMemo(() => {
    let list = customers;
    if (subTab === 'admins') list = customers.filter((c) => c.role === 'ADMIN');
    if (subTab === 'riders') list = customers.filter((c) => c.role === 'RIDER');
    if (subTab === 'cooks') list = customers.filter((c) => c.role === 'COOK');
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q)
    );
  }, [customers, query, subTab]);

  async function handleRole(id: string, role: string) {
    if (!window.confirm(`Change user role to ${role}?`)) return;
    try {
      await updateCustomerRole(id, role);
      onRefresh();
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Role update failed');
    }
  }

  async function openDetail(customer: any) {
    setSelected({ customer, orders: [] });
    setDetailLoading(true);
    try {
      const { orders } = await fetchCustomerOrders(customer.id);
      setSelected({ customer, orders });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setDetailLoading(false);
    }
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

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold text-white'>Customer Command Center</h2>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        {[
          { label: 'Total users', value: stats.total, color: 'text-white' },
          { label: 'Admins', value: stats.admins, color: 'text-purple-300' },
          { label: 'Riders', value: stats.riders, color: 'text-blue-300' },
          { label: 'Cooks', value: stats.cooks, color: 'text-orange-300' },
          { label: 'New today', value: stats.newToday, color: 'text-emerald-300' },
        ].map((s) => (
          <div key={s.label} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
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
          className='w-full rounded-2xl border border-white/20 bg-white/5 py-2.5 pl-10 pr-4 text-white'
        />
      </div>

      <div className='space-y-3'>
        {visible.map((customer) => (
          <div
            key={customer.id}
            className='rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex sm:items-center sm:justify-between'
          >
            <div>
              <div className='flex items-center gap-2'>
                <p className='font-bold text-white'>
                  {customer.firstName} {customer.lastName}
                </p>
                {roleBadge(customer.role)}
              </div>
              <div className='mt-1 flex flex-wrap gap-2 text-xs text-white/60'>
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
              </div>
            </div>
            <div className='mt-3 flex flex-wrap gap-2 sm:mt-0'>
              <button
                onClick={() => openDetail(customer)}
                className='rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10'
              >
                View orders
              </button>
              {customer.role !== 'ADMIN' && (
                <button
                  onClick={() => handleRole(customer.id, 'ADMIN')}
                  className='rounded-full bg-purple-500/20 px-4 py-2 text-sm font-bold text-purple-300 hover:bg-purple-500/30'
                >
                  Make admin
                </button>
              )}
              {customer.role !== 'RIDER' && (
                <button
                  onClick={() => handleRole(customer.id, 'RIDER')}
                  className='rounded-full bg-blue-500/20 px-4 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/30'
                >
                  Make rider
                </button>
              )}
              {customer.role !== 'COOK' && (
                <button
                  onClick={() => handleRole(customer.id, 'COOK')}
                  className='rounded-full bg-orange-500/20 px-4 py-2 text-sm font-bold text-orange-300 hover:bg-orange-500/30'
                >
                  Make cook
                </button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className='text-center text-sm text-white/60'>No customers match.</p>}
      </div>

      {selected &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-2xl rounded-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-bold text-white'>
                  {selected.customer.firstName} {selected.customer.lastName}
                </h3>
                <button onClick={() => setSelected(null)} className='rounded-full bg-white/10 p-2 text-white hover:bg-white/20'>
                  <X className='h-5 w-5' />
                </button>
              </div>
              <p className='mt-1 text-white/60'>
                {selected.customer.email} • {selected.customer.phone} • {roleBadge(selected.customer.role)}
              </p>

              {detailLoading ? (
                <div className='mt-6 flex items-center gap-2 text-white/60'>
                  <Loader2 className='h-5 w-5 animate-spin' /> Loading orders...
                </div>
              ) : (
                <div className='mt-6 space-y-3'>
                  {selected.orders.length === 0 ? (
                    <p className='text-white/60'>No orders yet.</p>
                  ) : (
                    selected.orders.map((order: any) => (
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
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
