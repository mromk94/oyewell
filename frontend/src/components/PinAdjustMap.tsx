import { useState } from 'react';
import { MapView } from './MapView';
import type { LocationResult } from '../lib/api';

interface PinAdjustMapProps {
  initial: LocationResult;
  onChange?: (point: LocationResult) => void;
  height?: number;
}

export function PinAdjustMap({ initial, onChange, height = 240 }: PinAdjustMapProps) {
  const [point, setPoint] = useState(initial);

  function nudge(latDelta: number, lngDelta: number) {
    const next = { lat: point.lat + latDelta, lng: point.lng + lngDelta };
    setPoint(next);
    onChange?.(next);
  }

  return (
    <div className='space-y-2'>
      <MapView center={point} markers={[{ id: 'pin', point, label: 'Selected' }]} height={height} />
      <p className='text-center text-xs text-white/60'>
        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
      </p>
      <div className='flex justify-center gap-2'>
        <button onClick={() => nudge(0.001, 0)} className='rounded-full bg-white/10 px-3 py-1 text-xs text-white'>↑</button>
        <button onClick={() => nudge(-0.001, 0)} className='rounded-full bg-white/10 px-3 py-1 text-xs text-white'>↓</button>
        <button onClick={() => nudge(0, -0.001)} className='rounded-full bg-white/10 px-3 py-1 text-xs text-white'>←</button>
        <button onClick={() => nudge(0, 0.001)} className='rounded-full bg-white/10 px-3 py-1 text-xs text-white'>→</button>
      </div>
    </div>
  );
}
