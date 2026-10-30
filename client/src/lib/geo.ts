import { LngLat } from "@mapforge/shared";

/**
 * Perpendicular distance from a point P to a line segment AB in degrees
 */
function perpendicularDistance(p: LngLat, a: LngLat, b: LngLat): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const num = Math.abs(dy * px - dx * py + bx * ay - by * ax);
  const den = Math.hypot(dx, dy);
  return num / den;
}

/**
 * Ramer-Douglas-Peucker algorithm for geographic coordinate simplification.
 * Strictly preserves the geographic coordinates and topological shape of the line.
 */
export function simplifyCoordinates(points: LngLat[], tolerance = 0.00003): LngLat[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const rec1 = simplifyCoordinates(points.slice(0, index + 1), tolerance);
    const rec2 = simplifyCoordinates(points.slice(index), tolerance);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  }

  return [points[0], points[end]];
}

/**
 * Calculates geographic bounding box for an array of coordinates [minLng, minLat, maxLng, maxLat]
 */
export function calculateBounds(coordinates: LngLat[]): [number, number, number, number] | null {
  if (coordinates.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}
