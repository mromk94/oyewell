import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Map,
  Users,
  ChefHat,
  Bike,
  Package,
  DollarSign,
  Activity,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import { formatPrice } from '../../lib/api';

function StatCard({ label, value, subtext, trend, color }: any) {
  return (
    <div className='rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm'>
      <p className='text-sm text-white/60'>{label}</p>
      <p className='mt-2 text-3xl font-black text-white'>{value}</p>
      {subtext && <p className={`mt-1 text-xs ${color ?? 'text-white/50'}`}>{subtext}</p>}
      {trend !== undefined && (
        <p className={`mt-1 flex items-center gap-1 text-xs ${trend >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {trend >= 0 ? <ArrowUpRight className='h-3 w-3' /> : <ArrowDownRight className='h-3 w-3' />}
          {Math.abs(trend).toFixed(0)}% vs yesterday
        </p>
      )}
    </div>
  );
}

function MiniBarChart({ data, valueKey, color = 'bg-emerald-500' }: { data: any[]; valueKey: string; color?: string }) {
  const values = data.map((d) => d[valueKey] ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className='flex h-28 items-end gap-1'>
      {data.map((d, i) => (
        <div key={i} className='group flex flex-1 flex-col items-center gap-1'>
          <div className='relative w-full'>
            <div
              className={`w-full rounded-t-md ${color} opacity-90 transition hover:opacity-100`}
              style={{ height: `${(values[i] / max) * 100}%`, minHeight: values[i] ? '4px' : '2px' }}
            />
            <div className='absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-xs text-white group-hover:block'>
              {values[i]}
            </div>
          </div>
          <span className='text-[10px] text-white/40'>{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard({ dashboard }: { dashboard: any }) {
  const opsStats = useMemo(
    () => [
      { label: 'Active orders', value: dashboard.active, color: 'text-blue-300', icon: Package },
      { label: 'New orders', value: dashboard.new, color: 'text-yellow-300', icon: Clock },
      { label: 'Preparing', value: dashboard.preparing, color: 'text-purple-300', icon: ChefHat },
      { label: 'Out for delivery', value: dashboard.outForDelivery, color: 'text-cyan-300', icon: Bike },
      { label: 'Completed', value: dashboard.completed, color: 'text-emerald-300', icon: TrendingUp },
      { label: 'Revenue', value: formatPrice(dashboard.revenueKobo ?? 0), color: 'text-white', icon: DollarSign },
    ],
    [dashboard]
  );

  const ads = dashboard.googleAds ?? {};
  const adsConfigured = ads?.enabled && ads?.conversionId;

  const byRole = dashboard.usersByRole ?? [];
  const byStatus = dashboard.usersByStatus ?? [];
  const activeUsers = byStatus.find((s: any) => s.isActive)?._count?.id ?? 0;
  const inactiveUsers = byStatus.find((s: any) => !s.isActive)?._count?.id ?? 0;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-black text-white'>Operations overview</h2>
          <p className='text-white/60'>Live analytics across orders, riders, users and regions.</p>
        </div>
        <span className='text-sm text-white/50'>{new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {opsStats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard label='Total users' value={(dashboard.totalUsers ?? 0).toLocaleString()} subtext={`+${dashboard.newUsersToday ?? 0} today`} color='text-blue-300' />
        <StatCard label='Riders online' value={dashboard.ridersOnline ?? 0} subtext='Available now' color='text-emerald-300' />
        <StatCard label='Active cooks' value={dashboard.activeCooks ?? 0} subtext='Kitchens open' color='text-orange-300' />
        <StatCard label='Open issues' value={(dashboard.openIssues?.tickets ?? 0) + (dashboard.openIssues?.disputes ?? 0) + (dashboard.openIssues?.reports ?? 0)} subtext='Tickets / disputes / reports' color='text-red-300' />
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-bold text-white'>7-day traffic & orders</h3>
            <span className='text-xs text-white/50'>Orders + new users</span>
          </div>
          {dashboard.activityByDay?.length ? (
            <MiniBarChart data={dashboard.activityByDay.slice().reverse()} valueKey='orders' color='bg-emerald-500' />
          ) : (
            <p className='text-white/50'>No recent activity.</p>
          )}
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-bold text-white'>7-day revenue</h3>
            <span className='text-xs text-white/50'>{formatPrice(dashboard.revenueByDay?.[0]?.revenueKobo ?? 0)} today</span>
          </div>
          {dashboard.revenueByDay?.length ? (
            <MiniBarChart data={dashboard.revenueByDay.slice().reverse()} valueKey='revenueKobo' color='bg-purple-500' />
          ) : (
            <p className='text-white/50'>No revenue data.</p>
          )}
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <TrendingUp className='h-4 w-4 text-emerald-300' /> Popular items
          </h3>
          {dashboard.popularItems?.length ? (
            <div className='space-y-3'>
              {dashboard.popularItems.map((item: any) => (
                <div key={item.foodName} className='flex items-center justify-between text-white/90'>
                  <span>{item.foodName}</span>
                  <span className='rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-white'>{item._count.id} orders</span>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-white/50'>No orders yet.</p>
          )}
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <AlertTriangle className='h-4 w-4 text-yellow-300' /> Low stock alerts
          </h3>
          {dashboard.lowStockFoods?.length ? (
            <div className='space-y-3'>
              {dashboard.lowStockFoods.map((item: any) => (
                <div key={item.id} className='flex items-center justify-between text-white/90'>
                  <span>{item.name}</span>
                  <span className='rounded-full bg-red-500/20 px-2 py-1 text-xs font-bold text-red-300'>No options</span>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-white/50'>No low stock alerts.</p>
          )}
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <Map className='h-4 w-4 text-emerald-300' /> Active deliveries by zone
          </h3>
          {dashboard.ordersByZone?.length ? (
            <div className='space-y-3'>
              {dashboard.ordersByZone.map((item: any) => (
                <div key={item.deliveryZoneId} className='flex items-center justify-between text-white/90'>
                  <span>{item.deliveryZoneId || 'Unzoned'}</span>
                  <span className='rounded-full bg-white/10 px-2 py-1 text-xs font-bold text-white'>{item._count.id} orders</span>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-white/50'>No active deliveries right now.</p>
          )}
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <Users className='h-4 w-4 text-blue-300' /> Users by role
          </h3>
          <div className='space-y-2'>
            {byRole.length ? byRole.map((r: any) => (
              <div key={r.role} className='flex items-center justify-between text-sm text-white/90'>
                <span>{r.role}</span>
                <span className='font-bold'>{r._count.id}</span>
              </div>
            )) : <p className='text-white/50'>No users.</p>}
          </div>
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <Activity className='h-4 w-4 text-emerald-300' /> User status
          </h3>
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm text-emerald-300'>
              <span>Active</span>
              <span className='font-bold'>{activeUsers}</span>
            </div>
            <div className='flex items-center justify-between text-sm text-red-300'>
              <span>Inactive</span>
              <span className='font-bold'>{inactiveUsers}</span>
            </div>
            <div className='mt-2 text-xs text-white/40'>{byRole.reduce((sum: number, r: any) => sum + r._count.id, 0)} total</div>
          </div>
        </div>

        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <Megaphone className='h-4 w-4 text-purple-300' /> Google Ads
          </h3>
          {adsConfigured ? (
            <div className='space-y-2 text-sm text-white/90'>
              <p>
                <span className='text-white/60'>Conversion ID:</span> {ads.conversionId}
              </p>
              <p>
                <span className='text-white/60'>Label:</span> {ads.conversionLabel || '-'}
              </p>
              <p className='text-xs text-emerald-300'>Tracking active</p>
            </div>
          ) : (
            <p className='text-sm text-white/60'>
              Google Ads conversion tracking not configured. Set it up in <Link to='/?tab=settings' className='text-emerald-300 underline'>Settings {'>'} Google Ads</Link>.
            </p>
          )}
        </div>
      </div>

      {dashboard.pendingApprovals && (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <Clock className='h-4 w-4 text-yellow-300' /> Pending approvals
          </h3>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            {[
              { label: 'Cooks', value: dashboard.pendingApprovals.cooks },
              { label: 'Foods', value: dashboard.pendingApprovals.foods },
              { label: 'Listings', value: dashboard.pendingApprovals.listings },
              { label: 'Riders', value: dashboard.pendingApprovals.riders },
            ].map((a) => (
              <div key={a.label} className='rounded-xl border border-white/10 bg-white/5 p-4 text-center'>
                <p className='text-2xl font-black text-white'>{a.value ?? 0}</p>
                <p className='text-sm text-white/60'>{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashboard.recentAuditLogs?.length > 0 && (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
          <h3 className='mb-4 flex items-center gap-2 font-bold text-white'>
            <Activity className='h-4 w-4 text-emerald-300' /> Recent activity
          </h3>
          <div className='space-y-2'>
            {dashboard.recentAuditLogs.map((log: any, i: number) => (
              <div key={i} className='flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm'>
                <div>
                  <p className='font-bold text-white'>{log.action}</p>
                  {log.reason && <p className='text-white/60'>{log.reason}</p>}
                </div>
                <span className='text-white/40'>{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
