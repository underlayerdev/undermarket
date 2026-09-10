import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NewListingComponent } from './new-listing';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

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
});
