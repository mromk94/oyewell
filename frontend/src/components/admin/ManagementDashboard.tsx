import { useEffect, useState } from 'react';
import { AlertTriangle, Bike, ChefHat, ClipboardList, Package, Scale, UserCheck, Users } from 'lucide-react';
import { fetchManagementDashboard, fetchManagementReports } from '../../lib/management';

export default function ManagementDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [d, r] = await Promise.all([fetchManagementDashboard(), fetchManagementReports()]);
        setDashboard(d);
        setReports(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const attention = dashboard?.attention ?? {};
  const today = dashboard?.today ?? {};
  const delivery = dashboard?.delivery ?? {};

  const cards = [
    { label: 'Orders today', value: today.orders ?? 0, icon: <ClipboardList className="w-5 h-5" /> },
    { label: 'New cooks', value: today.newCooks ?? 0, icon: <ChefHat className="w-5 h-5" /> },
    { label: 'New riders', value: today.newRiders ?? 0, icon: <Bike className="w-5 h-5" /> },
    { label: 'Pending approvals', value: attention.pendingApprovals ?? 0, icon: <UserCheck className="w-5 h-5" /> },
    { label: 'Open disputes', value: attention.openDisputes ?? 0, icon: <Scale className="w-5 h-5" /> },
    { label: 'Open tickets', value: attention.openTickets ?? 0, icon: <Users className="w-5 h-5" /> },
    { label: 'Open reports', value: attention.openReports ?? 0, icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Active deliveries', value: delivery.activeDeliveries ?? 0, icon: <Package className="w-5 h-5" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Management Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="text-orange-500">{card.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {reports && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Reports</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Open tickets</p>
              <p className="text-xl font-semibold">{reports.support?.openTickets ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Resolved tickets</p>
              <p className="text-xl font-semibold">{reports.support?.resolvedTickets ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Open disputes</p>
              <p className="text-xl font-semibold">{reports.disputes?.openDisputes ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Resolved disputes</p>
              <p className="text-xl font-semibold">{reports.disputes?.resolvedDisputes ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Pending cook applications</p>
              <p className="text-xl font-semibold">{reports.community?.pendingApplications ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Approved applications</p>
              <p className="text-xl font-semibold">{reports.community?.approvedApplications ?? 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
