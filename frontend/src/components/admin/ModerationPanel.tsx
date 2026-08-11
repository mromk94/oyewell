import { useEffect, useMemo, useState } from 'react';
import { fetchTickets, fetchDisputes, updateTicketStatus, resolveDispute } from '../../lib/management';

export default function ModerationPanel() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'tickets' | 'disputes'>('tickets');

  useEffect(() => {
    async function load() {
      try {
        const [t, d] = await Promise.all([fetchTickets(), fetchDisputes()]);
        setTickets(t.tickets ?? []);
        setDisputes(d.disputes ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rows = useMemo(() => {
    const source = activeTab === 'tickets' ? tickets : disputes;
    if (!filter.trim()) return source;
    const q = filter.toLowerCase();
    return source.filter((r) =>
      (r.ticketNumber ?? r.disputeNumber ?? '').toLowerCase().includes(q) ||
      (r.category ?? r.type ?? '').toLowerCase().includes(q) ||
      (r.subject ?? r.description ?? '').toLowerCase().includes(q) ||
      (r.status ?? '').toLowerCase().includes(q)
    );
  }, [filter, activeTab, tickets, disputes]);

  async function closeTicket(id: string) {
    try {
      await updateTicketStatus(id, { status: 'RESOLVED', resolution: 'Closed from panel' });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'RESOLVED' } : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function resolveDisputeById(id: string) {
    try {
      await resolveDispute(id, { resolution: 'Resolved from panel' });
      setDisputes((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'RESOLVED' } : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-semibold text-gray-800">Moderation</h2>
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'tickets' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'disputes' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          Disputes ({disputes.length})
        </button>
      </div>
      <input
        type="text"
        placeholder="Search by number, category, status..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-lg border border-gray-300 p-3 text-sm"
      />
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 font-medium">Number</th>
              <th className="p-3 font-medium">Type/Category</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono">{row.ticketNumber ?? row.disputeNumber}</td>
                <td className="p-3">{row.category ?? row.type}</td>
                <td className="p-3">
                  <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold uppercase">{row.status}</span>
                </td>
                <td className="p-3 text-gray-500">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  {activeTab === 'tickets' && row.status !== 'RESOLVED' && (
                    <button onClick={() => closeTicket(row.id)} className="text-xs text-orange-600 hover:underline">
                      Resolve
                    </button>
                  )}
                  {activeTab === 'disputes' && row.status !== 'RESOLVED' && (
                    <button onClick={() => resolveDisputeById(row.id)} className="text-xs text-orange-600 hover:underline">
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-6 text-center text-gray-500">No {activeTab} found.</div>
        )}
      </div>
    </div>
  );
}
