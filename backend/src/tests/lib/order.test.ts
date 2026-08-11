import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serializeOrder } from '../../lib/order.js';

describe('serializeOrder', () => {
  const order = {
    id: 'ord1',
    orderNumber: 'OW123',
    status: 'PAID',
    paymentStatus: 'SUCCESS',
    deliveryType: 'NEIGHBORHOOD',
    subtotalKobo: 10000,
    deliveryFeeKobo: 500,
    totalKobo: 10500,
    address: '12 Adebiyi Street, Ikeja, Lagos',
    phone: '08012345678',
    deliveryCode: '12345',
    createdAt: new Date(),
    items: [],
    sides: [],
  };

  it('masks customer address and phone for customer view', () => {
    const serialized = serializeOrder(order, false, true);
    assert.equal(serialized.phone, '****5678');
    assert.notEqual(serialized.address, order.address);
  });

  it('exposes address after delivered', () => {
    const delivered = { ...order, status: 'DELIVERED' };
    const serialized = serializeOrder(delivered, false, true);
    assert.equal(serialized.address, order.address);
    assert.equal(serialized.phone, order.phone);
    assert.equal(serialized.deliveryCode, '12345');
  });

  it('hides delivery code before delivered unless rider', () => {
    const serialized = serializeOrder(order, false, true);
    assert.equal(serialized.deliveryCode, null);
  });
});
