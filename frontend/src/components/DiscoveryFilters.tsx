import { useState, useEffect, useMemo } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export interface DiscoveryFiltersState {
  q: string;
  cuisine: string;
  maxPrice: string;
  available: boolean;
}

interface Props {
  view: 'home' | 'cooks' | 'restaurants' | 'nearby';
  filters: DiscoveryFiltersState;
  onChange: (filters: DiscoveryFiltersState) => void;
  cuisines?: string[];
}

const PLACEHOLDERS: Record<Props['view'], string> = {
  home: 'Search dishes...',
  restaurants: 'Search restaurants...',
  cooks: 'Search home food...',
  nearby: 'Search nearby food...',
};

export default function DiscoveryFilters({ view, filters, onChange, cuisines = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DiscoveryFiltersState>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters, open]);

  const showCuisine = view === 'cooks' || view === 'nearby';
  const cuisineOptions = useMemo(() => ['All cuisine', ...cuisines.filter(Boolean)], [cuisines]);

  return (
    <>
      <button
        onClick={() => setOpen((s) => !s)}
        className='fixed right-4 top-28 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur-md transition hover:bg-white/10 active:scale-95'
        aria-label='Search and filter'
      >
        {open ? <X className='h-4 w-4' /> : <Search className='h-4 w-4' />}
      </button>

      {open && (
        <div className='fixed right-4 top-40 z-40 w-72 rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-md sm:w-80'>
          <div className='mb-4 flex items-center gap-2 text-emerald-300'>
            <SlidersHorizontal className='h-4 w-4' />
            <h3 className='text-sm font-bold uppercase tracking-wider'>Search &amp; filter</h3>
          </div>

          <div className='space-y-3'>
            <div>
              <label className='mb-1 block text-xs font-bold text-white/60'>Search</label>
              <input
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                placeholder={PLACEHOLDERS[view]}
                className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400'
              />
            </div>

            {showCuisine && (
              <div>
                <label className='mb-1 block text-xs font-bold text-white/60'>Cuisine</label>
                <select
                  value={draft.cuisine}
                  onChange={(e) => setDraft({ ...draft, cuisine: e.target.value })}
                  className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400'
                >
                  {cuisineOptions.map((c) => (
                    <option key={c} value={c === 'All cuisine' ? '' : c} className='bg-black'>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className='mb-1 block text-xs font-bold text-white/60'>Max price (₦)</label>
              <input
                type='number'
                min={0}
                value={draft.maxPrice}
                onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
                placeholder='Any price'
                className='w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400'
              />
            </div>

            <label className='flex cursor-pointer items-center gap-2 text-sm text-white/80'>
              <input
                type='checkbox'
                checked={draft.available}
                onChange={(e) => setDraft({ ...draft, available: e.target.checked })}
                className='h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500'
              />
              Available now
            </label>
          </div>

          <div className='mt-5 flex gap-2'>
            <button
              onClick={() => {
                const cleared: DiscoveryFiltersState = { q: '', cuisine: '', maxPrice: '', available: false };
                setDraft(cleared);
                onChange(cleared);
              }}
              className='flex-1 rounded-full border border-white/10 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10'
            >
              Clear
            </button>
            <button
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className='flex-1 rounded-full bg-emerald-500 py-2 text-xs font-bold text-black transition hover:bg-emerald-400'
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}
