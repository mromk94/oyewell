import { MapView, type MapMarker } from './MapView';
import type { LocationResult } from '../lib/api';

export interface FoodMapListing {
  id: string;
  name: string;
  point: LocationResult;
  distanceKm: number;
}

interface FoodMapProps {
  center: LocationResult;
  listings: FoodMapListing[];
}

export function FoodMap({ center, listings }: FoodMapProps) {
  const markers: MapMarker[] = listings.map((l) => ({
    id: l.id,
    point: l.point,
    label: l.name,
  }));

  return (
    <div className='space-y-3'>
      <MapView center={center} markers={markers} height={320} />
      <p className='text-xs text-white/60'>{listings.length} place(s) around you</p>
    </div>
  );
}
