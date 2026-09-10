import { sortByDate, sortByText } from '../shared/sort.util';
import type { SortOption } from '../shared/sort.model';
import type { Listing } from './listing.model';

export type ListingSortOption = 'newest' | 'oldest' | 'title-asc';

// The allowed sort choices for listings — other sortable features (members,
// chat messages, ...) define their own list; only the SortOption shape and
// the sortByDate/sortByText comparators are shared.
export const LISTING_SORT_OPTIONS: SortOption<ListingSortOption>[] = [
  { value: 'newest', labelKey: 'listing.sortNewest' },
  { value: 'oldest', labelKey: 'listing.sortOldest' },
  { value: 'title-asc', labelKey: 'listing.sortTitleAsc' },
];

export function filterListingsByQuery(listings: Listing[], searchQuery?: string): Listing[] {
  const query = searchQuery?.trim().toLowerCase();
  if (!query) return listings;
  return listings.filter(
    (listing) =>
      listing.title.toLowerCase().includes(query) ||
      listing.description.toLowerCase().includes(query),
  );
}

// `sort` is loosely typed as `string | null` rather than `ListingSortOption | null`
// because it round-trips through `ul-select`'s `[(value)]`, which is fixed to
// `ModelSignal<string | null>` — an unrecognized value just falls through to newest.
export function sortListings(listings: Listing[], sort?: string | null): Listing[] {
  switch (sort) {
    case 'oldest':
      return sortByDate(listings, (listing) => listing.createdAt, 'asc');
    case 'title-asc':
      return sortByText(listings, (listing) => listing.title, 'asc');
    case 'newest':
    default:
      return sortByDate(listings, (listing) => listing.createdAt, 'desc');
  }
}
