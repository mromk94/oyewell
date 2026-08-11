import { describe, it } from 'node:test';
import assert from 'node:assert';
import { haversineMeters, validateLocation, isLocationFresh } from '../lib/location.js';

describe('location', () => {
  it('haversineMeters returns a small distance for nearby Lagos points', () => {
    const a = { lat: 6.5244, lng: 3.3792 };
    const b = { lat: 6.5254, lng: 3.3802 };
    const d = haversineMeters(a, b);
    assert.ok(d > 100 && d < 200, `expected ~157m, got ${d}`);
  });

  it('validateLocation accepts valid input', () => {
    const result = validateLocation({ lat: 6.5, lng: 3.4 });
    assert.ok(result);
    assert.equal(result?.lat, 6.5);
    assert.equal(result?.lng, 3.4);
  });

  it('validateLocation rejects out of bounds', () => {
    assert.equal(validateLocation({ lat: 100, lng: 0 }), null);
    assert.equal(validateLocation({ lat: 0, lng: 200 }), null);
  });

  it('isLocationFresh detects stale and fresh updates', () => {
    assert.equal(isLocationFresh(new Date(Date.now() - 10_000), 60_000), true);
    assert.equal(isLocationFresh(new Date(Date.now() - 120_000), 60_000), false);
  });

  it('handles many concurrent haversine calculations', async () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      a: { lat: 6.5 + i * 0.001, lng: 3.3 + i * 0.001 },
      b: { lat: 6.6 + i * 0.001, lng: 3.4 + i * 0.001 },
    }));
    const results = await Promise.all(points.map((p) => haversineMeters(p.a, p.b)));
    assert.equal(results.length, 100);
    assert.ok(results.every((d) => d > 0));
  });

  it('regression: exact equator and prime meridian boundaries', () => {
    assert.equal(validateLocation({ lat: 0, lng: 0 })?.lat, 0);
    assert.equal(validateLocation({ lat: -90, lng: 180 })?.lat, -90);
    assert.equal(validateLocation({ lat: 90, lng: -180 })?.lng, -180);
  });
});
