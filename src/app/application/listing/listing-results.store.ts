import { computed, effect, inject, InjectionToken, Service, signal } from '@angular/core';
import { SearchLocationService } from '../services/search-location.service';
import type { Listing } from '../../domain/listing/listing.model';
import type { ListingSortOption } from '../../domain/listing/listing-query.util';
import { sortListings } from '../../domain/listing/listing-query.util';
import type { SearchLocation } from '../../domain/location/location.model';

export interface ListingQueryParams {
  location: SearchLocation | null;
  categoryId: string | null;
  query: string | undefined;
}

/**
 * How to actually fetch results for the current filters — deliberately left
 * to whoever provides ListingResultsStore (see each page's own `providers`
 * array), not hardcoded in the store itself. Discover and Search want the
 * same "location wins, else category/query, else latest" rule (see
 * createSearchQueryStrategy below), but Home doesn't: it has no category/
 * sort/location UI at all, so its own query function just always returns
 * the latest feed, ignoring `location` entirely rather than inheriting
 * Discover's nearby-search behavior by accident.
 */
export type ListingQueryFn = (params: ListingQueryParams) => Promise<Listing[]>;

export const LISTING_QUERY_FN = new InjectionToken<ListingQueryFn>('LISTING_QUERY_FN');

/**
 * Holds the filters/sort/results/loading state behind any page that shows a
 * filterable list of listings (Home, Discover, Search today). Not app-wide:
 * meant to be `provided` on each of those page components, so every filter
 * component (category chips, sort, the search location bar) can `inject()`
 * it directly and change the state itself, instead of the page wiring
 * `[(x)]` bindings between a dumb child and its own local signals — and so
 * every consumer (the results grid) can read it reactively instead of
 * receiving the array/loading flag as a prop the page had to compute first.
 *
 * `autoProvided: false` keeps this out of DI until a page component lists it
 * in its own `providers` array (same reasoning as `ListingDetailStore`) —
 * each page gets a fresh instance, so a category picked on Discover never
 * bleeds into Search. Each page must also provide LISTING_QUERY_FN
 * alongside it — the store itself has no opinion on what "fetch results"
 * means, only on tracking the filters/sort/loading state around that call.
 */
@Service({ autoProvided: false })
export class ListingResultsStore {
  private readonly queryFn = inject(LISTING_QUERY_FN);
  private readonly searchLocationService = inject(SearchLocationService);

  private readonly _categoryId = signal<string | null>(null);
  private readonly _query = signal<string | undefined>(undefined);
  private readonly _sort = signal<ListingSortOption | null>('nearest');
  private readonly _listings = signal<Listing[]>([]);
  private readonly _isLoading = signal(true);
  private readonly _error = signal<unknown>(null);

  readonly categoryId = this._categoryId.asReadonly();
  readonly query = this._query.asReadonly();
  readonly sort = this._sort.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasError = computed(() => this._error() !== null);

  // The repository call already applied any text filter (Firestore has no
  // text search, so search()/searchNearby() do it client-side themselves)
  // and, for getLatest()/search(), ordered by createdAt — this only re-sorts
  // whatever came back, reusing the same pure util every other listing page
  // already sorts with.
  readonly results = computed(() =>
    sortListings(
      this._listings(),
      this._sort(),
      this.searchLocationService.searchLocation() ?? undefined,
    ),
  );

  constructor() {
    effect(() => {
      const location = this.searchLocationService.searchLocation();
      const categoryId = this._categoryId();
      const query = this._query();
      void this.runSearch({ location, categoryId, query });
    });
  }

  setCategoryId(categoryId: string | null): void {
    this._categoryId.set(categoryId);
  }

  setQuery(query: string | undefined): void {
    this._query.set(query);
  }

  setSort(sort: ListingSortOption | null): void {
    this._sort.set(sort);
  }

  private async runSearch(params: ListingQueryParams): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      this._listings.set(await this.queryFn(params));
    } catch (err) {
      this._error.set(err);
    } finally {
      this._isLoading.set(false);
    }
  }
}
