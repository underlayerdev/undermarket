import { describe, expect, it } from 'vitest';
import {
  computeGeohash,
  distanceKm,
  filterWithinRadius,
  geohashQueryBoundsForRadius,
  toLocationArea,
} from './geohash.util';
import type { LocationSuggestion } from './location.model';

const palermo = { latitude: -34.5875, longitude: -58.4205 };
const rosario = { latitude: -32.9468, longitude: -60.6393 };

describe('computeGeohash', () => {
  it('is deterministic for the same point', () => {
    expect(computeGeohash(palermo)).toBe(computeGeohash(palermo));
  });

  it('differs for distinct points', () => {
    expect(computeGeohash(palermo)).not.toBe(computeGeohash(rosario));
  });
});

describe('geohashQueryBoundsForRadius', () => {
  it("returns bounds that contain the center point's own geohash", () => {
    const bounds = geohashQueryBoundsForRadius(palermo, 10);
    const ownHash = computeGeohash(palermo);
    expect(bounds.some(([start, end]) => ownHash >= start && ownHash <= end)).toBe(true);
  });
});

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(palermo, palermo)).toBe(0);
  });

  it('matches the known approximate distance between Palermo and Rosario', () => {
    // ~280km straight-line distance between these two real places.
    expect(distanceKm(palermo, rosario)).toBeGreaterThan(260);
    expect(distanceKm(palermo, rosario)).toBeLessThan(300);
  });
});

describe('filterWithinRadius', () => {
  it('keeps items within the radius and drops items outside it', () => {
    const items = [
      { id: 'near', point: palermo },
      { id: 'far', point: rosario },
    ];
    const result = filterWithinRadius(items, palermo, 10, (item) => item.point);
    expect(result.map((item) => item.id)).toEqual(['near']);
  });

  it('drops items with no resolvable point', () => {
    const items = [{ id: 'no-point', point: undefined }];
    const result = filterWithinRadius(items, palermo, 10, (item) => item.point);
    expect(result).toEqual([]);
  });

  // geohashQueryBounds returns rectangular bounding boxes that over-include
  // a circle's corners — a point can share a bounding box with the center
  // yet fall outside the true radius. This is the exact case the exact-
  // distance post-filter exists to catch.
  it('excludes a point that falls inside a bounding-box corner but outside the true radius', () => {
    const bounds = geohashQueryBoundsForRadius(palermo, 1);
    // A point ~5km away shares at least one 1km bounding box (boxes are much
    // larger than the requested radius near the corners) but must still be
    // excluded by the exact-distance filter.
    const cornerPoint = { latitude: palermo.latitude + 0.01, longitude: palermo.longitude + 0.01 };
    const cornerHash = computeGeohash(cornerPoint);
    expect(bounds.some(([start, end]) => cornerHash >= start && cornerHash <= end)).toBe(true);
    expect(distanceKm(palermo, cornerPoint)).toBeGreaterThan(1);

    const result = filterWithinRadius(
      [{ id: 'corner', point: cornerPoint }],
      palermo,
      1,
      (item) => item.point,
    );
    expect(result).toEqual([]);
  });
});

describe('toLocationArea', () => {
  it('attaches a computed geohash and drops the suggestion id', () => {
    const suggestion: LocationSuggestion = {
      id: 'mapbox-place.123',
      displayName: 'Palermo, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Palermo',
      ...palermo,
    };

    const area = toLocationArea(suggestion);

    expect(area).toEqual({
      displayName: 'Palermo, Buenos Aires',
      countryCode: 'AR',
      region: 'Buenos Aires',
      city: 'Buenos Aires',
      neighborhood: 'Palermo',
      latitude: palermo.latitude,
      longitude: palermo.longitude,
      geohash: computeGeohash(palermo),
    });
    expect(area).not.toHaveProperty('id');
  });
});
