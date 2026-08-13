import {
  isSupported,
  createFoodDeliveryActivity,
  startActivity,
  updateActivity,
  endActivity,
  getActivity,
  type LiveActivityConfig,
  type ActivityContent,
} from '@heojeongbo/expo-live-activity';
import type { OrderSummary } from './api';

export async function ensureOrderActivity(order: OrderSummary) {
  if (!isSupported) return;
  const activityId = `order-${order.orderNumber}`;
  const terminal = order.status === 'DELIVERED' || order.status === 'CANCELLED';
  const content: ActivityContent = {
    status: order.status.replace(/_/g, ' '),
    message: `${order.cookName} — ${order.total}`,
    estimatedTime: order.estimatedMinutes ?? undefined,
    customData: {
      orderNumber: order.orderNumber,
      items: order.items.map((i) => i.foodName),
    },
  };

  if (terminal) {
    try { await endActivity(activityId); } catch {}
    return;
  }

  const existing = await getActivity(activityId);
  if (existing?.isActive) {
    try { await updateActivity(activityId, content); } catch {}
  } else {
    const config: LiveActivityConfig = createFoodDeliveryActivity({
      id: activityId,
      restaurant: order.cookName,
      status: order.status.replace(/_/g, ' '),
      estimatedTime: order.estimatedMinutes ?? undefined,
      orderItems: order.items.map((i) => i.foodName),
    });
    try { await startActivity(config); } catch {}
  }
}
