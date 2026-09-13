import type { TranslocoService } from '@jsverse/transloco';
import type { LocationArea } from './location.model';
import { LOCATION_DISPLAY_NAME_MAX_LENGTH } from '../listing/listing-constraints';

// Mirrors the constraints enforced server-side in firestore.rules — this is
// a defensive re-check before writing, not the security boundary itself.
export function validateLocationArea(
  area: LocationArea | null | undefined,
  transloco: TranslocoService,
): string | null {
  if (!area) return transloco.translate('newListing.errors.locationRequired');

  const displayName = area.displayName.trim();
  if (!displayName) return transloco.translate('newListing.errors.locationRequired');
  if (displayName.length > LOCATION_DISPLAY_NAME_MAX_LENGTH) {
    return transloco.translate('newListing.errors.locationDisplayNameTooLong', {
      maxLength: LOCATION_DISPLAY_NAME_MAX_LENGTH,
    });
  }

  if (!/^[A-Z]{2}$/.test(area.countryCode)) {
    return transloco.translate('newListing.errors.locationInvalid');
  }

  if (!area.city.trim()) return transloco.translate('newListing.errors.locationInvalid');

  if (!area.geohash.trim()) return transloco.translate('newListing.errors.locationInvalid');

  if (!Number.isFinite(area.latitude) || area.latitude < -90 || area.latitude > 90) {
    return transloco.translate('newListing.errors.locationInvalid');
  }
  if (!Number.isFinite(area.longitude) || area.longitude < -180 || area.longitude > 180) {
    return transloco.translate('newListing.errors.locationInvalid');
  }

  return null;
}
