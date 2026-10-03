import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { DiscoverComponent } from './discover';
import { CategoryService } from '../../application/category/category.service';
import { ListingResultsStore } from '../../application/listing/listing-results.store';
import {
  AUTH_PROVIDER,
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
  LISTING_REPOSITORY,
  SEARCH_LOCATION_REPOSITORY,
} from '../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../testing/fake-local-storage';
import type { CategoryNode } from '../../domain/category-node/category-node.model';
import type { SearchLocation } from '../../domain/location/location.model';

function fakeCategoryService() {
  const nodes: CategoryNode[] = [
    {
      categoryId: 'books-media',
      parentId: null,
      path: ['books-media'],
      depth: 0,
      order: 0,
      icon: 'book',
      isActive: true,
      isLeaf: true,
      featured: false,
      featuredOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'seed-script',
    },
  ];
  return {
    tree: signal<CategoryNode[] | null>(nodes),
    orderedTree: () => nodes,
    ensureLoaded: vi.fn().mockResolvedValue(nodes),
    getById: (id: string) => nodes.find((node) => node.categoryId === id),
  };
}

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

// DiscoverComponent provides its own ListingResultsStore instance (not
// app-wide), so a test must resolve it through this component's own element
// injector — TestBed.inject() would only ever see a root-level instance.
function storeFor(fixture: ComponentFixture<DiscoverComponent>): ListingResultsStore {
  return fixture.debugElement.injector.get(ListingResultsStore);
}

describe('DiscoverComponent', () => {
  let getLatestSpy: ReturnType<typeof vi.fn>;
  let searchSpy: ReturnType<typeof vi.fn>;
  let searchNearbySpy: ReturnType<typeof vi.fn>;
  let restoreLocalStorage: () => void;

  beforeEach(() => {
    restoreLocalStorage = installFakeLocalStorage();
    getLatestSpy = vi.fn().mockResolvedValue([]);
    searchSpy = vi.fn().mockResolvedValue([]);
    searchNearbySpy = vi.fn().mockResolvedValue([]);

    TestBed.configureTestingModule({
      imports: [DiscoverComponent, getTranslocoTestingModule()],
      providers: [
        { provide: CategoryService, useValue: fakeCategoryService() },
        {
          provide: LISTING_REPOSITORY,
          useValue: { getLatest: getLatestSpy, search: searchSpy, searchNearby: searchNearbySpy },
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
        {
          provide: GEOCODING_PROVIDER,
          useValue: {
            search: vi.fn(),
            reverseGeocode: vi.fn(),
            staticMapUrl: vi.fn().mockReturnValue('https://api.mapbox.com/preview.png'),
          },
        },
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
    expect(getLatestSpy).toHaveBeenCalled();
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

    storeFor(fixture).setCategoryId('books-media');
    fixture.detectChanges();

    expect(storeFor(fixture).categoryId()).toBe('books-media');
    expect(searchSpy).toHaveBeenCalledWith({ categoryId: 'books-media', query: undefined });
  });

  it('should reload the latest listings when the category is cleared', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    getLatestSpy.mockClear();

    storeFor(fixture).setCategoryId('books-media');
    fixture.detectChanges();
    storeFor(fixture).setCategoryId(null);
    fixture.detectChanges();

    expect(storeFor(fixture).categoryId()).toBeNull();
    expect(getLatestSpy).toHaveBeenCalled();
  });

  it('should search nearby with the persisted location and radius once one is set', async () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      categoryId: undefined,
      query: undefined,
    });
  });

  it('should re-run a nearby search when the category changes with a location set', () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    searchNearbySpy.mockClear();

    storeFor(fixture).setCategoryId('books-media');
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      categoryId: 'books-media',
      query: undefined,
    });
  });
});
