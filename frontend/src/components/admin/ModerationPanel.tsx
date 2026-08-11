import { useEffect, useMemo, useState } from 'react';
import { fetchTickets, fetchDisputes, updateTicketStatus, resolveDispute } from '../../lib/management';

export default function ModerationPanel() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'tickets' | 'disputes'>('tickets');
  const [selected, setSelected] = useState<any | null>(null);

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
    return source.filter((r) => {
      const matchesStatus = !statusFilter || r.status === statusFilter;
      if (!filter.trim()) return matchesStatus;
      const q = filter.toLowerCase();
      return (
        matchesStatus &&
        ((r.ticketNumber ?? r.disputeNumber ?? '').toLowerCase().includes(q) ||
          (r.category ?? r.type ?? '').toLowerCase().includes(q) ||
          (r.subject ?? r.description ?? '').toLowerCase().includes(q) ||
          (r.status ?? '').toLowerCase().includes(q))
      );
    });
  }, [filter, statusFilter, activeTab, tickets, disputes]);

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
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by number, category, status..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 p-3 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-700"
        >
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>
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
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelected(row)} className="text-xs text-gray-600 hover:underline">
                      View
                    </button>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-6 text-center text-gray-500">No {activeTab} found.</div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">
                {selected.ticketNumber ?? selected.disputeNumber}
              </h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-800">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p><span className="font-semibold">Type:</span> {selected.category ?? selected.type}</p>
              <p><span className="font-semibold">Status:</span> {selected.status}</p>
              <p><span className="font-semibold">Created:</span> {new Date(selected.createdAt).toLocaleString()}</p>
              {selected.subject && <p><span className="font-semibold">Subject:</span> {selected.subject}</p>}
              {selected.description && <p><span className="font-semibold">Description:</span> {selected.description}</p>}
              {selected.resolution && <p><span className="font-semibold">Resolution:</span> {selected.resolution}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
