import { calculateHazardRisk, calculateRouteRisk } from './riskEngine.js';
import { getCandidateRoutes } from './routes.js';

export function retrieveRelevantReports(hazards) {
  return { reports: [...hazards], summary: `Retrieved ${hazards.length} saved report(s).` };
}
export function processAndValidateReports(reports) {
  const valid = reports.filter(h => h.id && h.category && h.severity && Number.isFinite(h.lat) && Number.isFinite(h.lng));
  return { reports: valid, rejectedCount: reports.length - valid.length, summary: `${valid.length} report(s) passed basic data checks; ${reports.length-valid.length} excluded.` };
}
export function calculateHazardRisks(reports, now = Date.now()) {
  return reports.map(h => ({ ...h, risk: calculateHazardRisk(h, reports, now) }));
}
export function analyzeCandidateRoutes(routes, reports, now = Date.now()) {
  return routes.map(route => ({ ...route, risk: calculateRouteRisk(route, reports, now) }));
}
export function compareRouteTradeoffs(routes) {
  const withData = routes.filter(r => r.risk.score !== null);
  const lowestRisk = withData.length ? [...withData].sort((a,b) => a.risk.score-b.risk.score)[0] : null;
  const shortest = [...routes].sort((a,b) => a.distanceKm-b.distanceKm)[0];
  const fastest = [...routes].sort((a,b) => a.durationMin-b.durationMin)[0];
  return { lowestRiskRouteId: lowestRisk?.id || null, shortestRouteId: shortest?.id || null, fastestRouteId: fastest?.id || null,
    summary: lowestRisk ? `${lowestRisk.name} has the lowest estimated risk among routes with associated reports. ${shortest.name} is shortest and ${fastest.name} has the shortest estimated time. These are separate trade-offs.` : 'No candidate route has associated reports; route risk is insufficiently known.' };
}
export function rankInspectionPriorities(scoredReports) {
  const action = h => h.status !== 'verified' && h.risk.score >= 60 ? 'Review the high-priority unverified report' :
    h.risk.factors.frequency.nearbyIndependentReports >= 3 ? 'Consider an inspection where independent reports cluster' :
    h.risk.factors.recency.ageDays > 14 ? 'Check whether this older report still reflects current conditions' :
    h.status !== 'verified' ? 'Review details and seek corroboration' : 'Monitor the reported condition';
  return [...scoredReports].sort((a,b) => b.risk.score-a.risk.score).map((h,i) => ({ ...h, priorityRank:i+1, suggestedAction:action(h), priorityReason:`${h.risk.category} estimate (${h.risk.score}/100); ${h.risk.factors.frequency.nearbyIndependentReports ?? 'unknown'} independent nearby report(s); status: ${h.status}.` }));
}
export function generateResponsePlan(priorities, routeAnalysis, comparison, limitations) {
  const top = priorities.slice(0, 3).map(h => ({ id:h.id, category:h.category, severity:h.severity, score:h.risk.score, location:{lat:h.lat,lng:h.lng}, reason:h.priorityReason, suggestedAction:h.suggestedAction }));
  const routes = routeAnalysis.map(r => ({ id:r.id, name:r.name, score:r.risk.score, category:r.risk.category, hazardCount:r.risk.hazardCount, distanceKm:r.distanceKm, durationMin:r.durationMin }));
  return {
    headline: top.length ? `Review ${top.length} highest-priority reported location(s)` : 'More reports are needed for an evidence-backed inspection list',
    priorityHazards: top, routeTradeoffs: comparison, routes,
    recommendations: [
      ...(top.length ? [`Start by reviewing ${top[0].category.toLowerCase()} report (${top[0].score}/100 estimate): ${top[0].suggestedAction.toLowerCase()}.`] : ['Invite community reports for the area before drawing route conclusions.']),
      comparison.summary,
      'Treat all scores as provisional estimates and confirm current conditions before making travel or inspection decisions.'
    ],
    limitations
  };
}

export function runUrbanResponseAgent(hazards, routes = getCandidateRoutes(), now = Date.now()) {
  const log = [];
  const run = (name, fn) => { const result = fn(); log.push({ tool:name, status:'completed', summary:result.summary || `${Array.isArray(result) ? result.length : 'Analysis'} result(s) produced.` }); return result; };
  const retrieved = run('retrieveRelevantReports', () => retrieveRelevantReports(hazards));
  const processed = run('processAndValidateReports', () => processAndValidateReports(retrieved.reports));
  const scored = run('calculateHazardRisks', () => calculateHazardRisks(processed.reports, now));
  const routeAnalysis = run('analyzeCandidateRoutes', () => analyzeCandidateRoutes(routes, processed.reports, now));
  const comparison = run('compareRouteTradeoffs', () => compareRouteTradeoffs(routeAnalysis));
  const priorities = run('rankInspectionPriorities', () => rankInspectionPriorities(scored));
  const limitations = [
    'Community reports may be incomplete, outdated, duplicated or inaccurate.',
    'Candidate route geometry and travel times are illustrative demonstration data, not live navigation or traffic.',
    'No official municipal verification or real-world safety validation is integrated.',
    'This deterministic tool workflow does not use an LLM or independently contact authorities.'
  ];
  const plan = run('generateResponsePlan', () => generateResponsePlan(priorities, routeAnalysis, comparison, limitations));
  return {
    mode: 'Deterministic tool-using workflow',
    status: 'completed',
    generatedAt: new Date(now).toISOString(),
    reportsConsidered: processed.reports.length,
    rejectedReports: processed.rejectedCount,
    workflowSteps: [
      { step: 'Observe', summary: `Read ${retrieved.reports.length} saved report(s).` },
      { step: 'Select tools', summary: 'Tool order is a fixed, rule-based sequence in this prototype; no LLM selects tools.' },
      { step: 'Assess', summary: 'Calculated hazard risk and candidate-route risk using the provisional 50/30/20 weights.' },
      { step: 'Compare', summary: comparison.summary },
      { step: 'Recommend', summary: plan.headline }
    ],
    tools: log, scoredHazards: scored, routeAnalysis, comparison, priorities, plan, limitations
  };
}
