import { computed, inject, InjectionToken } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, from, map, of, pipe, switchMap, tap } from 'rxjs';
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

interface ListingResultsState {
  categoryId: string | null;
  query: string | undefined;
  sort: ListingSortOption | null;
  listings: Listing[];
  isLoading: boolean;
  error: unknown;
}

const initialState: ListingResultsState = {
  categoryId: null,
  query: undefined,
  sort: 'nearest',
  listings: [],
  isLoading: true,
  error: null,
};

/**
 * Filters, sort and results behind any filterable listing page (Home,
 * Discover, Search). Provided per page, so filter components (category
 * chips, sort, location bar) change it directly and a category picked on
 * Discover never bleeds into Search. Each page also provides
 * LISTING_QUERY_FN — the store only tracks state around that call.
 */
export const ListingResultsStore = signalStore(
  withState(initialState),
  withProps(() => ({
    _queryFn: inject(LISTING_QUERY_FN),
    _searchLocationService: inject(SearchLocationService),
  })),
  withComputed((store) => ({
    hasError: computed(() => store.error() !== null),
    // The repository already applied any text filter and default ordering —
    // this only re-sorts whatever came back.
    results: computed(() =>
      sortListings(
        store.listings(),
        store.sort(),
        store._searchLocationService.searchLocation() ?? undefined,
      ),
    ),
    _queryParams: computed<ListingQueryParams>(() => ({
      location: store._searchLocationService.searchLocation(),
      categoryId: store.categoryId(),
      query: store.query(),
    })),
  })),
  withMethods((store) => ({
    setCategoryId(categoryId: string | null): void {
      patchState(store, { categoryId });
    },

    setQuery(query: string | undefined): void {
      patchState(store, { query });
    },

    setSort(sort: ListingSortOption | null): void {
      patchState(store, { sort });
    },

    // switchMap drops a still-pending query as soon as the filters change,
    // so a slow earlier response can never overwrite newer results.
    _runSearch: rxMethod<ListingQueryParams>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((params) =>
          from(store._queryFn(params)).pipe(
            map((listings) => ({ listings, error: null })),
            catchError((error: unknown) => of({ listings: store.listings(), error })),
          ),
        ),
        tap((result) => patchState(store, { ...result, isLoading: false })),
      ),
    ),
  })),
  withHooks({
    onInit(store) {
      store._runSearch(store._queryParams);
    },
  }),
);

export type ListingResultsStore = InstanceType<typeof ListingResultsStore>;
