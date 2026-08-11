import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionOrder,
  canTransitionRider,
  assertOrderTransition,
  normalizeOrderStatus,
  generateVerificationCode,
  assertCodeAttemptAllowed,
  clearCodeAttempts,
} from '../../lib/order-state.js';

describe('order state machine', () => {
  it('allows the canonical happy path', () => {
    const path = [
      'PENDING_PAYMENT',
      'CONFIRMED',
      'COOK_ACCEPTED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      assert.ok(canTransitionOrder(path[i], path[i + 1]), `${path[i]} -> ${path[i + 1]}`);
    }
  });

  it('rejects skipping stages', () => {
    assert.equal(canTransitionOrder('PENDING_PAYMENT', 'DELIVERED'), false);
    assert.equal(canTransitionOrder('CONFIRMED', 'READY_FOR_PICKUP'), false);
    assert.equal(canTransitionOrder('PENDING_PAYMENT', 'OUT_FOR_DELIVERY'), false);
  });

  it('is idempotent for repeats of the same state', () => {
    assert.ok(canTransitionOrder('DELIVERED', 'DELIVERED'));
    assert.ok(canTransitionOrder('CONFIRMED', 'CONFIRMED'));
  });

  it('terminal states cannot move', () => {
    assert.equal(canTransitionOrder('DELIVERED', 'CANCELLED'), false);
    assert.equal(canTransitionOrder('CANCELLED', 'CONFIRMED'), false);
  });

  it('any active state can be cancelled', () => {
    for (const s of ['PENDING_PAYMENT', 'CONFIRMED', 'COOK_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']) {
      assert.ok(canTransitionOrder(s, 'CANCELLED'), `${s} -> CANCELLED`);
    }
  });

  it('normalizes legacy aliases', () => {
    assert.equal(normalizeOrderStatus('PAID'), 'CONFIRMED');
    assert.equal(normalizeOrderStatus('READY_FOR_DISPATCH'), 'READY_FOR_PICKUP');
    assert.ok(canTransitionOrder('PAID', 'COOK_ACCEPTED'));
    assert.ok(canTransitionOrder('READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY'));
  });

  it('assertOrderTransition throws on illegal moves', () => {
    assert.throws(() => assertOrderTransition('PENDING_PAYMENT', 'DELIVERED'));
    assert.doesNotThrow(() => assertOrderTransition('PREPARING', 'READY_FOR_PICKUP'));
  });
});

describe('rider state machine', () => {
  it('enforces pickup before transit before delivery', () => {
    assert.ok(canTransitionRider('UNASSIGNED', 'ASSIGNED'));
    assert.ok(canTransitionRider('ASSIGNED', 'PICKED_UP'));
    assert.ok(canTransitionRider('PICKED_UP', 'IN_TRANSIT'));
    assert.ok(canTransitionRider('IN_TRANSIT', 'DELIVERED'));
    assert.equal(canTransitionRider('ASSIGNED', 'DELIVERED'), false);
    assert.equal(canTransitionRider('UNASSIGNED', 'PICKED_UP'), false);
    assert.equal(canTransitionRider('ASSIGNED', 'IN_TRANSIT'), false);
  });
});

describe('verification codes', () => {
  it('generates 5-digit numeric codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateVerificationCode();
      assert.match(code, /^\d{5}$/);
    }
  });

  it('rate limits brute-force attempts', () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      assert.doesNotThrow(() => assertCodeAttemptAllowed(key));
    }
    assert.throws(() => assertCodeAttemptAllowed(key));
    clearCodeAttempts(key);
    assert.doesNotThrow(() => assertCodeAttemptAllowed(key));
  });
});
