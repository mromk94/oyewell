import { useState, useEffect } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';

export interface CustomerLocation {
  address: string;
  lat?: number;
  lng?: number;
}

interface Props {
  value: CustomerLocation;
  onChange: (loc: CustomerLocation) => void;
}

export function CustomerLocationPicker({ value, onChange }: Props) {
  const [mode, setMode] = useState<'idle' | 'manual' | 'map'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(value.address);

  useEffect(() => {
    setDraft(value.address);
  }, [value.address]);

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        onChange({
          address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setMode('manual');
      },
      (err) => {
        setLoading(false);
        setError(err.message || 'Could not access your location. You can enter it manually.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const applyManual = () => {
    onChange({ address: draft });
    setMode('idle');
  };

  return (
    <div className='rounded-2xl border border-white/10 bg-white/5 p-4 text-white'>
      <h3 className='mb-3 text-sm font-bold'>Where are you?</h3>
      {mode === 'idle' && (
        <div className='flex flex-wrap gap-2'>
          <button
            onClick={requestCurrentLocation}
            disabled={loading}
            className='flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50'
          >
            <Navigation className='h-4 w-4' /> {loading ? 'Locating...' : 'Use my current location'}
          </button>
          <button
            onClick={() => setMode('manual')}
            className='flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5'
          >
            <MapPin className='h-4 w-4' /> Enter my address
          </button>
        </div>
      )}
      {mode === 'manual' && (
        <div className='space-y-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40' />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='e.g. 12 Alhaji Road, Lagos'
              className='w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder-white/40'
            />
          </div>
          {error && <p className='text-xs text-rose-300'>{error}</p>}
          <div className='flex gap-2'>
            <button onClick={applyManual} className='rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/30'>
              Confirm
            </button>
            <button onClick={() => setMode('idle')} className='rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5'>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
