import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ListingDetailHeaderComponent } from './listing-detail-header';
import { ListingDetailActionsComponent } from '../listing-detail-actions/listing-detail-actions';
import { ListingDetailStore } from '../listing-detail.store';
import { AuthService } from '../../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import {
  AUTH_PROVIDER,
  IMAGE_STORAGE,
  LISTING_REPOSITORY,
  USER_REPOSITORY,
} from '../../../../core/configuration/tokens';
import type { AuthProvider } from '../../../../domain/auth/auth.provider';
import type { ImageStorage } from '../../../../domain/image-storage/image-storage.provider';
import type { ListingRepository } from '../../../../domain/listing/listing.repository';
import type { Listing } from '../../../../domain/listing/listing.model';
import type { User } from '../../../../domain/user/user.model';

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: 'owner-1',
    title: 'A nice chair',
    description: 'A nice chair, barely used.',
    price: 1000,
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
    login: async () => {
      throw new Error('not implemented');
    },
    register: async () => {
      throw new Error('not implemented');
    },
    loginWithOAuth: async () => {
      throw new Error('not implemented');
    },
    loginAnonymously: async () => {
      throw new Error('not implemented');
    },
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

async function setup(): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<ListingDetailHeaderComponent>>;
  store: ListingDetailStore;
  locationBackSpy: ReturnType<typeof vi.fn>;
}> {
  const locationBackSpy = vi.fn();
  const authProviderMock = createAuthProviderMock();

  TestBed.configureTestingModule({
    imports: [ListingDetailHeaderComponent, getTranslocoTestingModule()],
    providers: [
      ListingDetailStore,
      provideRouter([]),
      { provide: Location, useValue: { back: locationBackSpy } },
      { provide: AUTH_PROVIDER, useValue: authProviderMock },
      { provide: LISTING_REPOSITORY, useValue: { getById: vi.fn(async () => listing()) } },
      { provide: USER_REPOSITORY, useValue: { getById: vi.fn(async () => null) } },
      { provide: IMAGE_STORAGE, useValue: { upload: vi.fn() } as ImageStorage },
    ],
  });

  const authService = TestBed.inject(AuthService);
  authProviderMock.emitAuthState(null);
  await authService.ready;

  const store = TestBed.inject(ListingDetailStore);
  await store.load('listing-1');

  const fixture = TestBed.createComponent(ListingDetailHeaderComponent);
  fixture.detectChanges();
  return { fixture, store, locationBackSpy };
}

describe('ListingDetailHeaderComponent', () => {
  it('should create', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the mobile action menu', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('um-listing-detail-actions')).not.toBeNull();
  });

  it('should navigate back via Location when the back button is clicked', async () => {
    const { fixture, locationBackSpy } = await setup();

    fixture.nativeElement.querySelector('button').click();

    expect(locationBackSpy).toHaveBeenCalledTimes(1);
  });

  it("should open the store's delete modal when the actions menu requests it", async () => {
    const { fixture, store } = await setup();

    fixture.debugElement
      .query(By.directive(ListingDetailActionsComponent))
      .componentInstance.deleteRequested.emit();

    expect(store.showDeleteModal()).toBe(true);
  });

  it("should write the actions menu's result into the store's shared result modal", async () => {
    const { fixture, store } = await setup();

    fixture.debugElement
      .query(By.directive(ListingDetailActionsComponent))
      .componentInstance.actionResult.emit({ variant: 'success', message: 'Link copied' });

    expect(store.resultModal()).toEqual({ variant: 'success', message: 'Link copied' });
  });
});
