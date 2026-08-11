import type { LocationResult } from '../lib/api';

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
  return (
    <div
      style={{ height }}
      className='relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-white'
    >
      <div className='absolute inset-0 flex flex-col items-center justify-center p-4 text-center'>
        <p className='text-sm font-medium'>Map view</p>
        <p className='text-xs text-white/60'>Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>
        {markers && markers.length > 0 && (
          <p className='text-xs text-white/60'>{markers.length} marker(s)</p>
        )}
      </div>
      {markers?.map((m) => (
        <div
          key={m.id}
          className='absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500/80 text-[8px] font-bold'
          style={{
            left: `${50 + (m.point.lng - center.lng) * 10}%`,
            top: `${50 - (m.point.lat - center.lat) * 10}%`,
          }}
          title={m.label || m.id}
        >
          {m.label?.slice(0, 1) || '·'}
        </div>
      ))}
    </div>
  );
}
