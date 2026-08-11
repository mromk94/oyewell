import { useEffect, useRef } from 'react';
import { API_BASE } from '../lib/api';
import { toast } from '../lib/toast';

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

        if (type === 'order:status') {
          toast.info(`Order ${data.orderNumber || data.orderId} is now ${data.status?.replace(/_/g, ' ').toLowerCase()}`);
        } else if (type === 'order:created') {
          toast.success(`New order created`);
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
