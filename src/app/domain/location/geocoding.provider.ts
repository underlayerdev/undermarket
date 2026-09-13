import type { GeoPoint, LocationSuggestion } from './location.model';

/**
 * Translates free-text place queries and raw coordinates into approximate,
 * area-level place info. Implementations must never resolve or return
 * street/address/point-of-interest-level results — only city/neighborhood/
 * region-level places — so a raw GPS reading can never be turned into
 * anything more precise than "the area it's in" (privacy requirement).
 */
export interface GeocodingProvider {
  search(
    query: string,
    opts?: { proximity?: GeoPoint; language?: string },
  ): Promise<LocationSuggestion[]>;
  reverseGeocode(point: GeoPoint): Promise<LocationSuggestion | null>;
}
