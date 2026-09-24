import { TestBed } from '@angular/core/testing';
import { ListingDetailStore } from './listing-detail.store';
import { AuthService } from '../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
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
import type { UserRepository } from '../../../domain/user/user.repository';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

const owner = mockUser({ id: 'owner-1' });
const otherUser = mockUser({ id: 'someone-else' });

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: owner.id,
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
    updateSpy?: ReturnType<typeof vi.fn<ListingRepository['update']>>;
    deleteSpy?: ReturnType<typeof vi.fn<ListingRepository['delete']>>;
    getOwnerById?: ReturnType<typeof vi.fn<UserRepository['getById']>>;
  } = {},
): Promise<{
  store: ListingDetailStore;
  authProviderMock: ReturnType<typeof createAuthProviderMock>;
}> {
  const authProviderMock = createAuthProviderMock();

  const listingRepositoryMock: Partial<ListingRepository> = {
    getById: options.getById ?? vi.fn(async () => listing()),
    update: options.updateSpy ?? vi.fn(async () => undefined),
    delete: options.deleteSpy ?? vi.fn(async () => undefined),
  };
  const userRepositoryMock: Partial<UserRepository> = {
    getById: options.getOwnerById ?? vi.fn(async () => owner),
  };

  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule()],
    providers: [
      ListingDetailStore,
      { provide: AUTH_PROVIDER, useValue: authProviderMock },
      { provide: LISTING_REPOSITORY, useValue: listingRepositoryMock },
      { provide: USER_REPOSITORY, useValue: userRepositoryMock },
      { provide: IMAGE_STORAGE, useValue: { upload: vi.fn() } as ImageStorage },
    ],
  });

  const authService = TestBed.inject(AuthService);
  authProviderMock.emitAuthState(null);
  await authService.ready;

  return { store: TestBed.inject(ListingDetailStore), authProviderMock };
}

describe('ListingDetailStore', () => {
  it('should create', async () => {
    const { store } = await setup();
    expect(store).toBeTruthy();
  });

  describe('load', () => {
    it('should populate listing and owner on success', async () => {
      const { store } = await setup();

      await store.load('listing-1');

      expect(store.listing()).toEqual(listing());
      expect(store.owner()).toEqual(owner);
      expect(store.isLoading()).toBe(false);
      expect(store.errorType()).toBeNull();
    });

    it('should set errorType to not-found when the listing does not exist', async () => {
      const { store } = await setup({ getById: vi.fn(async () => null) });

      await store.load('missing');

      expect(store.listing()).toBeNull();
      expect(store.errorType()).toBe('not-found');
      expect(store.isLoading()).toBe(false);
    });

    it('should set errorType to generic when the fetch throws', async () => {
      const { store } = await setup({
        getById: vi.fn(async () => {
          throw new Error('network down');
        }),
      });

      await store.load('listing-1');

      expect(store.errorType()).toBe('generic');
      expect(store.isLoading()).toBe(false);
    });

    it('should leave the owner unset when the owner fetch fails, without failing the whole load', async () => {
      const { store } = await setup({
        getOwnerById: vi.fn(async () => {
          throw new Error('deleted account');
        }),
      });

      await store.load('listing-1');

      expect(store.listing()).toEqual(listing());
      expect(store.owner()).toBeNull();
      expect(store.errorType()).toBeNull();
    });

    it('should reset stale state from a previous listing before loading the next one', async () => {
      const secondListing = listing({ id: 'listing-2', title: 'A different item' });
      const getById = vi
        .fn<ListingRepository['getById']>()
        .mockResolvedValueOnce(listing())
        .mockResolvedValueOnce(secondListing);
      const { store } = await setup({ getById });

      await store.load('listing-1');
      await store.markAsSold();
      expect(store.listing()?.status).toBe('sold');

      await store.load('listing-2');

      expect(store.listing()).toEqual(secondListing);
      expect(store.isMarkingSold()).toBe(false);
      expect(store.errorType()).toBeNull();
    });
  });

  describe('isOwner', () => {
    it('should be false when no user is signed in', async () => {
      const { store } = await setup();
      await store.load('listing-1');

      expect(store.isOwner()).toBe(false);
    });

    it('should be false when the signed-in user is not the listing owner', async () => {
      const { store, authProviderMock } = await setup();
      authProviderMock.emitAuthState(otherUser);
      await store.load('listing-1');

      expect(store.isOwner()).toBe(false);
    });

    it('should be true when the signed-in user owns the listing', async () => {
      const { store, authProviderMock } = await setup();
      authProviderMock.emitAuthState(owner);
      await store.load('listing-1');

      expect(store.isOwner()).toBe(true);
    });
  });

  describe('publish', () => {
    it('should update the listing to active and clear isPublishing on success', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => undefined);
      const { store } = await setup({
        getById: vi.fn(async () => listing({ status: 'draft' })),
        updateSpy,
      });

      await store.load('listing-1');
      await store.publish();

      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
      expect(store.listing()?.status).toBe('active');
      expect(store.isPublishing()).toBe(false);
    });

    it('should clear isPublishing even when the update fails', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => {
        throw new Error('offline');
      });
      const { store } = await setup({
        getById: vi.fn(async () => listing({ status: 'draft' })),
        updateSpy,
      });
      await store.load('listing-1');

      await expect(store.publish()).rejects.toThrow('offline');
      expect(store.isPublishing()).toBe(false);
      expect(store.listing()?.status).toBe('draft');
    });

    it('should no-op when no listing is loaded', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => undefined);
      const { store } = await setup({ updateSpy });

      await store.publish();

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('markAsSold', () => {
    it('should update the listing to sold', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => undefined);
      const { store } = await setup({ updateSpy });
      await store.load('listing-1');

      await store.markAsSold();

      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'sold' }));
      expect(store.listing()?.status).toBe('sold');
      expect(store.isMarkingSold()).toBe(false);
    });

    it('should no-op when the listing is already sold', async () => {
      const updateSpy = vi.fn<ListingRepository['update']>(async () => undefined);
      const { store } = await setup({
        getById: vi.fn(async () => listing({ status: 'sold' })),
        updateSpy,
      });
      await store.load('listing-1');

      await store.markAsSold();

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the listing and clear it from the store', async () => {
      const deleteSpy = vi.fn<ListingRepository['delete']>(async () => undefined);
      const { store } = await setup({ deleteSpy });
      await store.load('listing-1');

      await store.delete();

      expect(deleteSpy).toHaveBeenCalledWith('listing-1');
      expect(store.listing()).toBeNull();
    });

    it('should no-op when no listing is loaded', async () => {
      const deleteSpy = vi.fn<ListingRepository['delete']>(async () => undefined);
      const { store } = await setup({ deleteSpy });

      await store.delete();

      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
