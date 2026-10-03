import type { ListingQueryFn } from './listing-results.store';
import type { ListingRepository } from '../../domain/listing/listing.repository';

/**
 * Shared by Discover and Search (provided as each's own LISTING_QUERY_FN) —
 * both want the same rule: a search location always wins (nearby search);
 * otherwise a category/text filter runs a plain search; otherwise fall back
 * to the latest-listings feed. Not the only valid strategy — Home provides
 * its own trivial one instead of this (see home.ts), since it has no
 * category/sort/location UI and shouldn't become location-aware just by
 * virtue of sharing ListingResultsStore with pages that do.
 */
export function createSearchQueryStrategy(listingRepository: ListingRepository): ListingQueryFn {
  return ({ location, categoryId, query }) => {
    if (location) {
      return listingRepository.searchNearby({
        center: location,
        radiusKm: location.radiusKm,
        categoryId: categoryId ?? undefined,
        query,
      });
    }
    if (categoryId || query) {
      return listingRepository.search({ categoryId: categoryId ?? undefined, query });
    }
    return listingRepository.getLatest();
  };
}
