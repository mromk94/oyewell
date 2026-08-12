import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';
import { API_BASE } from './api';

export interface BusEvent {
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export function useOrderEvents(onEvent: (event: BusEvent) => void, enabled = true) {
  const callbackRef = useRef(onEvent);
  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource(`${API_BASE}/api/events`);
    es.addEventListener('message', (event: any) => {
      if (!event.data) return;
      try {
        const parsed = JSON.parse(event.data) as BusEvent;
        callbackRef.current(parsed);
      } catch {
        // ignore malformed
      }
    });
    es.addEventListener('error', () => {});
    return () => es.close();
  }, [enabled]);
}
