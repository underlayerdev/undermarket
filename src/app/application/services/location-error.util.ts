import type { TranslocoService } from '@jsverse/transloco';
import { GeolocationError } from '../../domain/location/geolocation.provider';

// GeolocationError is deliberately not routed through the app's generic
// ErrorService: its ERROR_KEYS map already has a 'permission-denied' key
// (for Firestore) matched via message.includes(code), which would misfire
// for a geolocation denial and show the wrong (Firestore-flavored) copy.
const GEOLOCATION_ERROR_KEYS: Record<string, string> = {
  'permission-denied': 'location.errors.permissionDenied',
  'position-unavailable': 'location.errors.positionUnavailable',
  timeout: 'location.errors.timeout',
  unsupported: 'location.errors.unsupported',
};

export function toLocationErrorMessage(error: unknown, transloco: TranslocoService): string {
  if (error instanceof GeolocationError) {
    return transloco.translate(GEOLOCATION_ERROR_KEYS[error.code]);
  }
  return transloco.translate('location.errors.unresolved');
}
