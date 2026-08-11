export interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: number;
  seen: boolean;
}

let notifications: Notification[] = [];
const listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((l) => l());
}

export function addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'seen'>) {
  const item: Notification = {
    ...notification,
    id: Math.random().toString(36).slice(2, 9),
    createdAt: Date.now(),
    seen: false,
  };
  notifications = [item, ...notifications].slice(0, 50);
  notify();
}

export function markAllSeen() {
  notifications = notifications.map((n) => ({ ...n, seen: true }));
  notify();
}

export function getNotifications() {
  return notifications;
}

export function unreadCount() {
  return notifications.filter((n) => !n.seen).length;
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  };
}
