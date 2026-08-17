import { useEffect, useMemo, useState } from 'react';
import { Search, Globe, MapPin, Flag, Check, X } from 'lucide-react';
import { fetchRegions, toggleRegionCoverage, type Region } from '../../lib/regions';
import { toast } from '../../lib/toast';

const typeIcons: Record<string, any> = {
  CONTINENT: Globe,
  COUNTRY: Flag,
  STATE: MapPin,
};

export default function RegionsTab() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchRegions({ q, type: typeFilter });
      setRegions(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, typeFilter]);

  async function toggle(id: string, covered: boolean) {
    try {
      const updated = await toggleRegionCoverage(id, covered);
      setRegions((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success(updated.isCovered ? 'Region marked as covered' : 'Region removed from coverage');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to toggle');
    }
  }

  const groups = useMemo(() => {
    const map: Record<string, Region[]> = {};
    for (const r of regions) {
      if (!map[r.type]) map[r.type] = [];
      map[r.type].push(r);
    }
    return map;
  }, [regions]);

  return (
    <div>
      <h2 className='text-2xl font-bold text-white'>Regions & coverage</h2>
      <p className='mt-1 text-white/60'>Manage covered continents, countries and states.</p>

      <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40' />
          <input
            type='text'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search region name or code'
            className='w-full rounded-2xl border border-white/20 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-white/40 outline-none focus:border-white'
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className='rounded-2xl border border-white/20 bg-white/5 p-2.5 text-white outline-none focus:border-white'
        >
          <option value='' className='bg-brand-900'>All levels</option>
          <option value='CONTINENT' className='bg-brand-900'>Continents</option>
          <option value='COUNTRY' className='bg-brand-900'>Countries</option>
          <option value='STATE' className='bg-brand-900'>States/Regions</option>
        </select>
      </div>

      {loading ? (
        <p className='mt-6 text-white/60'>Loading...</p>
      ) : regions.length === 0 ? (
        <p className='mt-6 text-white/50'>No regions found.</p>
      ) : (
        <div className='mt-6 space-y-6'>
          {Object.entries(groups).map(([type, list]) => {
            const Icon = typeIcons[type] ?? MapPin;
            return (
              <div key={type}>
                <h3 className='mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/70'>
                  <Icon className='h-4 w-4' /> {type.replace(/_/g, ' ')}
                </h3>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  {list.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-2xl border p-4 transition ${
                        r.isCovered ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className='flex items-start justify-between'>
                        <div>
                          <p className='font-bold text-white'>{r.name}</p>
                          <p className='text-xs text-white/60'>{r.code || r.id}</p>
                        </div>
                        <button
                          onClick={() => toggle(r.id, !r.isCovered)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                            r.isCovered ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {r.isCovered ? <Check className='h-4 w-4' /> : <X className='h-4 w-4' />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
