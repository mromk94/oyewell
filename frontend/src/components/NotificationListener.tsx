import { useEffect, useRef } from 'react';
import { API_BASE } from '../lib/api';
import { toast } from '../lib/toast';
import { addNotification } from '../lib/notifications';

export default function NotificationListener() {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!('EventSource' in window)) return;

    const es = new EventSource(`${API_BASE}/api/events`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const type = data.type || '';

        const orderRef = data.orderNumber ? `order #${data.orderNumber}` : data.orderId ? `order ${data.orderId}` : 'Your order';

        const statusMessages: Record<string, string> = {
          PENDING_PAYMENT: `${orderRef} is waiting for payment.`,
          PAID: `Payment confirmed for ${orderRef}.`,
          CONFIRMED: `${orderRef} is confirmed and heading to the kitchen.`,
          COOK_ACCEPTED: `You accepted ${orderRef}. Fire up the kitchen!`,
          PREPARING: `${orderRef} is being prepared.`,
          READY_FOR_PICKUP: `${orderRef} is ready for pickup.`,
          READY_FOR_DISPATCH: `${orderRef} is ready for pickup.`,
          OUT_FOR_DELIVERY: `A rider is heading to the kitchen for ${orderRef}.`,
          PICKED_UP: `${orderRef} has been picked up.`,
          IN_TRANSIT: `${orderRef} is on the way to the customer.`,
          DELIVERED: `${orderRef} has been delivered. Enjoy!`,
          CANCELLED: `${orderRef} was cancelled.`,
        };

        if (type === 'order:status') {
          const message = statusMessages[data.status] || `${orderRef} was updated.`;
          if (data.status && (data.orderNumber || data.orderId)) {
            toast.info(message);
            addNotification({ type, message });
          }
        } else if (type === 'order:created') {
          const message = `A new order just came in.`;
          toast.success(message);
          addNotification({ type, message });
        } else if (type === 'payment:confirmed') {
          const message = `Payment confirmed for ${orderRef}.`;
          toast.success(message);
          addNotification({ type, message });
        } else if (type === 'delivery:open') {
          const message = `${orderRef} is ready for pickup.`;
          toast.info(message);
          addNotification({ type, message });
        } else if (type === 'delivery:assigned') {
          const message = `A rider has been assigned to ${orderRef}.`;
          toast.info(message);
          addNotification({ type, message });
        } else if (type === 'delivery:completed') {
          const message = `${orderRef} has been delivered. Enjoy!`;
          toast.success(message);
          addNotification({ type, message });
        } else if (type === 'payment:proof') {
          const message = `Payment proof received for ${orderRef}.`;
          toast.info(message);
          addNotification({ type, message });
        }
      } catch {
        // ignore invalid messages
      }
    };

    es.onerror = () => {
      // silently reconnect or close; the browser auto-reconnects by default
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  return null;
}
