export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Extensible: today only 'saved' (a manually searched/persisted area) and
// 'browser-geolocation' exist, but the shape leaves room for e.g. 'ip-based'
// later without touching every consumer of a LocationArea.
export type LocationSource = 'saved' | 'browser-geolocation';

/**
 * Approximate, never-street-level place info — the shape shared by a
 * listing's location and a user's search location. `neighborhood` is
 * optional because not every geocoded place resolves to one (a small town
 * may only have a city).
 */
export interface LocationArea extends GeoPoint {
  displayName: string;
  countryCode: string;
  region: string;
  city: string;
  neighborhood?: string;
  geohash: string;
}

export type ListingLocation = LocationArea;

export interface SearchLocation extends LocationArea {
  radiusKm: number;
  source: LocationSource;
  updatedAt: Date;
}

/** A forward/reverse-geocode result, before it's been turned into a stored LocationArea (i.e. before a geohash has been computed for it). */
export interface LocationSuggestion extends GeoPoint {
  id: string;
  displayName: string;
  countryCode: string;
  region: string;
  city: string;
  neighborhood?: string;
}
