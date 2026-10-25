import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHazardRisk, calculateRouteRisk, independentNearbyCount, riskCategory } from '../src/riskEngine.js';
import { validateHazard } from '../src/validation.js';
import { runUrbanResponseAgent } from '../src/agent.js';
const now=Date.parse('2026-10-24T12:00:00Z');
const hazard=(id,lat=12.91,lng=74.85,overrides={})=>({id,category:'Pothole',severity:'high',lat,lng,status:'unverified',createdAt:new Date(now).toISOString(),...overrides});
test('risk score remains within 0–100 and applies 50/30/20 weights',()=>{
 const h=hazard('a');const r=calculateHazardRisk(h,[h],now);
 assert.equal(r.factors.severity.contribution,50);assert.equal(r.factors.frequency.contribution,7.5);assert.equal(r.factors.recency.contribution,20);assert.equal(r.score,77.5);assert.ok(r.score>=0&&r.score<=100);
});
test('recency decays by half after seven days',()=>{
 const h=hazard('a',12.91,74.85,{createdAt:new Date(now-7*86400000).toISOString()});
 assert.equal(calculateHazardRisk(h,[h],now).factors.recency.normalized,50);
});
test('nearby frequency collapses likely duplicates',()=>{
 const a=hazard('a'), b=hazard('b',12.91001,74.85001), c=hazard('c',12.913,74.853);
 assert.equal(independentNearbyCount(a,[a,b,c]),2);
});
test('risk categories have documented thresholds',()=>{assert.equal(riskCategory(20),'Low');assert.equal(riskCategory(40),'Moderate');assert.equal(riskCategory(70),'Elevated');assert.equal(riskCategory(90),'High');});
test('invalid coordinates and categories rejected',()=>{assert.ok(validateHazard({category:'Fire',severity:'high',lat:999,lng:0}).length>=2);});
test('route without reports is insufficient data, not zero risk',()=>{const r=calculateRouteRisk({geometry:[{lat:12.91,lng:74.85}]},[],now);assert.equal(r.score,null);assert.equal(r.category,'Insufficient data');});
test('agent executes separate tools and returns evidence-backed plan',()=>{
 const h=hazard('a');const result=runUrbanResponseAgent([h],[{id:'r',name:'Test route',distanceKm:1,durationMin:5,geometry:[{lat:h.lat,lng:h.lng}]}],now);
 assert.equal(result.tools.length,7);assert.ok(result.plan.priorityHazards.length);assert.equal(result.status,'completed');
});
