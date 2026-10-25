export const CATEGORIES = ['Pothole', 'Waterlogging', 'Damaged road', 'Obstruction'];
export const SEVERITIES = ['low', 'medium', 'high'];
export const STATUSES = ['unverified', 'under_review', 'verified'];
export const MANGALORE_BOUNDS = Object.freeze({ minLat: 12.6, maxLat: 13.3, minLng: 74.6, maxLng: 75.3 });

export function validateHazard(body) {
  const errors = [];
  if (!CATEGORIES.includes(body?.category)) errors.push('Choose a supported hazard category.');
  if (!SEVERITIES.includes(body?.severity)) errors.push('Choose low, medium or high severity.');
  if (!Number.isFinite(body?.lat) || body.lat < -90 || body.lat > 90) {
    errors.push('Latitude must be a number between -90 and 90.');
  }
  if (!Number.isFinite(body?.lng) || body.lng < -180 || body.lng > 180) {
    errors.push('Longitude must be a number between -180 and 180.');
  }
  if (Number.isFinite(body?.lat) && Number.isFinite(body?.lng) &&
      (body.lat < MANGALORE_BOUNDS.minLat || body.lat > MANGALORE_BOUNDS.maxLat ||
       body.lng < MANGALORE_BOUNDS.minLng || body.lng > MANGALORE_BOUNDS.maxLng)) {
    errors.push('Location must be within the supported Mangalore area (latitude 12.6–13.3, longitude 74.6–75.3).');
  }
  if (typeof body?.description !== 'undefined' &&
      (typeof body.description !== 'string' || body.description.length > 500)) {
    errors.push('Description must be text with at most 500 characters.');
  }
  return errors;
}
