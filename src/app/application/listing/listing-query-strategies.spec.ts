import { createSearchQueryStrategy } from './listing-query-strategies';
import type { ListingRepository } from '../../domain/listing/listing.repository';
import type { SearchLocation } from '../../domain/location/location.model';

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

describe('createSearchQueryStrategy', () => {
  let getLatestSpy: ReturnType<typeof vi.fn<ListingRepository['getLatest']>>;
  let searchSpy: ReturnType<typeof vi.fn<ListingRepository['search']>>;
  let searchNearbySpy: ReturnType<typeof vi.fn<ListingRepository['searchNearby']>>;

  function createStrategy() {
    getLatestSpy = vi.fn<ListingRepository['getLatest']>(async () => []);
    searchSpy = vi.fn<ListingRepository['search']>(async () => []);
    searchNearbySpy = vi.fn<ListingRepository['searchNearby']>(async () => []);
    const repository: Partial<ListingRepository> = {
      getLatest: getLatestSpy,
      search: searchSpy,
      searchNearby: searchNearbySpy,
    };
    return createSearchQueryStrategy(repository as ListingRepository);
  }

  it('should call getLatest when there is no location, category, or query', async () => {
    const strategy = createStrategy();

    await strategy({ location: null, categoryId: null, query: undefined });

    expect(getLatestSpy).toHaveBeenCalled();
    expect(searchSpy).not.toHaveBeenCalled();
    expect(searchNearbySpy).not.toHaveBeenCalled();
  });

  it('should call search with the category when there is no location', async () => {
    const strategy = createStrategy();

    await strategy({ location: null, categoryId: 'electronics', query: undefined });

    expect(searchSpy).toHaveBeenCalledWith({ categoryId: 'electronics', query: undefined });
  });

  it('should call search with the query when there is no location', async () => {
    const strategy = createStrategy();

    await strategy({ location: null, categoryId: null, query: 'lamp' });

    expect(searchSpy).toHaveBeenCalledWith({ categoryId: undefined, query: 'lamp' });
  });

  it('should call searchNearby once a location is set, regardless of category/query', async () => {
    const strategy = createStrategy();
    const location = searchLocation();

    await strategy({ location, categoryId: 'electronics', query: 'lamp' });

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: location,
      radiusKm: location.radiusKm,
      categoryId: 'electronics',
      query: 'lamp',
    });
    expect(searchSpy).not.toHaveBeenCalled();
  });
});
