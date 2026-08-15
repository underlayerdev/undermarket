import { TestBed } from '@angular/core/testing';
import { ListingService } from './listing.service';
import { AuthService } from './auth.service';
import { AUTH_PROVIDER, IMAGE_STORAGE, LISTING_REPOSITORY } from '../../core/configuration/tokens';
import type { AuthProvider } from '../../domain/auth/auth.provider';
import type { ImageStorage } from '../../domain/image-storage/image-storage.provider';
import type { ListingRepository } from '../../domain/listing/listing.repository';
import type { Listing } from '../../domain/listing/listing.model';
import type { User } from '../../domain/user/user.model';
import type { NewListingInput } from '../../domain/listing/listing.validator';

const testUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  settings: { theme: 'light', language: 'en' },
  createdAt: new Date(),
};

function validInput(overrides: Partial<NewListingInput> = {}): NewListingInput {
  return {
    ownerId: testUser.id,
    title: 'Vintage lamp',
    description: 'A nice lamp in good condition.',
    price: 25,
    currency: 'ARS',
    category: 'Furniture',
    status: 'active',
    ...overrides,
  };
}

function createAuthProviderMock(): AuthProvider & { emitAuthState: (user: User | null) => void } {
  let listener: ((user: User | null) => void) | null = null;
  return {
    login: async () => testUser,
    register: async () => testUser,
    loginWithOAuth: async () => testUser,
    loginAnonymously: async () => testUser,
    sendPasswordResetEmail: async () => undefined,
    confirmPasswordReset: async () => undefined,
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

describe('ListingService', () => {
  let authProviderMock: ReturnType<typeof createAuthProviderMock>;
  let createSpy: ReturnType<typeof vi.fn<ListingRepository['create']>>;
  let updateSpy: ReturnType<typeof vi.fn<ListingRepository['update']>>;
  let uploadSpy: ReturnType<typeof vi.fn<ImageStorage['upload']>>;

  async function setup(): Promise<{ service: ListingService; authService: AuthService }> {
    authProviderMock = createAuthProviderMock();
    createSpy = vi.fn<ListingRepository['create']>(async (listing): Promise<Listing> => ({
      ...listing,
      id: 'listing-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    updateSpy = vi.fn<ListingRepository['update']>(async () => undefined);
    uploadSpy = vi.fn<ImageStorage['upload']>(async (file) => `https://cdn.test/${file.name}`);

    const listingRepositoryMock: Partial<ListingRepository> = {
      create: createSpy,
      update: updateSpy,
    };
    const imageStorageMock: ImageStorage = { upload: uploadSpy };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_PROVIDER, useValue: authProviderMock },
        { provide: LISTING_REPOSITORY, useValue: listingRepositoryMock },
        { provide: IMAGE_STORAGE, useValue: imageStorageMock },
      ],
    });

    const authService = TestBed.inject(AuthService);
    const service = TestBed.inject(ListingService);
    authProviderMock.emitAuthState(null);
    await authService.ready;

    return { service, authService };
  }

  it('should create', async () => {
    const { service } = await setup();
    expect(service).toBeTruthy();
  });

  it('should throw and never call the repository when no user is signed in', async () => {
    const { service } = await setup();

    await expect(service.create(validInput())).rejects.toThrow(
      'You must be signed in to post a listing.',
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should throw when ownerId does not match the signed-in user', async () => {
    const { service } = await setup();
    authProviderMock.emitAuthState(testUser);

    await expect(service.create(validInput({ ownerId: 'someone-else' }))).rejects.toThrow(
      'You can only create listings for your own account.',
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should throw the validation message and never call the repository for invalid data', async () => {
    const { service } = await setup();
    authProviderMock.emitAuthState(testUser);

    await expect(service.create(validInput({ title: '' }))).rejects.toThrow('Title is required.');
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('should create the listing with an empty imageUrls array when signed in with valid data', async () => {
    const { service } = await setup();
    authProviderMock.emitAuthState(testUser);

    const listing = await service.create(validInput());

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ imageUrls: [] }));
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(listing.id).toBe('listing-1');
  });

  it('should upload images and attach their URLs via an update after creating the listing', async () => {
    const { service } = await setup();
    authProviderMock.emitAuthState(testUser);
    const image = new File(['data'], 'lamp.jpg', { type: 'image/jpeg' });

    const listing = await service.create(validInput(), [image]);

    expect(uploadSpy).toHaveBeenCalledWith(image);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'listing-1', imageUrls: ['https://cdn.test/lamp.jpg'] }),
    );
    expect(listing.imageUrls).toEqual(['https://cdn.test/lamp.jpg']);
  });
});
