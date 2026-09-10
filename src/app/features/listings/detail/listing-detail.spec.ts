import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { ListingDetailComponent } from './listing-detail';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { SeoService } from '../../../core/seo/seo.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { ImageLightboxService } from '../../../shared/image-lightbox/image-lightbox.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('ListingDetailComponent', () => {
  const listing: Listing = {
    id: '123',
    ownerId: 'owner-1',
    title: 'Vintage lamp',
    description: 'A nice lamp',
    price: 42,
    currency: 'USD',
    category: 'Furniture',
    imageUrls: [],
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function setup(
    getById: ReturnType<typeof vi.fn>,
    slug = 'vintage-lamp-123',
    currentUser: { id: string } | null = null,
    listingServiceMock: { delete: ReturnType<typeof vi.fn>; update?: ReturnType<typeof vi.fn> } = {
      delete: vi.fn(),
    },
  ) {
    TestBed.configureTestingModule({
      imports: [ListingDetailComponent, getTranslocoTestingModule()],
      providers: [
        provideRouter([]),
        { provide: LISTING_REPOSITORY, useValue: { getById } },
        { provide: ListingService, useValue: listingServiceMock },
        { provide: AuthService, useValue: { currentUser: signal(currentUser) } },
        { provide: SeoService, useValue: { setPage: vi.fn(), setListing: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { slug } } } },
        { provide: ImageLightboxService, useValue: { open: vi.fn() } },
      ],
    });

    return TestBed.createComponent(ListingDetailComponent);
  }

  it('should publish a draft listing and reflect the new status', async () => {
    const draft: Listing = { ...listing, status: 'draft' };
    const updateSpy = vi.fn().mockResolvedValue(undefined);
    const fixture = setup(vi.fn().mockResolvedValue(draft), 'vintage-lamp-123', { id: 'owner-1' }, {
      delete: vi.fn(),
      update: updateSpy,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.onPublishClick();

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: draft.id, status: 'active' }),
    );
    expect(fixture.componentInstance.listing()?.status).toBe('active');
  });

  it('should create', () => {
    const fixture = setup(vi.fn().mockResolvedValue(listing));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the listing once loaded', async () => {
    const fixture = setup(vi.fn().mockResolvedValue(listing));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isLoading()).toBe(false);
    expect(fixture.componentInstance.listing()?.title).toBe('Vintage lamp');
    expect(fixture.componentInstance.errorType()).toBeNull();
  });

  it('should navigate to the listing edit route when the owner clicks Edit', async () => {
    const fixture = setup(vi.fn().mockResolvedValue(listing), 'vintage-lamp-123', {
      id: 'owner-1',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.isOwner()).toBe(true);

    const navigateByUrlSpy = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    const editButton = fixture.debugElement
      .queryAll(By.directive(RouterLink))
      .find((debugEl) => (debugEl.nativeElement as HTMLElement).textContent?.includes('Edit'));

    (editButton!.nativeElement as HTMLElement).click();

    expect(navigateByUrlSpy).toHaveBeenCalled();
    const navigatedUrl = navigateByUrlSpy.mock.calls[0][0].toString();
    expect(navigatedUrl).toBe('/listings/vintage-lamp-123/edit');
  });

  it('should set a not-found error type when the repository returns null', async () => {
    const fixture = setup(vi.fn().mockResolvedValue(null));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.errorType()).toBe('not-found');
    expect(fixture.componentInstance.listing()).toBeNull();
  });

  it('should set a generic error type when the repository throws', async () => {
    const fixture = setup(vi.fn().mockRejectedValue(new Error('network down')));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.errorType()).toBe('generic');
  });

  it('should clear the error and reload the listing on retry', async () => {
    const getById = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(listing);
    const fixture = setup(getById);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.errorType()).toBe('generic');

    await fixture.componentInstance.retry();

    expect(fixture.componentInstance.errorType()).toBeNull();
    expect(fixture.componentInstance.listing()?.title).toBe('Vintage lamp');
    expect(getById).toHaveBeenCalledTimes(2);
  });

  it('should go back in history when the back action is triggered', () => {
    const fixture = setup(vi.fn().mockResolvedValue(listing));
    const backSpy = vi.spyOn(TestBed.inject(Location), 'back');

    fixture.componentInstance.goBack();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the lightbox with the listing photos and tapped index when a photo is clicked', async () => {
    // jsdom has no matchMedia; the carousel's underlying Splide instance
    // calls it on mount to watch for reduced-motion/breakpoint changes.
    window.matchMedia ??= vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const listingWithPhotos: Listing = {
      ...listing,
      imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
    };
    const fixture = setup(vi.fn().mockResolvedValue(listingWithPhotos));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const triggers = fixture.nativeElement.querySelectorAll('.listing-detail__photo-trigger');
    expect(triggers.length).toBe(2);
    (triggers[1] as HTMLButtonElement).click();

    const imageLightboxService = TestBed.inject(ImageLightboxService);
    expect(imageLightboxService.open).toHaveBeenCalledTimes(1);
    const [images, startIndex] = (imageLightboxService.open as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(images).toEqual(listingWithPhotos.imageUrls);
    expect(startIndex).toBe(1);
  });
});
