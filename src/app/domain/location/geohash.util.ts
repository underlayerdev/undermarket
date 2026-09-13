import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common';
import type { GeoPoint, LocationArea, LocationSuggestion } from './location.model';

export const DEFAULT_SEARCH_RADIUS_KM = 10;
export const SEARCH_RADIUS_OPTIONS_KM = [5, 10, 25, 50, 100] as const;

function toTuple(point: GeoPoint): [number, number] {
  return [point.latitude, point.longitude];
}

export function computeGeohash(point: GeoPoint): string {
  return geohashForLocation(toTuple(point));
}

/**
 * Firestore bounding boxes for a radius query, as [start, end] geohash
 * string pairs — one `where('geohash', '>=', start).where('geohash', '<=',
 * end)` query per pair. The boxes are rectangular and over-include the
 * circle's corners, so any results must still be passed through
 * filterWithinRadius() for the exact distance check — this is not optional,
 * it's how the technique is documented to work.
 */
export function geohashQueryBoundsForRadius(
  center: GeoPoint,
  radiusKm: number,
): [string, string][] {
  return geohashQueryBounds(toTuple(center), radiusKm * 1000);
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  return distanceBetween(toTuple(a), toTuple(b));
}

/** The exact-distance post-filter geohash bounding-box queries require — see geohashQueryBoundsForRadius. */
export function filterWithinRadius<T>(
  items: T[],
  center: GeoPoint,
  radiusKm: number,
  getPoint: (item: T) => GeoPoint | undefined,
): T[] {
  return items.filter((item) => {
    const point = getPoint(item);
    return point !== undefined && distanceKm(center, point) <= radiusKm;
  });
}

export function toLocationArea(suggestion: LocationSuggestion): LocationArea {
  const { id, ...area } = suggestion;
  return { ...area, geohash: computeGeohash(suggestion) };
}
