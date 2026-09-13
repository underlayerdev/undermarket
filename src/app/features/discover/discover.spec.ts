import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DiscoverComponent } from './discover';
import { ListingService } from '../../application/services/listing.service';
import {
  AUTH_PROVIDER,
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
  SEARCH_LOCATION_REPOSITORY,
} from '../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
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

describe('DiscoverComponent', () => {
  let loadLatestSpy: ReturnType<typeof vi.fn>;
  let searchSpy: ReturnType<typeof vi.fn>;
  let searchNearbySpy: ReturnType<typeof vi.fn>;
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
    loadLatestSpy = vi.fn().mockResolvedValue(undefined);
    searchSpy = vi.fn().mockResolvedValue(undefined);
    searchNearbySpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [DiscoverComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: ListingService,
          useValue: {
            loadLatest: loadLatestSpy,
            search: searchSpy,
            searchNearby: searchNearbySpy,
            listings: () => [],
          },
        },
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

  it('should create and load the latest listings when no search location is set', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(loadLatestSpy).toHaveBeenCalled();
  });

  it('should show the first-run location prompt when no search location is set', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    const bar = fixture.debugElement.query(By.css('um-search-location-bar'));
    expect(bar.componentInstance.isFirstRun()).toBe(true);
  });

  it('should search by category when no search location is set', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectCategory('Books');
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCategory()).toBe('Books');
    expect(searchSpy).toHaveBeenCalledWith({ category: 'Books' });
  });

  it('should reload the latest listings when the category is cleared', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    loadLatestSpy.mockClear();

    fixture.componentInstance.selectCategory('Books');
    fixture.detectChanges();
    fixture.componentInstance.selectCategory(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCategory()).toBeNull();
    expect(loadLatestSpy).toHaveBeenCalled();
  });

  it('should search nearby with the persisted location and radius once one is set', async () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      category: undefined,
    });
  });

  it('should re-run a nearby search when the category changes with a location set', () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    searchNearbySpy.mockClear();

    fixture.componentInstance.selectCategory('Books');
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      category: 'Books',
    });
  });
});
