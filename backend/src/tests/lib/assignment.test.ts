import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRiderEligibleForType } from '../../lib/assignment.js';
import { DeliveryType } from '@prisma/client';

describe('isRiderEligibleForType', () => {
  const base = {
    isApproved: true,
    isActive: true,
    available: true,
    neighborhoodApproval: 'APPROVED',
    professionalApproval: 'NOT_APPLIED',
  };

  it('approves neighborhood rider for NEIGHBORHOOD', () => {
    assert.equal(isRiderEligibleForType(base, DeliveryType.NEIGHBORHOOD), true);
  });

  it('rejects professional if not approved professional', () => {
    assert.equal(isRiderEligibleForType(base, DeliveryType.PROFESSIONAL), false);
  });

  it('approves professional when professional approved', () => {
    assert.equal(
      isRiderEligibleForType({ ...base, professionalApproval: 'APPROVED' }, DeliveryType.PROFESSIONAL),
      true,
    );
  });

  it('rejects if unavailable', () => {
    assert.equal(isRiderEligibleForType({ ...base, available: false }, DeliveryType.NEIGHBORHOOD), false);
  });
});
