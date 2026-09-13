import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SearchComponent } from './search';
import { ListingService } from '../../application/services/listing.service';
import {
  AUTH_PROVIDER,
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
  SEARCH_LOCATION_REPOSITORY,
} from '../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
import { getRecentSearches } from '../../shared/search/recent-searches.util';
import type { SearchLocation } from '../../domain/location/location.model';

const testSearchLocation: SearchLocation = {
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
};

describe('SearchComponent', () => {
  let searchSpy: ReturnType<typeof vi.fn>;
  let searchNearbySpy: ReturnType<typeof vi.fn>;
  let locationBackSpy: ReturnType<typeof vi.fn>;
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
    searchSpy = vi.fn().mockResolvedValue(undefined);
    searchNearbySpy = vi.fn().mockResolvedValue(undefined);
    locationBackSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [SearchComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: ListingService,
          useValue: { search: searchSpy, searchNearby: searchNearbySpy, listings: () => [] },
        },
        { provide: Location, useValue: { back: locationBackSpy } },
        {
          provide: AUTH_PROVIDER,
          useValue: {
            currentUser: () => null,
            onAuthStateChange: (cb: (user: null) => void) => {
              cb(null);
              return () => {};
            },
          },
        },
        { provide: GEOCODING_PROVIDER, useValue: { search: vi.fn(), reverseGeocode: vi.fn() } },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: vi.fn() } },
        {
          provide: SEARCH_LOCATION_REPOSITORY,
          useValue: { getByUser: vi.fn().mockResolvedValue(null), save: vi.fn() },
        },
      ],
    });
  });

  afterEach(() => {
    restoreLocalStorage();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should populate query and trigger search when the q input is set', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.componentRef.setInput('q', 'foo');
    fixture.detectChanges();

    expect(fixture.componentInstance.query()).toBe('foo');
    expect(searchSpy).toHaveBeenCalledWith({ query: 'foo', category: undefined });
  });

  it('should not trigger a duplicate search when q is set to the same value already applied', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.componentRef.setInput('q', 'foo');
    fixture.detectChanges();
    searchSpy.mockClear();

    fixture.componentRef.setInput('q', 'foo');
    fixture.detectChanges();

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('should navigate back when the back button is clicked', () => {
    const fixture = TestBed.createComponent(SearchComponent);

    fixture.componentInstance.goBack();

    expect(locationBackSpy).toHaveBeenCalled();
  });

  it('should render a ul-search-input for the mobile header, desktop row, and location picker', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.detectChanges();

    // Mobile header + desktop row + the first-run location picker's own.
    expect(fixture.nativeElement.querySelectorAll('ul-search-input').length).toBe(3);
  });

  it('should record a submitted search into recent searches and trigger the search', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    // Mirrors ul-search-input's [(value)] already having synced `query` from
    // typing by the time it emits searchSubmit on Enter.
    fixture.componentInstance.query.set('lamp');

    fixture.componentInstance.onSearchSubmit('lamp');

    expect(getRecentSearches('listings')).toEqual(['lamp']);
    expect(fixture.componentInstance.recentSearchSuggestions()).toEqual([
      { value: 'lamp', label: 'lamp' },
    ]);
    expect(searchSpy).toHaveBeenCalledWith({ query: 'lamp', category: undefined });
  });

  it('should record a picked suggestion into recent searches and trigger the search', () => {
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.componentInstance.query.set('lamp');

    fixture.componentInstance.onSuggestionSelected({ value: 'lamp', label: 'lamp' });

    expect(getRecentSearches('listings')).toEqual(['lamp']);
    expect(searchSpy).toHaveBeenCalled();
  });

  it('should not record a blank submitted search', () => {
    const fixture = TestBed.createComponent(SearchComponent);

    fixture.componentInstance.onSearchSubmit('   ');

    expect(getRecentSearches('listings')).toEqual([]);
  });

  it('should search nearby with the persisted location and radius once one is set', () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      category: undefined,
      query: undefined,
    });
  });

  it('should include the current query/category when searching nearby', () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.detectChanges();
    fixture.componentInstance.query.set('lamp');
    fixture.componentInstance.selectedCategory.set('Furniture');
    searchNearbySpy.mockClear();

    fixture.componentInstance.onSearch();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      category: 'Furniture',
      query: 'lamp',
    });
  });
});
