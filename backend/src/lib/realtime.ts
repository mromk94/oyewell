import { EventEmitter } from 'events';

export interface BusEvent {
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const bus = new EventEmitter();
bus.setMaxListeners(0);

export function emitEvent(type: string, payload: Record<string, unknown>) {
  const event: BusEvent = { type, payload, createdAt: new Date().toISOString() };
  bus.emit('bus', event);
}

export function subscribe(fn: (event: BusEvent) => void) {
  bus.on('bus', fn);
  return () => bus.off('bus', fn);
}
