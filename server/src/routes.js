import { haversineMeters, distanceToRouteMeters } from './riskEngine.js';

const ORIGIN = { lat: 12.9141, lng: 74.8560 };
const DESTINATION = { lat: 12.9240, lng: 74.8370 };
const AVERAGE_SPEED_KMH = 20;

function routeDistanceKm(geometry) {
  let meters = 0;
  for (let i = 1; i < geometry.length; i += 1) meters += haversineMeters(geometry[i - 1], geometry[i]);
  return Math.round(meters / 10) / 100;
}

function makeRoute(id, name, geometry) {
  const distanceKm = routeDistanceKm(geometry);
  return {
    id, name, origin: ORIGIN, destination: DESTINATION, geometry,
    distanceKm,
    durationMin: Math.max(1, Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60)),
    source: 'Illustrative demo geometry; distance calculated from geometry; duration assumes 20 km/h average speed',
    corridorMeters: 350,
    metricsAreIllustrative: true
  };
}

export function getCandidateRoutes() {
  return [
    makeRoute('route-a', 'Coastal Connector', [
      ORIGIN,
      { lat: 12.9160, lng: 74.8520 },
      { lat: 12.9190, lng: 74.8470 },
      { lat: 12.9220, lng: 74.8420 },
      DESTINATION
    ]),
    makeRoute('route-b', 'City Centre Link', [
      ORIGIN,
      { lat: 12.9110, lng: 74.8580 },
      { lat: 12.9120, lng: 74.8500 },
      { lat: 12.9170, lng: 74.8440 },
      { lat: 12.9210, lng: 74.8390 },
      DESTINATION
    ]),
    makeRoute('route-c', 'Greenway Alternative', [
      ORIGIN,
      { lat: 12.9180, lng: 74.8660 },
      { lat: 12.9020, lng: 74.8640 },
      { lat: 12.9020, lng: 74.8310 },
      { lat: 12.9180, lng: 74.8300 },
      DESTINATION
    ])
  ];
}

export function associateHazardsToRoute(route, hazards, radius = 350) {
  return hazards.filter(h => distanceToRouteMeters(route, h) <= radius);
}

export { routeDistanceKm };
