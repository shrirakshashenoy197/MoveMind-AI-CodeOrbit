import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRouteRisk, distanceToRouteMeters, haversineMeters } from '../src/riskEngine.js';
import { getCandidateRoutes, associateHazardsToRoute, routeDistanceKm } from '../src/routes.js';
import { validateHazard } from '../src/validation.js';
import { createInitialDb } from '../src/data.js';

const now = Date.parse('2026-10-24T12:00:00Z');
const report = (id, lat, lng, overrides = {}) => ({
  id, category: 'Pothole', severity: 'low', lat, lng,
  status: 'unverified', createdAt: new Date(now).toISOString(), ...overrides
});

test('route score and distinct hazard count do not increase with nearby duplicates', () => {
  const route = { id: 'route-c', corridorMeters: 350, geometry: [{ lat: 12.9141, lng: 74.856 }, { lat: 12.924, lng: 74.837 }] };
  const original = report('original', 12.9142, 74.8559);
  const baseline = calculateRouteRisk(route, [original], now);
  const duplicates = Array.from({ length: 4 }, (_, i) => report(`dup-${i}`, 12.9142 + i * 0.000005, 74.8559 + i * 0.000005));
  const withDuplicates = calculateRouteRisk(route, [original, ...duplicates], now);
  assert.equal(withDuplicates.score, baseline.score);
  assert.equal(withDuplicates.hazardCount, baseline.hazardCount);
  assert.equal(withDuplicates.repeatedReportCount, 4);
});

test('candidate routes share origin and destination and distance matches geometry', () => {
  const routes = getCandidateRoutes();
  assert.equal(new Set(routes.map(r => `${r.origin.lat},${r.origin.lng}`)).size, 1);
  assert.equal(new Set(routes.map(r => `${r.destination.lat},${r.destination.lng}`)).size, 1);
  for (const route of routes) {
    assert.equal(route.distanceKm, routeDistanceKm(route.geometry));
    assert.ok(route.durationMin > 0);
  }
  const demoHazards = createInitialDb().hazards;
  assert.ok(associateHazardsToRoute(routes[0], demoHazards).length > associateHazardsToRoute(routes[1], demoHazards).length);
  assert.equal(associateHazardsToRoute(routes[2], demoHazards).length, 0);
});

test('route association uses line-segment distance, not only vertices', () => {
  const route = { geometry: [{ lat: 12.9, lng: 74.8 }, { lat: 12.9, lng: 74.81 }] };
  const midLineReport = report('mid', 12.9005, 74.805);
  assert.ok(distanceToRouteMeters(route, midLineReport) < 100);
  assert.equal(associateHazardsToRoute(route, [midLineReport], 100).length, 1);
});

test('route with no reports says insufficient data, not safe', () => {
  const route = getCandidateRoutes()[2];
  const result = calculateRouteRisk(route, [], now);
  assert.equal(result.score, null);
  assert.equal(result.category, 'Insufficient data');
});

test('validation rejects coordinates outside the Mangalore area', () => {
  const valid = { category: 'Pothole', severity: 'low', lat: 12.914, lng: 74.856 };
  assert.deepEqual(validateHazard(valid), []);
  assert.ok(validateHazard({ ...valid, lat: 28.6, lng: 77.2 }).some(message => message.includes('Mangalore area')));
});

test('haversine distance is finite for valid Mangalore points', () => {
  assert.ok(Number.isFinite(haversineMeters({ lat: 12.9, lng: 74.8 }, { lat: 12.91, lng: 74.81 })));
});

test('repair simulation source data fixture remains unchanged when cloned', () => {
  const db = createInitialDb();
  const before = structuredClone(db.hazards);
  const simulated = db.hazards.filter(h => h.id !== db.hazards[0].id);
  assert.equal(simulated.length, before.length - 1);
  assert.deepEqual(db.hazards, before);
});
