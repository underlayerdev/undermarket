import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Location } from '@angular/common';
import { By, Title } from '@angular/platform-browser';
import { ListingDetailComponent } from './listing-detail';
import { ListingDetailStore } from './listing-detail.store';
import { AuthService } from '../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { stubMatchMedia } from '../../../../testing/match-media';
import {
  AUTH_PROVIDER,
  IMAGE_STORAGE,
  LISTING_REPOSITORY,
  USER_REPOSITORY,
} from '../../../core/configuration/tokens';
import type { AuthProvider } from '../../../domain/auth/auth.provider';
import type { ImageStorage } from '../../../domain/image-storage/image-storage.provider';
import type { ListingRepository } from '../../../domain/listing/listing.repository';
import type { Listing } from '../../../domain/listing/listing.model';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

// Same reasoning as ListingDetailStore's and ListingDetailActionsComponent's
// specs: a click's async handler chain crosses more microtask boundaries
// than a fixed number of `await Promise.resolve()` reliably covers.
function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const owner = mockUser({ id: 'owner-1', displayName: 'Owner Person' });
const buyer = mockUser({ id: 'buyer-1', displayName: 'Buyer Person' });

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: owner.id,
    title: 'Vintage lamp',
    description: 'A nice lamp, barely used.',
    price: 42,
    currency: 'USD',
    category: 'Furniture',
    imageUrls: [],
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createAuthProviderMock(): AuthProvider & { emitAuthState: (user: User | null) => void } {
  let listener: ((user: User | null) => void) | null = null;
  return {
    login: async () => owner,
    register: async () => owner,
    loginWithOAuth: async () => owner,
    loginAnonymously: async () => owner,
    sendPasswordResetEmail: async () => undefined,
    confirmPasswordReset: async () => undefined,
    changePassword: async () => undefined,
    updateDisplayName: async () => undefined,
    updatePhotoUrl: async () => undefined,
    deleteAccount: async () => undefined,
    logout: async () => undefined,
    currentUser: () => null,
    onAuthStateChange: (callback) => {
      listener = callback;
      return () => {
        listener = null;
      };
    },
    emitAuthState: (user) => listener?.(user),
  };
}

async function setup(
  options: {
    getById?: ReturnType<typeof vi.fn<ListingRepository['getById']>>;
    getOwnerById?: ReturnType<typeof vi.fn>;
    slug?: string;
    currentUser?: User | null;
  } = {},
): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<ListingDetailComponent>>;
  authProviderMock: ReturnType<typeof createAuthProviderMock>;
  locationBackSpy: ReturnType<typeof vi.fn>;
}> {
  stubMatchMedia();

  const authProviderMock = createAuthProviderMock();
  const locationBackSpy = vi.fn();
  const listingRepositoryMock: Partial<ListingRepository> = {
    getById: options.getById ?? vi.fn(async () => listing()),
    getLatest: vi.fn(async () => []),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  };

  TestBed.configureTestingModule({
    imports: [ListingDetailComponent, getTranslocoTestingModule()],
    providers: [
      provideRouter([]),
      { provide: Location, useValue: { back: locationBackSpy } },
      { provide: AUTH_PROVIDER, useValue: authProviderMock },
      { provide: LISTING_REPOSITORY, useValue: listingRepositoryMock },
      {
        provide: USER_REPOSITORY,
        useValue: { getById: options.getOwnerById ?? vi.fn(async () => owner) },
      },
      { provide: IMAGE_STORAGE, useValue: { upload: vi.fn() } as ImageStorage },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { params: { slug: options.slug ?? 'vintage-lamp-listing-1' } } },
      },
    ],
  });

  // AuthService only registers its listener with the provider from its own
  // constructor — injecting it here forces that construction, so
  // emitAuthState below actually reaches someone.
  const authService = TestBed.inject(AuthService);
  authProviderMock.emitAuthState(options.currentUser ?? null);
  await authService.ready;

  const fixture = TestBed.createComponent(ListingDetailComponent);
  return { fixture, authProviderMock, locationBackSpy };
}

describe('ListingDetailComponent', () => {
  it('should create', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('loading', () => {
    it('should show the loading skeleton before the fetch resolves', async () => {
      const { fixture } = await setup();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('um-listing-detail-loading')).not.toBeNull();
    });
  });

  describe('errors', () => {
    it('should show a not-found error and set the not-found page title when the listing does not exist', async () => {
      const { fixture } = await setup({ getById: vi.fn(async () => null) });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('um-listing-detail-error');
      expect(error).not.toBeNull();
      expect(TestBed.inject(Title).getTitle()).toContain('Listing not found');
    });

    it('should show a generic error and set the error page title when the fetch throws', async () => {
      const { fixture } = await setup({
        getById: vi.fn(async () => {
          throw new Error('network down');
        }),
      });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('um-listing-detail-error')).not.toBeNull();
      expect(TestBed.inject(Title).getTitle()).toContain('Error');
    });

    it('should retry the same slug when the error component emits retry', async () => {
      const getById = vi
        .fn<ListingRepository['getById']>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(listing());
      const { fixture } = await setup({ getById });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      await fixture.componentInstance.retry();
      fixture.detectChanges();

      expect(getById).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.querySelector('um-listing-detail-error')).toBeNull();
    });
  });

  describe('loaded', () => {
    it('should set the SEO title/description from the listing and show the breadcrumb title', async () => {
      const { fixture } = await setup();
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      expect(TestBed.inject(Title).getTitle()).toContain('Vintage lamp');
      expect(fixture.componentInstance.breadcrumbItems()[1].label).toBe('Vintage lamp');
    });

    it('should format the location label with neighborhood when present', async () => {
      const { fixture } = await setup({
        getById: vi.fn(async () =>
          listing({
            location: {
              displayName: 'Palermo, Buenos Aires',
              countryCode: 'AR',
              region: 'Buenos Aires',
              city: 'Buenos Aires',
              neighborhood: 'Palermo',
              latitude: -34.5875,
              longitude: -58.4205,
              geohash: '6ex2ug0d0',
            },
          }),
        ),
      });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      expect(fixture.componentInstance.listingLocationLabel()).toBe('Palermo, Buenos Aires');
    });

    it('should render the desktop share button with the listing title, for owner and buyer alike', async () => {
      const { fixture } = await setup({ currentUser: buyer });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      const shareButton = fixture.debugElement.query(By.css('um-share-button'));
      expect(shareButton.componentInstance.title()).toBe('Vintage lamp');
    });

    it('should fall back to just the city when there is no neighborhood', async () => {
      const { fixture } = await setup({
        getById: vi.fn(async () =>
          listing({
            location: {
              displayName: 'Buenos Aires',
              countryCode: 'AR',
              region: 'Buenos Aires',
              city: 'Buenos Aires',
              latitude: -34.6,
              longitude: -58.4,
              geohash: '6ex2ug0d0',
            },
          }),
        ),
      });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      expect(fixture.componentInstance.listingLocationLabel()).toBe('Buenos Aires');
    });
  });

  describe('owner vs buyer', () => {
    it('should show the owner actions, not the contact CTA, when the signed-in user owns the listing', async () => {
      const { fixture } = await setup({ currentUser: owner });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('um-listing-detail-actions').length).toBe(2);
      expect(fixture.nativeElement.querySelector('um-listing-detail-cta')).toBeNull();
    });

    it('should show the contact CTA, not the owner actions, for a non-owner', async () => {
      const { fixture } = await setup({ currentUser: buyer });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      // Still one instance: the mobile "..." menu, which renders for every
      // viewer so a non-owner can still share — see
      // ListingDetailActionsComponent's class doc.
      expect(fixture.nativeElement.querySelectorAll('um-listing-detail-actions').length).toBe(1);
      expect(fixture.nativeElement.querySelector('.listing-detail__owner-actions')).toBeNull();
      // Once in the info column, once in the mobile dock.
      expect(fixture.nativeElement.querySelectorAll('um-listing-detail-cta').length).toBe(2);
    });
  });

  describe('delete', () => {
    it('should open the confirmation modal when an actions instance requests it', async () => {
      const { fixture } = await setup({ currentUser: owner });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      fixture.componentInstance.showDeleteModal.set(true);
      fixture.detectChanges();

      expect(fixture.componentInstance.showDeleteModal()).toBe(true);
    });

    it('should delete via the store, close the modal, and navigate away on confirm', async () => {
      const { fixture } = await setup({ currentUser: owner });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();
      fixture.componentInstance.showDeleteModal.set(true);
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await fixture.componentInstance.confirmDelete();

      expect(fixture.componentInstance.showDeleteModal()).toBe(false);
      expect(fixture.debugElement.injector.get(ListingDetailStore).listing()).toBeNull();
      // store.delete() clears `listing`, leaving nothing for the @if/@else if
      // chain to match — without navigating away the page would render
      // blank rather than showing anything at all.
      expect(navigateSpy).toHaveBeenCalledWith(['/profile']);
    });

    it('should show the result modal with an error when delete fails, without navigating away', async () => {
      const { fixture } = await setup({ currentUser: owner });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();
      vi.spyOn(
        fixture.debugElement.injector.get(ListingDetailStore),
        'delete',
      ).mockRejectedValueOnce(new Error('offline'));
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await fixture.componentInstance.confirmDelete();
      fixture.detectChanges();

      expect(fixture.componentInstance.resultModal()?.variant).toBe('error');
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('result modal', () => {
    it('should show the result an actions instance emits, and clear it when dismissed', async () => {
      const { fixture } = await setup({ currentUser: owner });
      fixture.detectChanges();
      await flushAsync();
      fixture.detectChanges();

      fixture.componentInstance.resultModal.set({ variant: 'success', message: 'Published!' });
      fixture.detectChanges();

      // Both um-listing-detail-actions instances' target <ul-modal> and the
      // delete-confirmation <ul-modal> are both unconditionally in the
      // template — only their *internal* content is gated by `open()` — so
      // asserting on the whole page's text avoids depending on which one
      // querySelector happens to find first.
      expect(fixture.nativeElement.textContent).toContain('Published!');

      fixture.componentInstance.resultModal.set(null);
      fixture.detectChanges();

      expect(fixture.componentInstance.resultModal()).toBeNull();
    });
  });

  describe('goBack', () => {
    it('should navigate back via Location', async () => {
      const { fixture, locationBackSpy } = await setup();

      fixture.componentInstance.goBack();

      expect(locationBackSpy).toHaveBeenCalledTimes(1);
    });
  });
});
