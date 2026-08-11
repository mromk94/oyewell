import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatKobo } from '../../lib/money.js';

describe('formatKobo', () => {
  it('formats kobo to naira string', () => {
    assert.equal(formatKobo(10500), '₦105');
    assert.equal(formatKobo(0), '₦0');
    assert.equal(formatKobo(500), '₦5');
  });
});
