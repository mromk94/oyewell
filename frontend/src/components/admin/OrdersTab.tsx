import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { formatPrice } from '../../lib/api';
import { updateOrderStatus, verifyOrderPayment } from '../../lib/admin';
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

  return (
    <div>
      <h2 className='text-2xl font-bold text-white'>Orders</h2>
      <p className='text-sm text-white/60'>Review, update and verify payments.</p>

      <div className='mt-6 space-y-4'>
        {orders.length === 0 && (
          <div className='rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70'>
            No orders yet.
          </div>
        )}

        {orders.map((order) => (
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
    </div>
  );
}
