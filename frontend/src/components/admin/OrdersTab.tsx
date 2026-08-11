import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight, Bike, User } from 'lucide-react';
import { formatPrice } from '../../lib/api';
import { updateOrderStatus, verifyOrderPayment, fetchRiders, fetchEligibleRiders, assignRider, dispatchOrder } from '../../lib/admin';
import { toast } from '../../lib/toast';

const STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_DISPATCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

function isManualProvider(provider?: string) {
  return provider === 'BANK_TRANSFER' || provider === 'CRYPTO';
}

function latestProofImage(order: any): string | undefined {
  return order.payment?.attempts?.[0]?.payload?.image;
}

export function OrdersTab({ orders, onRefresh }: { orders: any[]; onRefresh: () => void }) {
  const [verifying, setVerifying] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const [assigning, setAssigning] = useState<any | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderId, setRiderId] = useState('');
  const [riderFee, setRiderFee] = useState('');
  const [ridersLoading, setRidersLoading] = useState(false);
  const [eligible, setEligible] = useState<any[]>([]);
  const [dispatching, setDispatching] = useState(false);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<any | null>(null);

  async function handleStatusChange(order: any, status: string) {
    try {
      await updateOrderStatus(order.id, status);
      onRefresh();
      toast.success('Status updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleVerify(orderId: string, accepted: boolean) {
    try {
      setLoading(true);
      await verifyOrderPayment(orderId, { accepted, note });
      setVerifying(null);
      setNote('');
      onRefresh();
      toast.success(accepted ? 'Payment accepted.' : 'Payment rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function openAssign(order: any) {
    setAssigning(order);
    setRiderId(order.riderId ?? '');
    setRiderFee(order.riderFeeKobo ? String(order.riderFeeKobo / 100) : '');
    setEligible([]);
    setRidersLoading(true);
    try {
      const [{ riders }, { riders: eligibleRiders }] = await Promise.all([fetchRiders(), fetchEligibleRiders(order.orderNumber)]);
      setRiders(riders);
      setEligible(eligibleRiders);
      if (!order.riderId && eligibleRiders.length > 0) {
        setRiderId(eligibleRiders[0].id);
      } else if (!order.riderId && riders.length > 0) {
        const firstApproved = riders.find((r: any) => r.isApproved);
        if (firstApproved) setRiderId(firstApproved.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load riders.');
    } finally {
      setRidersLoading(false);
    }
  }

  async function handleDispatch() {
    if (!assigning) return;
    setDispatching(true);
    try {
      await dispatchOrder(assigning.orderNumber);
      setAssigning(null);
      onRefresh();
      toast.success('Order dispatched to nearest riders.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dispatch failed.');
    } finally {
      setDispatching(false);
    }
  }

  async function handleAssign() {
    if (!assigning || !riderId) return;
    const feeNgn = Number(riderFee);
    const feeKobo = !Number.isNaN(feeNgn) && feeNgn >= 0 ? Math.round(feeNgn * 100) : 0;
    try {
      setLoading(true);
      await assignRider(assigning.orderNumber, riderId, feeKobo);
      setAssigning(null);
      setRiderFee('');
      setRiderId('');
      onRefresh();
      toast.success('Rider assigned.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setLoading(false);
    }
  }

  const visible = orders.filter((order: any) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      order.orderNumber?.toLowerCase().includes(q) ||
      order.customer?.email?.toLowerCase().includes(q) ||
      order.customer?.phone?.toLowerCase().includes(q) ||
      order.items?.some((i: any) => i.foodName?.toLowerCase().includes(q));
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const total = orders.length;
  const paid = orders.filter((o: any) => o.paymentStatus === 'PAID').length;
  const pendingPayment = orders.filter((o: any) => o.paymentStatus === 'PENDING').length;
  const active = orders.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  return (
    <div>
      <h2 className='text-2xl font-bold text-white'>Order Command Center</h2>
      <p className='text-sm text-white/60'>Review, update and assign riders.</p>

      <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {[
          { label: 'Total', value: total, color: 'text-white' },
          { label: 'Paid', value: paid, color: 'text-emerald-300' },
          { label: 'Pending payment', value: pendingPayment, color: 'text-yellow-300' },
          { label: 'Active', value: active, color: 'text-cyan-300' },
        ].map((s) => (
          <div key={s.label} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
            <p className='text-2xl font-black text-white'>{s.value}</p>
            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search order number, customer, item...'
          className='flex-1 rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none focus:border-white'
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className='rounded-2xl border border-white/20 bg-white/5 p-3 text-sm text-white outline-none focus:border-white'
        >
          <option value='' className='bg-brand-900'>All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className='bg-brand-900'>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className='mt-6 space-y-4'>
        {visible.length === 0 && (
          <div className='rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70'>
            No orders match.
          </div>
        )}

        {visible.map((order) => (
          <div key={order.id} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h3 className='text-lg font-bold text-white'>{order.orderNumber}</h3>
                <p className='text-sm text-white/60'>
                  {order.items.map((i: any) => `${i.foodName} × ${i.quantity}`).join(', ')}
                </p>
                <p className='mt-1 text-sm text-white/80'>{formatPrice(order.totalKobo)}</p>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    order.paymentStatus === 'PAID'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : order.paymentStatus === 'FAILED'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}
                >
                  {order.paymentStatus === 'PAID'
                    ? 'Paid'
                    : order.paymentStatus === 'FAILED'
                    ? 'Failed'
                    : 'Pending'}
                </span>
                <span className='rounded-full bg-white/10 px-2 py-1 text-xs text-white/70'>
                  {order.status.replace(/_/g, ' ')}
                </span>
                {order.payment?.provider && (
                  <span className='rounded-full bg-white/10 px-2 py-1 text-xs text-white/70'>
                    {order.payment.provider}
                  </span>
                )}
                <button
                  onClick={() => setDetail(order)}
                  className='rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/10'
                >
                  View
                </button>
              </div>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-3'>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order, e.target.value)}
                className='rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white'
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>

              {order.riderId && order.rider && (
                <span className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80'>
                  <User className='h-3.5 w-3.5' />
                  {order.rider.user?.firstName ?? order.rider.user?.email ?? 'Rider'}
                  {order.riderFeeKobo ? ` · ${formatPrice(order.riderFeeKobo)}` : ''}
                </span>
              )}

              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <button
                  onClick={() => openAssign(order)}
                  className='inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30'
                >
                  <Bike className='h-4 w-4' /> {order.riderId ? 'Reassign rider' : 'Assign rider'}
                </button>
              )}

              {isManualProvider(order.payment?.provider) && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'FAILED' && (
                <button
                  onClick={() => {
                    setVerifying(order);
                    setNote('');
                  }}
                  className='inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30'
                >
                  <CheckCircle className='h-4 w-4' /> Verify payment
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {verifying &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
            onClick={() => setVerifying(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-lg rounded-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl'
            >
              <h3 className='text-xl font-bold text-white'>Verify payment</h3>
              <p className='mt-1 text-white/60'>
                Order {verifying.orderNumber} - {formatPrice(verifying.totalKobo)}
              </p>

              {latestProofImage(verifying) ? (
                <div className='mt-4'>
                  <p className='text-sm text-white/70'>Customer proof of payment</p>
                  <img
                    src={latestProofImage(verifying)}
                    alt='Payment proof'
                    className='mt-2 max-h-64 rounded-2xl border border-white/10'
                  />
                </div>
              ) : (
                <div className='mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200'>
                  No proof has been uploaded yet.
                </div>
              )}

              <label className='mt-4 block'>
                <span className='text-sm text-white/80'>Note</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder='Optional verification note'
                  className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                  rows={3}
                />
              </label>

              <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
                <button
                  onClick={() => setVerifying(null)}
                  className='rounded-full border border-white/20 px-6 py-2 text-white'
                >
                  Close
                </button>
                <button
                  onClick={() => handleVerify(verifying.id, false)}
                  disabled={loading}
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-red-500/20 px-6 py-2 font-bold text-red-300 hover:bg-red-500/30 disabled:opacity-50'
                >
                  {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <XCircle className='h-4 w-4' />}
                  Reject
                </button>
                <button
                  onClick={() => handleVerify(verifying.id, true)}
                  disabled={loading}
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2 font-bold text-white hover:bg-emerald-400 disabled:opacity-50'
                >
                  {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <ArrowRight className='h-4 w-4' />}
                  Accept
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {assigning &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
            onClick={() => setAssigning(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-lg rounded-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl'
            >
              <h3 className='text-xl font-bold text-white'>
                {assigning.riderId ? 'Reassign rider' : 'Assign rider'}
              </h3>
              <p className='mt-1 text-white/60'>
                Order {assigning.orderNumber} · {formatPrice(assigning.totalKobo)} · {assigning.address}
              </p>

              {eligible.length > 0 && (
                <div className='mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4'>
                  <p className='text-sm font-semibold text-emerald-100'>Closest eligible riders</p>
                  <div className='mt-2 max-h-40 space-y-2 overflow-y-auto'>
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
                          {Math.round(rider.distanceMeters ?? 0)}m · ~{rider.estimatedMinutes ?? 0} min
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className='mt-6 block'>
                <span className='text-sm text-white/80'>Approved rider</span>
                <select
                  value={riderId}
                  onChange={(e) => setRiderId(e.target.value)}
                  disabled={ridersLoading}
                  className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                >
                  <option value='' className='bg-brand-900'>Select a rider</option>
                  {riders
                    .filter((r) => r.isApproved)
                    .map((rider) => (
                      <option key={rider.id} value={rider.id} className='bg-brand-900'>
                        {rider.user?.firstName || rider.user?.email || rider.id} — {rider.vehicle || 'No vehicle'}
                      </option>
                    ))}
                </select>
              </label>

              <label className='mt-4 block'>
                <span className='text-sm text-white/80'>Delivery fee (NGN)</span>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={riderFee}
                  onChange={(e) => setRiderFee(e.target.value)}
                  placeholder='Rider fee for this order'
                  className='mt-2 w-full rounded-2xl border border-white/20 bg-white/5 p-3 text-white'
                />
              </label>

              <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
                <button
                  onClick={() => setAssigning(null)}
                  disabled={loading || ridersLoading || dispatching}
                  className='rounded-full border border-white/20 px-6 py-2 text-white disabled:opacity-50'
                >
                  Close
                </button>
                <button
                  onClick={handleDispatch}
                  disabled={dispatching || loading || ridersLoading || eligible.length === 0}
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/20 px-6 py-2 font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50'
                >
                  {dispatching ? <Loader2 className='h-4 w-4 animate-spin' /> : <Bike className='h-4 w-4' />}
                  Auto-dispatch
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!riderId || loading || ridersLoading || dispatching}
                  className='inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2 font-bold text-white hover:bg-emerald-400 disabled:opacity-50'
                >
                  {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Bike className='h-4 w-4' />}
                  {assigning.riderId ? 'Reassign' : 'Assign rider'}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      {detail &&
        createPortal(
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm'
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-2xl rounded-3xl border border-white/10 bg-brand-900 p-6 shadow-2xl'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-bold text-white'>{detail.orderNumber}</h3>
                <button onClick={() => setDetail(null)} className='rounded-full bg-white/10 p-2 text-white hover:bg-white/20'>
                  <XCircle className='h-5 w-5' />
                </button>
              </div>
              <p className='mt-1 text-white/60'>{detail.customer?.email ?? detail.customer?.phone ?? 'Unknown customer'}</p>
              <p className='mt-2 text-2xl font-bold text-white'>{formatPrice(detail.totalKobo)}</p>

              <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80'>
                  <p><span className='text-white/50'>Status:</span> {detail.status.replace(/_/g, ' ')}</p>
                  <p><span className='text-white/50'>Payment:</span> {detail.paymentStatus} {detail.payment?.provider ? `· ${detail.payment.provider}` : ''}</p>
                  <p><span className='text-white/50'>Created:</span> {new Date(detail.createdAt).toLocaleString()}</p>
                  <p><span className='text-white/50'>Address:</span> {detail.address || '—'}</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80'>
                  <p className='text-white/50'>Rider</p>
                  <p>{detail.rider?.user?.firstName || detail.rider?.user?.email || 'Unassigned'}</p>
                  {detail.riderFeeKobo ? <p>{formatPrice(detail.riderFeeKobo)} rider fee</p> : null}
                </div>
              </div>

              <div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4'>
                <p className='text-sm text-white/50'>Items</p>
                <div className='mt-2 space-y-1 text-sm text-white/80'>
                  {detail.items?.map((item: any, idx: number) => (
                    <p key={idx}>{item.foodName} × {item.quantity} · {formatPrice(item.subtotalKobo ?? 0)}</p>
                  ))}
                </div>
              </div>

              {detail.notes && (
                <div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <p className='text-sm text-white/50'>Notes</p>
                  <p className='mt-1 text-white/80'>{detail.notes}</p>
                </div>
              )}
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
