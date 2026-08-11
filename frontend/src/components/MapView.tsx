import { useMemo, useState, useEffect } from 'react';
import type { LocationResult } from '../lib/api';

function useReducedMap() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const conn = (navigator as any).connection;
    const shouldReduce = mq.matches || (conn && (conn.saveData || (conn.effectiveType ?? '').startsWith('2g')));
    setReduced(shouldReduce);
    function onChange() {
      const conn = (navigator as any).connection;
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches || (conn && (conn.saveData || (conn.effectiveType ?? '').startsWith('2g'))));
    }
    mq.addEventListener('change', onChange);
    conn?.addEventListener('change', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      conn?.removeEventListener('change', onChange);
    };
  }, []);
  return reduced;
}

export interface MapMarker {
  id: string;
  point: LocationResult;
  label?: string;
}

interface MapViewProps {
  center: LocationResult;
  markers?: MapMarker[];
  height?: number;
}

export function MapView({ center, markers, height = 240 }: MapViewProps) {
  const reduced = useReducedMap();
  const markerPositions = useMemo(
    () =>
      (markers || []).map((m) => ({
        ...m,
        left: 50 + (m.point.lng - center.lng) * 10,
        top: 50 - (m.point.lat - center.lat) * 10,
      })),
    [markers, center],
  );

  if (reduced) {
    return (
      <div style={{ height }} className='overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b12] p-4 text-white'>
        <p className='text-sm font-medium'>Map reduced to save data</p>
        <p className='text-xs text-white/60'>Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>
        <ul className='mt-2 space-y-1 text-xs text-white/70'>
          {markerPositions.map((m) => (
            <li key={m.id}>{m.label || m.id} — {m.point.lat.toFixed(4)}, {m.point.lng.toFixed(4)}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      style={{ height }}
      className='relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1b12] text-white'
    >
      <div className='absolute inset-0 flex flex-col items-center justify-center p-4 text-center'>
        <p className='text-sm font-medium'>Map view</p>
        <p className='text-xs text-white/60'>Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>
        {markerPositions.length > 0 && (
          <p className='text-xs text-white/60'>{markerPositions.length} marker(s)</p>
        )}
      </div>
      {markerPositions.map((m) => (
        <div
          key={m.id}
          className='absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500/80 text-[8px] font-bold'
          style={{
            left: `${Math.max(0, Math.min(100, m.left))}%`,
            top: `${Math.max(0, Math.min(100, m.top))}%`,
          }}
          title={m.label || m.id}
        >
          {m.label?.slice(0, 1) || '·'}
        </div>
      ))}
    </div>
  );
}
