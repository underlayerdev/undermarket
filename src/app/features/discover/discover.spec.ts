import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DiscoverComponent } from './discover';
import { CategoryService } from '../../application/category/category.service';
import { ListingService } from '../../application/services/listing.service';
import {
  AUTH_PROVIDER,
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
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
        { provide: CategoryService, useValue: fakeCategoryService() },
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

    fixture.componentInstance.selectedCategoryId.set('books-media');
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCategoryId()).toBe('books-media');
    expect(searchSpy).toHaveBeenCalledWith({ categoryId: 'books-media' });
  });

  it('should reload the latest listings when the category is cleared', () => {
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    loadLatestSpy.mockClear();

    fixture.componentInstance.selectedCategoryId.set('books-media');
    fixture.detectChanges();
    fixture.componentInstance.selectedCategoryId.set(null);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCategoryId()).toBeNull();
    expect(loadLatestSpy).toHaveBeenCalled();
  });

  it('should search nearby with the persisted location and radius once one is set', async () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      categoryId: undefined,
    });
  });

  it('should re-run a nearby search when the category changes with a location set', () => {
    localStorage.setItem('um-search-location', JSON.stringify(testSearchLocation));
    const fixture = TestBed.createComponent(DiscoverComponent);
    fixture.detectChanges();
    searchNearbySpy.mockClear();

    fixture.componentInstance.selectedCategoryId.set('books-media');
    fixture.detectChanges();

    expect(searchNearbySpy).toHaveBeenCalledWith({
      center: testSearchLocation,
      radiusKm: 10,
      categoryId: 'books-media',
    });
  });
});
