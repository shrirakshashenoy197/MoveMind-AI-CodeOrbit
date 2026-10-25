import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDb, saveDb, createInitialDb } from './data.js';
import { calculateHazardRisk, calculateRouteRisk, haversineMeters } from './riskEngine.js';
import { getCandidateRoutes } from './routes.js';
import { runUrbanResponseAgent, analyzeCandidateRoutes, compareRouteTradeoffs } from './agent.js';
import { CATEGORIES, SEVERITIES, STATUSES, validateHazard } from './validation.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
let db = loadDb();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit:'100kb' }));

app.get('/api/health', (_req,res) => res.json({ status:'ok', service:'MoveMind AI API', storage:'local JSON file', time:new Date().toISOString() }));
app.get('/api/hazards', (req,res) => {
  const { category, severity, status, risk, search, days } = req.query;
  let list = db.hazards.map(h => ({ ...h, risk:calculateHazardRisk(h,db.hazards) }));
  if (category && CATEGORIES.includes(category)) list = list.filter(h => h.category === category);
  if (severity && SEVERITIES.includes(severity)) list = list.filter(h => h.severity === severity);
  if (status && STATUSES.includes(status)) list = list.filter(h => h.status === status);
  if (risk) list = list.filter(h => h.risk.category.toLowerCase() === String(risk).toLowerCase());
  if (days && Number.isFinite(Number(days))) list = list.filter(h => Date.now()-Date.parse(h.createdAt) <= Number(days)*86400000);
  if (search) { const q=String(search).toLowerCase(); list=list.filter(h => `${h.category} ${h.description} ${h.status} ${h.source}`.toLowerCase().includes(q)); }
  res.json({ hazards:list, total:list.length, dataSource:'Saved demo and community reports' });
});
app.post('/api/hazards', (req,res) => {
  const body = req.body || {};
  const errors = validateHazard(body);
  if (errors.length) return res.status(400).json({ error:'Validation failed', details:errors });
  const duplicate = db.hazards.filter(h => h.category===body.category && haversineMeters(h,body)<=35);
  const now = new Date().toISOString();
  const hazard = { id:nanoid(10), category:body.category, severity:body.severity, description:(body.description || '').trim(), lat:body.lat, lng:body.lng, status:'unverified', source:'Community submission', createdAt:now, updatedAt:now, demo:false };
  db.hazards.unshift(hazard); saveDb(db);
  res.status(201).json({ hazard:{...hazard,risk:calculateHazardRisk(hazard,db.hazards)}, duplicateWarning:duplicate.length ? { count:duplicate.length, message:`${duplicate.length} nearby same-category report(s) may describe the same incident. Your report was saved for review.` } : null, message:'Report saved as unverified.' });
});
app.patch('/api/hazards/:id/status', (req,res) => {
  const h=db.hazards.find(x=>x.id===req.params.id);
  if (!h) return res.status(404).json({error:'Hazard not found'});
  if (!STATUSES.includes(req.body?.status)) return res.status(400).json({error:'Unsupported status'});
  const previous=h.status; h.status=req.body.status; h.updatedAt=new Date().toISOString();
  db.statusHistory.push({ id:nanoid(8), hazardId:h.id, from:previous, to:h.status, at:h.updatedAt }); saveDb(db);
  res.json({hazard:h, message:`Status changed from ${previous} to ${h.status}.`});
});
app.get('/api/dashboard', (_req,res) => {
  const hazards=db.hazards.map(h=>({...h,risk:calculateHazardRisk(h,db.hazards)}));
  const by=(key)=>hazards.reduce((acc,h)=>{const k=h[key];acc[k]=(acc[k]||0)+1;return acc;},{});
  res.json({ stats:{total:hazards.length,highSeverity:hazards.filter(h=>h.severity==='high').length,awaitingVerification:hazards.filter(h=>h.status!=='verified').length,verified:hazards.filter(h=>h.status==='verified').length,routesAnalyzed:db.routeHistory.length}, categoryDistribution:by('category'), severityDistribution:by('severity'), statusDistribution:by('status'), riskDistribution:hazards.reduce((a,h)=>{a[h.risk.category]=(a[h.risk.category]||0)+1;return a;},{}), recent:hazards.slice(0,5), priorities:[...hazards].sort((a,b)=>b.risk.score-a.risk.score).slice(0,5), routeHistory:db.routeHistory.slice(0,5), dataSource:'Saved reports; sample records are labelled Demonstration data' });
});
app.get('/api/routes', (_req,res)=>res.json({routes:getCandidateRoutes(), source:'Illustrative demo routes; no live traffic'}));
app.post('/api/routes/compare', (req,res) => {
  const routes=getCandidateRoutes();
  const analysis=analyzeCandidateRoutes(routes,db.hazards);
  const comparison=compareRouteTradeoffs(analysis);
  const result={id:nanoid(8), createdAt:new Date().toISOString(), routes:analysis.map(r=>({id:r.id,name:r.name,distanceKm:r.distanceKm,durationMin:r.durationMin,source:r.source,geometry:r.geometry,risk:r.risk})), comparison, preference:req.body?.preference || 'balanced', origin:req.body?.origin || 'Mangalore demo origin', destination:req.body?.destination || 'Mangalore demo destination', note:'Route geometry, distances and durations are illustrative demo data; travel time is not live traffic.'};
  db.routeHistory.unshift(result); db.routeHistory=db.routeHistory.slice(0,30); saveDb(db);
  res.json(result);
});
app.get('/api/routes/history', (_req,res)=>res.json({history:db.routeHistory}));
app.post('/api/agent/analyze', (_req,res)=>res.json(runUrbanResponseAgent(db.hazards)));
app.post('/api/simulate', (req,res) => {
  const { hazardId, scenario }=req.body||{};
  const original=db.hazards.find(h=>h.id===hazardId);
  if (!original) return res.status(404).json({error:'Select a saved hazard to simulate.'});
  const allowed=['repair','reduce-severity','age-report'];
  if (!allowed.includes(scenario)) return res.status(400).json({error:'Unsupported scenario'});
  const before=calculateHazardRisk(original,db.hazards);
  const hypothetical={...original};
  if (scenario==='repair') hypothetical.excludedFromScenario=true;
  if (scenario==='reduce-severity') hypothetical.severity=({high:'medium',medium:'low',low:'low'})[original.severity];
  if (scenario==='age-report') hypothetical.createdAt=new Date(Date.now()-14*86400000).toISOString();
  const simulatedReports=scenario==='repair'?db.hazards.filter(h=>h.id!==hazardId):db.hazards.map(h=>h.id===hazardId?hypothetical:h);
  const after=scenario==='repair'?{score:null,category:'Excluded from this scenario',factors:{},explanation:'This report is excluded from this hypothetical scenario only; no zero-risk score is assigned and the saved report remains unchanged.'}:calculateHazardRisk(hypothetical,simulatedReports);
  const routes=getCandidateRoutes().map(r=>({ ...r, before:calculateRouteRisk(r,db.hazards), after:calculateRouteRisk(r,simulatedReports) }));
  return res.json({scenario,hypothetical:true,hazardId,original:{score:before.score,category:before.category,factors:before.factors},simulated:{score:after.score,category:after.category,factors:after.factors},difference:after.score===null?null:after.score-before.score,explanation:scenario==='repair'?'Hypothetically excludes this hazard from calculations; permanent records were not changed.':scenario==='reduce-severity'?'Reduces the selected report severity by one level for this scenario only.':'Sets the selected report age to 14 days for this scenario only.',routeChanges:routes.map(r=>({id:r.id,name:r.name,before:r.before.score,after:r.after.score,difference:r.before.score===null||r.after.score===null?null:Math.round((r.after.score-r.before.score)*10)/10})),savedDataChanged:false});
});
app.post('/api/demo/reset', (_req,res) => { db.hazards=db.hazards.filter(h=>!h.demo); db.hazards.unshift(...createInitialDb().hazards); db.routeHistory=[]; saveDb(db); res.json({message:'Demonstration records reset. Community submissions were preserved.',hazardCount:db.hazards.length}); });
app.get('/api/export.csv', (_req,res) => {
  const rows=[['id','category','severity','description','latitude','longitude','status','createdAt','source','riskScore','riskCategory']];
  for(const h of db.hazards){const r=calculateHazardRisk(h,db.hazards);rows.push([h.id,h.category,h.severity,h.description,h.lat,h.lng,h.status,h.createdAt,h.source,r.score,r.category]);}
  const csv=rows.map(row=>row.map((v,index)=>{ let value=String(v??''); if(typeof v === 'string' && /^[=+\-@]/.test(value)) value="'"+value; return `"${value.replaceAll('"','""')}"`; }).join(',')).join('\r\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="movemind-hazard-report.csv"');res.send(csv);
});
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Unexpected server error',message:'The request could not be completed. Please try again.'});});
export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`MoveMind AI listening on port ${PORT}`));
}
