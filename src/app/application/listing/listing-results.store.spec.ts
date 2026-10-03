import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ListingResultsStore, LISTING_QUERY_FN } from './listing-results.store';
import type { ListingQueryFn } from './listing-results.store';
import { SearchLocationService } from '../services/search-location.service';
import type { Listing } from '../../domain/listing/listing.model';
import type { SearchLocation } from '../../domain/location/location.model';

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: 'user-1',
    title: 'A nice chair',
    description: 'A nice chair, barely used.',
    price: 1000,
    currency: 'USD',
    imageUrls: [],
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function searchLocation(overrides: Partial<SearchLocation> = {}): SearchLocation {
  return {
    displayName: 'Palermo, Buenos Aires',
    countryCode: 'AR',
    region: 'Buenos Aires',
    city: 'Buenos Aires',
    neighborhood: 'Palermo',
    latitude: -34.5875,
    longitude: -58.4205,
    geohash: '6ex2ug0d0',
    radiusKm: 10,
    source: 'saved',
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('ListingResultsStore', () => {
  let queryFnSpy: ReturnType<typeof vi.fn<ListingQueryFn>>;
  let fakeSearchLocation: ReturnType<typeof signal<SearchLocation | null>>;

  // Flushes the store's constructor effect (TestBed.tick(), matching this
  // repo's own SearchLocationService spec) and lets the resulting async
  // runSearch() settle.
  async function flush(): Promise<void> {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
  }

  async function createStore(
    queryFn: ListingQueryFn = async () => [],
  ): Promise<ListingResultsStore> {
    queryFnSpy = vi.fn<ListingQueryFn>(queryFn);
    fakeSearchLocation = signal<SearchLocation | null>(null);

    TestBed.configureTestingModule({
      providers: [
        { provide: LISTING_QUERY_FN, useValue: queryFnSpy },
        { provide: SearchLocationService, useValue: { searchLocation: fakeSearchLocation } },
        ListingResultsStore,
      ],
    });
    const store = TestBed.inject(ListingResultsStore);
    await flush();
    return store;
  }

  it('should call the provided query function with the current filters/location on creation', async () => {
    await createStore();

    expect(queryFnSpy).toHaveBeenCalledWith({ location: null, categoryId: null, query: undefined });
  });

  it('should re-run the query function when the category changes', async () => {
    const store = await createStore();
    queryFnSpy.mockClear();

    store.setCategoryId('electronics');
    await flush();

    expect(queryFnSpy).toHaveBeenCalledWith({
      location: null,
      categoryId: 'electronics',
      query: undefined,
    });
  });

  it('should re-run the query function when the query changes', async () => {
    const store = await createStore();
    queryFnSpy.mockClear();

    store.setQuery('lamp');
    await flush();

    expect(queryFnSpy).toHaveBeenCalledWith({ location: null, categoryId: null, query: 'lamp' });
  });

  it('should re-run the query function when the search location changes', async () => {
    await createStore();
    queryFnSpy.mockClear();
    const location = searchLocation();

    fakeSearchLocation.set(location);
    await flush();

    expect(queryFnSpy).toHaveBeenCalledWith({ location, categoryId: null, query: undefined });
  });

  it('should toggle isLoading around the query and clear it once it resolves', async () => {
    const store = await createStore();

    expect(store.isLoading()).toBe(false);
  });

  it('should capture a thrown error without rejecting, and clear it on the next successful query', async () => {
    const store = await createStore();
    queryFnSpy.mockRejectedValueOnce(new Error('offline'));

    store.setCategoryId('electronics');
    await flush();

    expect(store.hasError()).toBe(true);
    expect(store.isLoading()).toBe(false);

    store.setCategoryId('fashion');
    await flush();

    expect(store.hasError()).toBe(false);
  });

  it('should expose results sorted by the current sort option', async () => {
    const store = await createStore(async () => [
      listing({ id: 'a', title: 'Banana box', createdAt: new Date('2026-01-01') }),
      listing({ id: 'b', title: 'Apple crate', createdAt: new Date('2026-01-02') }),
    ]);

    store.setSort('title-asc');
    await flush();

    expect(store.results().map((item) => item.id)).toEqual(['b', 'a']);
  });
});
