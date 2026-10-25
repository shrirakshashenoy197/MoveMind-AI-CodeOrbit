import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movemind-api-test-'));
process.env.MOVEMIND_DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';
const { app } = await import('../src/index.js');
let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(dataDir, { recursive: true, force: true });
});
const post = (route, body) => fetch(`${base}${route}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
});
const validHazard = (description = 'API test hazard') => ({
  category: 'Pothole', severity: 'low', description, lat: 12.9141, lng: 74.856
});

test('POST /api/hazards accepts valid report and warns about a nearby duplicate', async () => {
  const firstResponse = await post('/api/hazards', validHazard('first API test report'));
  assert.equal(firstResponse.status, 201);
  const first = await firstResponse.json();
  assert.ok(first.hazard.id);
  const secondResponse = await post('/api/hazards', validHazard('second API test report'));
  assert.equal(secondResponse.status, 201);
  const second = await secondResponse.json();
  assert.ok(second.duplicateWarning);
});

test('POST /api/hazards rejects invalid fields and out-of-area coordinates', async () => {
  const invalid = await post('/api/hazards', { category: 'Unknown', severity: 'high', lat: 40, lng: -73 });
  assert.equal(invalid.status, 400);
  const body = await invalid.json();
  assert.ok(body.details.some(message => message.includes('Mangalore area')));
});

test('PATCH status changes a report status', async () => {
  const create = await post('/api/hazards', validHazard('status API test report'));
  const { hazard } = await create.json();
  const response = await fetch(`${base}/api/hazards/${hazard.id}/status`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'under_review' })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).hazard.status, 'under_review');
});

test('POST /api/routes/compare returns route risks', async () => {
  const response = await post('/api/routes/compare', { preference: 'balanced' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.routes.length, 3);
  assert.ok(body.routes.every(route => 'hazardCount' in route.risk));
});

test('POST /api/agent/analyze returns five workflow steps and tool log', async () => {
  const response = await post('/api/agent/analyze', {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.workflowSteps.map(step => step.step), ['Observe', 'Select tools', 'Assess', 'Compare', 'Recommend']);
  assert.ok(body.tools.length > 0);
});

test('POST /api/simulate repair excludes score and preserves saved data', async () => {
const list = await (await fetch(`${base}/api/hazards`)).json();
const target = list.hazards[0];

assert.ok(target, 'Test requires at least one saved hazard');

// Snapshot the saved hazard without its time-dependent risk calculation.
const snapshot = hazard => {
const { risk, ...stableData } = hazard;
return stableData;
};

const before = snapshot(target);

const response = await post('/api/simulate', {
hazardId: target.id,
scenario: 'repair'
});

assert.equal(response.status, 200);

const result = await response.json();
assert.equal(result.simulated.score, null);
assert.equal(result.simulated.category, 'Excluded from this scenario');
assert.equal(result.savedDataChanged, false);

const afterList = await (await fetch(`${base}/api/hazards`)).json();
const afterTarget = afterList.hazards.find(h => h.id === target.id);

assert.ok(afterTarget, 'Saved hazard should still exist after simulation');
assert.deepEqual(
snapshot(afterTarget),
before,
'Repair simulation must not modify the saved hazard'
);
});

test('GET /api/export.csv escapes formula-leading text cells', async () => {
  await post('/api/hazards', validHazard('=1+1'));
  const response = await fetch(`${base}/api/export.csv`);
  assert.equal(response.status, 200);
  const csv = await response.text();
  assert.ok(csv.includes("\"'=1+1\""));
});
