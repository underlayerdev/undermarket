import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastService } from '@underlayerdev/ui';
import { NewListingComponent } from './new-listing';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import {
  GEOCODING_PROVIDER,
  GEOLOCATION_PROVIDER,
  LISTING_REPOSITORY,
  SEARCH_LOCATION_REPOSITORY,
} from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { GeolocationError } from '../../../domain/location/geolocation.provider';
import type { LocationArea } from '../../../domain/location/location.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { installFakeLocalStorage } from '../../../../testing/fake-local-storage';

const TEST_LOCATION: LocationArea = {
  displayName: 'Palermo, Buenos Aires',
  countryCode: 'AR',
  region: 'Buenos Aires',
  city: 'Buenos Aires',
  neighborhood: 'Palermo',
  latitude: -34.5875,
  longitude: -58.4205,
  geohash: '6ex2ug0d0',
};

// fixture.whenStable() doesn't reliably wait out the load-for-edit async
// chain (getById -> .set()) — a real macrotask boundary guarantees every
// pending microtask has drained first.
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const EXISTING_LISTING: Listing = {
  id: 'abc123',
  ownerId: 'user-1',
  title: 'A perfectly valid title',
  description: 'A perfectly valid description for this listing.',
  price: 10,
  currency: 'USD',
  category: 'Electronics',
  imageUrls: ['https://example.com/a.jpg'],
  status: 'draft',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('NewListingComponent', () => {
  function setup(overrides?: {
    authService?: object;
    listingService?: object;
    listingRepository?: object;
    router?: object;
    slug?: string | null;
  }) {
    TestBed.configureTestingModule({
      imports: [NewListingComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: overrides?.authService ?? { currentUser: () => null } },
        { provide: ListingService, useValue: overrides?.listingService ?? { create: vi.fn() } },
        {
          provide: LISTING_REPOSITORY,
          useValue: overrides?.listingRepository ?? { getById: vi.fn() },
        },
        { provide: Router, useValue: overrides?.router ?? { navigate: vi.fn() } },
        { provide: Location, useValue: { back: vi.fn() } },
        { provide: GEOCODING_PROVIDER, useValue: { search: vi.fn(), reverseGeocode: vi.fn() } },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: vi.fn() } },
        {
          provide: SEARCH_LOCATION_REPOSITORY,
          useValue: { getByUser: vi.fn().mockResolvedValue(null), save: vi.fn() },
        },
      ],
    });

    const fixture = TestBed.createComponent(NewListingComponent);
    fixture.componentRef.setInput('slug', overrides?.slug ?? null);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should not show validation errors on required fields before they are touched', () => {
    const fixture = setup();
    const listing = fixture.componentInstance.listingForm;

    expect(listing.title().touched()).toBe(false);
    expect(listing.title().errors()).toEqual([]);
    expect(listing.description().errors()).toEqual([]);
    expect(listing.price().errors()).toEqual([]);
    expect(listing.category().errors()).toEqual([]);
  });

  it('should show a required error on a field once it is marked touched', () => {
    const fixture = setup();
    const listing = fixture.componentInstance.listingForm;

    listing.title().markAsTouched();
    fixture.detectChanges();

    expect(listing.title().errors().length).toBeGreaterThan(0);
  });

  it('should mark the title field touched when the rendered ul-input is blurred by the user', () => {
    const fixture = setup();
    const listing = fixture.componentInstance.listingForm;

    const nativeElement = fixture.nativeElement as HTMLElement;
    const titleInput = nativeElement.querySelector<HTMLInputElement>('ul-input input[type="text"]');
    titleInput!.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(listing.title().touched()).toBe(true);
    expect(listing.title().errors().length).toBeGreaterThan(0);
  });

  it('should replace the current history entry when navigating to the newly created listing', async () => {
    const navigateSpy = vi.fn().mockResolvedValue(true);
    const createdListing = {
      id: 'abc123',
      ownerId: 'user-1',
      title: 'A perfectly valid title',
      description: 'A perfectly valid description for this listing.',
      price: 10,
      currency: 'USD',
      category: 'Electronics',
      imageUrls: [],
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const fixture = setup({
      authService: { currentUser: () => ({ id: 'user-1' }) },
      listingService: { create: vi.fn().mockResolvedValue(createdListing) },
      router: { navigate: navigateSpy },
    });

    fixture.componentInstance.listingModel.set({
      title: createdListing.title,
      description: createdListing.description,
      price: String(createdListing.price),
      currency: createdListing.currency,
      category: createdListing.category,
      location: TEST_LOCATION,
    });
    fixture.detectChanges();

    await fixture.componentInstance.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/listings', 'a-perfectly-valid-title-abc123'], {
      replaceUrl: true,
    });
  });

  describe('edit mode', () => {
    it('should load the listing and pre-fill the form when the current user owns it', async () => {
      const getById = vi.fn().mockResolvedValue(EXISTING_LISTING);
      const fixture = setup({
        authService: { currentUser: () => ({ id: 'user-1' }) },
        listingRepository: { getById },
        slug: 'a-perfectly-valid-title-abc123',
      });
      await flushAsync();

      expect(getById).toHaveBeenCalledWith('abc123');
      expect(fixture.componentInstance.isEditMode()).toBe(true);
      expect(fixture.componentInstance.listingModel()).toEqual({
        title: EXISTING_LISTING.title,
        description: EXISTING_LISTING.description,
        price: '10',
        currency: 'USD',
        category: 'Electronics',
        location: null,
      });
    });

    it('should redirect to /profile when the listing is not found', async () => {
      const navigateByUrlSpy = vi.fn().mockResolvedValue(true);
      const fixture = setup({
        authService: { currentUser: () => ({ id: 'user-1' }) },
        listingRepository: { getById: vi.fn().mockResolvedValue(null) },
        router: { navigateByUrl: navigateByUrlSpy },
        slug: 'missing-abc123',
      });
      await flushAsync();

      expect(navigateByUrlSpy).toHaveBeenCalledWith('/profile');
    });

    it('should redirect to /profile when the current user does not own the listing', async () => {
      const navigateByUrlSpy = vi.fn().mockResolvedValue(true);
      const fixture = setup({
        authService: { currentUser: () => ({ id: 'someone-else' }) },
        listingRepository: { getById: vi.fn().mockResolvedValue(EXISTING_LISTING) },
        router: { navigateByUrl: navigateByUrlSpy },
        slug: 'a-perfectly-valid-title-abc123',
      });
      await flushAsync();

      expect(navigateByUrlSpy).toHaveBeenCalledWith('/profile');
    });

    it('should update the existing listing, keeping its status and images, on submit', async () => {
      const navigateSpy = vi.fn().mockResolvedValue(true);
      const updateSpy = vi.fn().mockResolvedValue(undefined);
      const fixture = setup({
        authService: { currentUser: () => ({ id: 'user-1' }) },
        listingService: { update: updateSpy },
        listingRepository: { getById: vi.fn().mockResolvedValue(EXISTING_LISTING) },
        router: { navigate: navigateSpy },
        slug: 'a-perfectly-valid-title-abc123',
      });
      await flushAsync();

      fixture.componentInstance.listingModel.update((value) => ({
        ...value,
        title: 'A brand new title',
        location: TEST_LOCATION,
      }));
      fixture.detectChanges();

      await fixture.componentInstance.onSubmit();

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: EXISTING_LISTING.id,
          title: 'A brand new title',
          status: 'draft',
          imageUrls: EXISTING_LISTING.imageUrls,
        }),
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/listings', 'a-brand-new-title-abc123'], {
        replaceUrl: true,
      });
    });
  });

  describe('location field', () => {
    let restoreLocalStorage: () => void;

    beforeEach(() => {
      restoreLocalStorage = installFakeLocalStorage();
    });

    afterEach(() => {
      restoreLocalStorage();
    });

    it('should default a new listing to the current search location', () => {
      localStorage.setItem(
        'um-search-location',
        JSON.stringify({
          ...TEST_LOCATION,
          radiusKm: 10,
          source: 'saved',
          updatedAt: new Date().toISOString(),
        }),
      );

      const fixture = setup();

      expect(fixture.componentInstance.listingModel().location).toEqual(TEST_LOCATION);
    });

    it('should block submit and never call create when no location is set', async () => {
      const createSpy = vi.fn();
      const fixture = setup({
        authService: { currentUser: () => ({ id: 'user-1' }) },
        listingService: { create: createSpy },
      });

      fixture.componentInstance.listingModel.update((value) => ({
        title: 'A perfectly valid title',
        description: 'A perfectly valid description for this listing.',
        price: '10',
        currency: value.currency,
        category: 'Electronics',
        location: null,
      }));
      fixture.detectChanges();

      await fixture.componentInstance.onSubmit();

      expect(createSpy).not.toHaveBeenCalled();
      expect(fixture.componentInstance.locationTouched()).toBe(true);
    });

    it('should set the geocoded area when a suggestion is picked', () => {
      const fixture = setup();

      fixture.componentInstance.onLocationPicked({
        id: 'place.1',
        displayName: TEST_LOCATION.displayName,
        countryCode: TEST_LOCATION.countryCode,
        region: TEST_LOCATION.region,
        city: TEST_LOCATION.city,
        neighborhood: TEST_LOCATION.neighborhood,
        latitude: TEST_LOCATION.latitude,
        longitude: TEST_LOCATION.longitude,
      });

      expect(fixture.componentInstance.listingModel().location?.displayName).toBe(
        TEST_LOCATION.displayName,
      );
    });

    it('should show a location-specific error (not the generic one) when resolving the current location fails', async () => {
      const fixture = setup();
      const geolocationProvider = TestBed.inject(GEOLOCATION_PROVIDER);
      vi.mocked(geolocationProvider.getCurrentPosition).mockRejectedValue(
        new GeolocationError('permission-denied'),
      );
      // ToastService is provided at the component level (see @Component's
      // providers), not the root injector — TestBed.inject() would resolve
      // a different instance than the one the component actually uses.
      const toastService = fixture.debugElement.injector.get(ToastService);
      const errorSpy = vi.spyOn(toastService, 'error');

      await fixture.componentInstance.onUseCurrentLocationForListing();

      expect(errorSpy).toHaveBeenCalledWith(
        'Location access was denied. Please search for a city or area instead.',
      );
    });
  });
});
