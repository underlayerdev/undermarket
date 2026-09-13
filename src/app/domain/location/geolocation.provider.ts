import type { GeoPoint } from './location.model';

export type GeolocationErrorCode =
  'permission-denied' | 'position-unavailable' | 'timeout' | 'unsupported';

// A dedicated error type, not a plain Error with a matching message: the
// app's ErrorService already maps the substring 'permission-denied' to a
// Firestore-flavored message (its ERROR_KEYS matches via
// error.message.includes(code)), which would misfire for a geolocation
// denial. Geolocation errors are handled where they're caught instead.
export class GeolocationError extends Error {
  constructor(
    readonly code: GeolocationErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'GeolocationError';
  }
}

export interface GeolocationProvider {
  /**
   * Resolves the device's current raw coordinate. Callers must never persist
   * or display this raw point directly for anything tied to a listing or a
   * user's search location — always pass it through
   * GeocodingProvider.reverseGeocode() first (privacy requirement).
   */
  getCurrentPosition(): Promise<GeoPoint>;
}
