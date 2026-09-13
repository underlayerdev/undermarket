import type { SearchLocation } from '../../domain/location/location.model';

const SEARCH_LOCATION_STORAGE_KEY = 'um-search-location';

/** Wrapped because `localStorage` throws outright in some privacy modes rather than returning null. */
export function readCachedSearchLocation(): SearchLocation | null {
  try {
    const raw = localStorage.getItem(SEARCH_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SearchLocation & { updatedAt: string };
    return { ...parsed, updatedAt: new Date(parsed.updatedAt) };
  } catch {
    return null;
  }
}

export function writeCachedSearchLocation(location: SearchLocation): void {
  try {
    localStorage.setItem(SEARCH_LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Caching is a startup optimisation only — Firestore holds the real
    // preference for signed-in users, so a storage failure is not worth surfacing.
  }
}
