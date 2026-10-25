export const RISK_WEIGHTS = Object.freeze({ severity: 0.5, frequency: 0.3, recency: 0.2 });
export const SEVERITY_VALUE = Object.freeze({ low: 25, medium: 60, high: 100 });
export const RECENCY_HALF_LIFE_DAYS = 7;
export const FREQUENCY_STEP = 25;

export function haversineMeters(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return Infinity;
  const rad = n => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function riskCategory(score) {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Elevated';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

export function recencyValue(createdAt, now = Date.now()) {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return { value: 50, known: false, ageDays: null };
  const ageDays = Math.max(0, (now - timestamp) / 86400000);
  return { value: 100 * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS), known: true, ageDays };
}

// Frequency counts independent same-category reports within 500 m, including the current record.
// Likely duplicate clusters within 35 m are counted only once.
export function independentNearbyCount(hazard, reports, radiusMeters = 500, duplicateMeters = 35) {
  if (!Number.isFinite(hazard.lat) || !Number.isFinite(hazard.lng)) return null;
  const candidates = reports.filter(r =>
    r.category === hazard.category &&
    haversineMeters(hazard, r) <= radiusMeters
  ).sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0));
  const representatives = [];
  for (const report of candidates) {
    if (!representatives.some(rep => haversineMeters(rep, report) <= duplicateMeters)) representatives.push(report);
  }
  return representatives.length;
}

export function calculateHazardRisk(hazard, reports, now = Date.now()) {
  const severityKnown = Boolean(SEVERITY_VALUE[hazard.severity]);
  const severity = severityKnown ? SEVERITY_VALUE[hazard.severity] : 50;
  const nearbyCount = independentNearbyCount(hazard, reports);
  const frequencyKnown = nearbyCount !== null;
  const frequency = frequencyKnown ? Math.min(100, nearbyCount * FREQUENCY_STEP) : 50;
  const recent = recencyValue(hazard.createdAt, now);
  const contributions = {
    severity: round(severity * RISK_WEIGHTS.severity),
    frequency: round(frequency * RISK_WEIGHTS.frequency),
    recency: round(recent.value * RISK_WEIGHTS.recency)
  };
  const score = round(Math.max(0, Math.min(100, contributions.severity + contributions.frequency + contributions.recency)));
  const knownFactors = [severityKnown, frequencyKnown, recent.known].filter(Boolean).length;
  const confidence = knownFactors === 3 ? 'Moderate' : 'Limited';
  return {
    score, category: riskCategory(score), factors: {
      severity: { normalized: severity, weight: RISK_WEIGHTS.severity, contribution: contributions.severity, label: hazard.severity || 'Unknown' },
      frequency: { normalized: frequency, weight: RISK_WEIGHTS.frequency, contribution: contributions.frequency, nearbyIndependentReports: nearbyCount },
      recency: { normalized: round(recent.value), weight: RISK_WEIGHTS.recency, contribution: contributions.recency, ageDays: recent.ageDays }
    },
    confidence,
    explanation: `${hazard.severity || 'Unknown'} severity contributes ${contributions.severity}/50 weighted points; ${nearbyCount === null ? 'nearby report count is unavailable' : `${nearbyCount} independent nearby ${nearbyCount === 1 ? 'report' : 'reports'} contribute ${contributions.frequency}/30 points`}; recency contributes ${contributions.recency}/20 points. This is a provisional estimate, not an official safety rating.`
  };
}

export function pointToSegmentMeters(point, start, end) {
  // Local equirectangular projection is sufficiently accurate for short Mangalore corridors.
  const meanLat = (start.lat + end.lat + point.lat) / 3;
  const metersPerLat = 111_132;
  const metersPerLng = 111_320 * Math.cos(meanLat * Math.PI / 180);
  const px = (point.lng - start.lng) * metersPerLng;
  const py = (point.lat - start.lat) * metersPerLat;
  const sx = 0;
  const sy = 0;
  const ex = (end.lng - start.lng) * metersPerLng;
  const ey = (end.lat - start.lat) * metersPerLat;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  return Math.hypot(px - (sx + t * dx), py - (sy + t * dy));
}

export function distanceToRouteMeters(route, hazard) {
  const points = route.geometry || [];
  if (points.length === 0) return Infinity;
  if (points.length === 1) return haversineMeters(points[0], hazard);
  let closest = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    closest = Math.min(closest, pointToSegmentMeters(hazard, points[i], points[i + 1]));
  }
  return closest;
}

export function groupRouteIncidents(reports, duplicateMeters = 35) {
  const groups = [];
  for (const report of reports) {
    const group = groups.find(item => item.category === report.category &&
      item.reports.some(existing => haversineMeters(existing, report) <= duplicateMeters));
    if (group) group.reports.push(report);
    else groups.push({ category: report.category, reports: [report] });
  }
  return groups.map(group => {
    const representative = [...group.reports].sort((a, b) => {
      const severity = { high: 3, medium: 2, low: 1 };
      return (severity[b.severity] || 0) - (severity[a.severity] || 0) ||
        Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0);
    })[0];
    return { ...representative, repeatedReportCount: group.reports.length, reportIds: group.reports.map(r => r.id) };
  });
}

export function calculateRouteRisk(route, reports, now = Date.now()) {
  const nearbyReports = reports.filter(h => distanceToRouteMeters(route, h) <= (route.corridorMeters || 350));
  const incidents = groupRouteIncidents(nearbyReports);
  if (incidents.length === 0) {
    return { score: null, category: 'Insufficient data', hazardCount: 0, repeatedReportCount: 0, hazards: [], confidence: 'Limited', explanation: 'No reports are associated with this route corridor. This means there is insufficient reported information, not that the route is safe.' };
  }
  const scored = incidents.map(h => ({ ...h, risk: calculateHazardRisk(h, reports, now) }));
  const maxScore = Math.max(...scored.map(h => h.risk.score));
  const average = scored.reduce((sum, h) => sum + h.risk.score, 0) / scored.length;
  const score = round(Math.min(100, maxScore * 0.7 + average * 0.3 + Math.min(12, (scored.length - 1) * 3)));
  const repeatedReportCount = nearbyReports.length - incidents.length;
  return {
    score,
    category: riskCategory(score),
    hazardCount: incidents.length,
    repeatedReportCount,
    hazards: scored.sort((a, b) => b.risk.score - a.risk.score),
    confidence: incidents.length >= 3 ? 'Moderate' : 'Limited',
    explanation: `Based on ${incidents.length} distinct incident(s) and ${nearbyReports.length} report(s) within ${route.corridorMeters || 350} m of the route line. ${repeatedReportCount} repeated report(s) are shown separately and do not inflate the incident score.`
  };
}

function round(n) { return Math.round(n * 10) / 10; }
