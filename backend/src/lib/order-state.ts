import crypto from 'node:crypto';
import { ApiError } from './errors.js';
import { emitEvent } from './realtime.js';
import { logAudit } from './audit.js';

/**
 * Authoritative order lifecycle.
 * PENDING_PAYMENT -> CONFIRMED -> COOK_ACCEPTED -> PREPARING -> READY_FOR_PICKUP
 *   -> OUT_FOR_DELIVERY -> DELIVERED
 * Any non-terminal state -> CANCELLED
 */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COOK_ACCEPTED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  COOK_ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** Rider/delivery sub-lifecycle stored on Order.riderStatus */
export const RIDER_TRANSITIONS: Record<string, string[]> = {
  UNASSIGNED: ['ASSIGNED'],
  ASSIGNED: ['PICKED_UP', 'UNASSIGNED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
};

/** Legacy status values found in historical data mapped onto the canonical machine. */
const STATUS_ALIASES: Record<string, string> = {
  PAID: 'CONFIRMED',
  READY_FOR_DISPATCH: 'READY_FOR_PICKUP',
  PICKED_UP: 'OUT_FOR_DELIVERY',
};

export function normalizeOrderStatus(status: string): string {
  return STATUS_ALIASES[status] ?? status;
}

export function canTransitionOrder(from: string, to: string): boolean {
  const current = normalizeOrderStatus(from);
  if (current === to) return true; // idempotent no-op
  return ORDER_TRANSITIONS[current]?.includes(to) ?? false;
}

export function assertOrderTransition(from: string, to: string) {
  if (!canTransitionOrder(from, to)) {
    throw new ApiError(400, `Order cannot move from ${from} to ${to}`, 'INVALID_TRANSITION');
  }
}

export function canTransitionRider(from: string, to: string): boolean {
  if (from === to) return true;
  return RIDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRiderTransition(from: string, to: string) {
  if (!canTransitionRider(from, to)) {
    throw new ApiError(400, `Delivery cannot move from ${from} to ${to}`, 'INVALID_TRANSITION');
  }
}

/** Emits the canonical real-time event + audit record after a committed transition. */
export function afterOrderTransition(
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus?: string;
    riderStatus?: string;
    riderId?: string | null;
    cookId?: string | null;
    customerId?: string | null;
  },
  opts: { actor?: string; previousStatus?: string; note?: string } = {},
) {
  emitEvent('order:status', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    riderStatus: order.riderStatus,
    riderId: order.riderId ?? undefined,
    cookId: order.cookId ?? undefined,
  });
  logAudit({
    actorId: opts.actor,
    actorType: 'ORDER_TRANSITION',
    action: `ORDER_${order.status}`,
    targetId: order.id,
    targetType: 'ORDER',
    reference: order.orderNumber,
    reason: opts.note,
    oldState: opts.previousStatus ? { status: opts.previousStatus } : undefined,
    newState: { status: order.status, riderStatus: order.riderStatus },
  }).catch(() => {});
}

/** Generates a numeric verification code. Uniqueness enforced by DB unique constraint + retry at call site. */
export function generateVerificationCode(): string {
  return String(crypto.randomInt(10000, 100000));
}

// ---------------------------------------------------------------------------
// Brute-force protection for code verification (pickup + delivery codes).
// In-memory sliding window: max attempts per order per window.
// ---------------------------------------------------------------------------
const CODE_ATTEMPT_WINDOW_MS = Number(process.env.CODE_ATTEMPT_WINDOW_MS) || 10 * 60 * 1000;
const CODE_ATTEMPT_MAX = Number(process.env.CODE_ATTEMPT_MAX) || 5;
const codeAttempts = new Map<string, { count: number; reset: number }>();

export function assertCodeAttemptAllowed(key: string) {
  const now = Date.now();
  const entry = codeAttempts.get(key);
  if (!entry || now > entry.reset) {
    codeAttempts.set(key, { count: 1, reset: now + CODE_ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > CODE_ATTEMPT_MAX) {
    throw new ApiError(429, 'Too many code attempts. Try again later.', 'CODE_RATE_LIMITED');
  }
}

export function clearCodeAttempts(key: string) {
  codeAttempts.delete(key);
}
