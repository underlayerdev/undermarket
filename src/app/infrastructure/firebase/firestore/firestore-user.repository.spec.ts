import { TestBed } from '@angular/core/testing';
import * as firestoreModule from 'firebase/firestore';
import { FirestoreUserRepository } from './firestore-user.repository';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type { User } from '../../../domain/user/user.model';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

const baseDocData = {
  email: 'test@example.com',
  displayName: 'Test User',
  photoUrl: null,
  settings: { language: 'en' },
  providerId: 'password',
  createdAt: { toDate: () => new Date('2026-01-01') },
};

const testUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  settings: { language: 'en' },
  providerId: 'password',
  createdAt: new Date('2026-01-01'),
};

const profileCity = {
  displayName: 'Palermo, Buenos Aires',
  city: 'Buenos Aires',
  region: 'Buenos Aires',
  countryCode: 'AR',
};

describe('FirestoreUserRepository', () => {
  function createRepository(): FirestoreUserRepository {
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_FIRESTORE, useValue: {} }],
    });
    return TestBed.inject(FirestoreUserRepository);
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not include profileCity on a user with none set', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => baseDocData,
    } as never);
    const repository = createRepository();

    const user = await repository.getById('user-1');

    expect(user).not.toBeNull();
    expect('profileCity' in user!).toBe(false);
  });

  it('should round-trip profileCity when present on the document', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ ...baseDocData, profileCity }),
    } as never);
    const repository = createRepository();

    const user = await repository.getById('user-1');

    expect(user?.profileCity).toEqual(profileCity);
  });

  it('should write profileCity as null (not omitted) when creating a user with none', async () => {
    const repository = createRepository();

    await repository.create(testUser);

    const [, payload] = vi.mocked(firestoreModule.setDoc).mock.calls[0];
    expect(payload).toMatchObject({ profileCity: null });
  });

  it('should write the given profileCity when updating a user', async () => {
    const repository = createRepository();

    await repository.update({ ...testUser, profileCity });

    const [, payload] = vi.mocked(firestoreModule.setDoc).mock.calls[0];
    expect(payload).toMatchObject({ profileCity });
  });

  it('should clear profileCity back to null when updating a user without one', async () => {
    const repository = createRepository();

    await repository.update(testUser);

    const [, payload] = vi.mocked(firestoreModule.setDoc).mock.calls[0];
    expect(payload).toMatchObject({ profileCity: null });
  });
});
