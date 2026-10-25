import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.MOVEMIND_DATA_DIR ? path.resolve(process.env.MOVEMIND_DATA_DIR) : path.resolve(here, '../data');
const dbPath = path.join(dataDir, 'db.json');

const now = Date.now();
const daysAgo = days => new Date(now - days * 86400000).toISOString();
const sampleHazards = [
  { id:'demo-pothole-1', category:'Pothole', severity:'high', description:'Large pothole reported near a busy junction. Demo record for route-risk walkthrough.', lat:12.9160, lng:74.8520, status:'unverified', source:'Demonstration data', createdAt:daysAgo(0.4), updatedAt:daysAgo(0.4), demo:true },
  { id:'demo-water-1', category:'Waterlogging', severity:'high', description:'Waterlogging reported after rainfall. Conditions may have changed since this report.', lat:12.9220, lng:74.8420, status:'under_review', source:'Demonstration data', createdAt:daysAgo(1.2), updatedAt:daysAgo(1.2), demo:true },
  { id:'demo-damage-1', category:'Damaged road', severity:'medium', description:'Uneven road surface reported along this corridor.', lat:12.9110, lng:74.8580, status:'unverified', source:'Demonstration data', createdAt:daysAgo(3), updatedAt:daysAgo(3), demo:true },
  { id:'demo-obstruction-1', category:'Obstruction', severity:'high', description:'Temporary obstruction reported; current status is not independently confirmed.', lat:12.9170, lng:74.8500, status:'verified', source:'Demonstration data — illustrative verification state', createdAt:daysAgo(0.2), updatedAt:daysAgo(0.1), demo:true },
  { id:'demo-pothole-2', category:'Pothole', severity:'low', description:'Small pothole report for demonstration of severity differences.', lat:12.9190, lng:74.8470, status:'unverified', source:'Demonstration data', createdAt:daysAgo(8), updatedAt:daysAgo(8), demo:true },
  { id:'demo-water-2', category:'Waterlogging', severity:'medium', description:'A second waterlogging report in the sample corridor.', lat:12.9120, lng:74.8500, status:'under_review', source:'Demonstration data', createdAt:daysAgo(2), updatedAt:daysAgo(2), demo:true }
];

export function createInitialDb() {
  return { hazards: structuredClone(sampleHazards), routeHistory: [], statusHistory: [] };
}
export function loadDb() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dbPath)) { const fresh = createInitialDb(); saveDb(fresh); return fresh; }
    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (!parsed || !Array.isArray(parsed.hazards) || !Array.isArray(parsed.routeHistory)) throw new Error('Invalid database shape');
    return { hazards: parsed.hazards, routeHistory: parsed.routeHistory, statusHistory: Array.isArray(parsed.statusHistory) ? parsed.statusHistory : [] };
  } catch (error) {
    console.error('Could not read saved data; using fresh demo data:', error.message);
    return createInitialDb();
  }
}
export function saveDb(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temp, dbPath);
}
