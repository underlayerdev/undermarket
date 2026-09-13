import { distanceKm } from '../location/geohash.util';
import type { GeoPoint } from '../location/location.model';
import type { Listing } from './listing.model';

// Listings without a location (created before this field existed) can't be
// ranked by distance, so they're dropped rather than sorted arbitrarily.
export function sortListingsByDistance(listings: Listing[], origin: GeoPoint): Listing[] {
  return listings
    .filter((listing): listing is Listing & { location: NonNullable<Listing['location']> } =>
      Boolean(listing.location),
    )
    .sort((a, b) => distanceKm(origin, a.location) - distanceKm(origin, b.location));
}
