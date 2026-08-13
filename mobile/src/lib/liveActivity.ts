import type { OrderSummary } from './api';

type LiveActivityModule = typeof import('@heojeongbo/expo-live-activity');

let LiveActivity: LiveActivityModule | null = null;
try {
  LiveActivity = require('@heojeongbo/expo-live-activity');
} catch {
  // Not available in Expo Go / non-iOS builds
}

export async function ensureOrderActivity(order: OrderSummary) {
  if (!LiveActivity?.isSupported) return;
  const activityId = `order-${order.orderNumber}`;
  const terminal = order.status === 'DELIVERED' || order.status === 'CANCELLED';
  const status = order.status.replace(/_/g, ' ');
  const content = {
    status,
    message: `${order.cookName} — ${order.total}`,
    estimatedTime: order.estimatedMinutes ?? undefined,
    customData: {
      orderNumber: order.orderNumber,
      items: order.items.map((i) => i.foodName),
    },
  };

  if (terminal) {
    try { await LiveActivity.endActivity(activityId); } catch {}
    return;
  }

  try {
    const existing = await LiveActivity.getActivity(activityId);
    if (existing?.isActive) {
      await LiveActivity.updateActivity(activityId, content);
    } else {
      const config = LiveActivity.createFoodDeliveryActivity({
        id: activityId,
        restaurant: order.cookName,
        status,
        estimatedTime: order.estimatedMinutes ?? undefined,
        orderItems: order.items.map((i) => i.foodName),
      });
      await LiveActivity.startActivity(config);
    }
  } catch {}
}
