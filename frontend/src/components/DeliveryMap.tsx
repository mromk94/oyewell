import { MapView } from './MapView';
import type { OrderSummary } from '../lib/api';

export function DeliveryMap({ order }: { order: OrderSummary }) {
  if (!order.riderLocation) {
    return <p className='text-sm text-white/60'>Rider location will appear here when available.</p>;
  }

  return (
    <div className='space-y-2'>
      <MapView
        center={order.riderLocation}
        markers={[
          { id: 'rider', point: order.riderLocation, label: 'Rider' },
        ]}
        height={220}
      />
      <p className='text-xs text-white/50'>
        Last updated: {new Date(order.riderLocation.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
