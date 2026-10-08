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
  username: 'test.user',
  photoUrl: null,
  settings: { language: 'en' },
  providerId: 'password',
  createdAt: { toDate: () => new Date('2026-01-01') },
};

const testUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  username: 'test.user',
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

  it('should treat a missing onboarded field as already onboarded', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => baseDocData,
    } as never);
    const repository = createRepository();

    const user = await repository.getById('user-1');

    expect(user?.onboarded).toBe(true);
  });

  it('should preserve an explicit onboarded: false rather than defaulting it', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ ...baseDocData, onboarded: false }),
    } as never);
    const repository = createRepository();

    const user = await repository.getById('user-1');

    expect(user?.onboarded).toBe(false);
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

  it('should never write onboarded — it is a server-only field', async () => {
    const repository = createRepository();

    await repository.update({ ...testUser, onboarded: true });

    const [, payload] = vi.mocked(firestoreModule.setDoc).mock.calls[0];
    expect('onboarded' in (payload as object)).toBe(false);
  });

  describe('usernames', () => {
    function mockDocs(docs: Record<string, Record<string, unknown>>): void {
      vi.mocked(firestoreModule.doc).mockImplementation(
        (_firestore: unknown, ...segments: string[]) => ({ path: segments.join('/') }) as never,
      );
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (ref: unknown) => {
        const data = docs[(ref as { path: string }).path];
        return { exists: () => !!data, data: () => data } as never;
      });
    }

    it('should map username and usernameChangedAt from the user doc', async () => {
      mockDocs({
        'users/user-1': {
          ...baseDocData,
          username: 'jane.doe',
          usernameChangedAt: { toDate: () => new Date('2026-09-01') },
        },
      });

      const user = await createRepository().getById('user-1');

      expect(user?.username).toBe('jane.doe');
      expect(user?.usernameChangedAt).toEqual(new Date('2026-09-01'));
    });

    it('should omit usernameChangedAt until the user has picked a handle themselves', async () => {
      mockDocs({ 'users/user-1': baseDocData });

      const user = await createRepository().getById('user-1');

      expect(user?.username).toBe('test.user');
      expect(user).not.toHaveProperty('usernameChangedAt');
    });

    it('should never write username from update()', async () => {
      await createRepository().update({ ...testUser, username: 'jane.doe' });

      const payload = vi.mocked(firestoreModule.setDoc).mock.calls[0][1];
      expect(payload).not.toHaveProperty('username');
      expect(payload).not.toHaveProperty('usernameChangedAt');
    });

    it('should resolve a handle to its owner through the usernames index', async () => {
      mockDocs({
        'usernames/jane.doe': { uid: 'user-1' },
        'users/user-1': { ...baseDocData, username: 'jane.doe' },
      });

      const user = await createRepository().getByUsername('jane.doe');

      expect(user?.id).toBe('user-1');
    });

    it('should resolve an unknown handle to null', async () => {
      mockDocs({});

      await expect(createRepository().getByUsername('nobody')).resolves.toBeNull();
    });

    it.each([
      ['free', {}, true],
      ['already mine', { 'usernames/jane': { uid: 'user-1' } }, true],
      ["someone else's", { 'usernames/jane': { uid: 'user-2' } }, false],
      [
        'released but still locked',
        {
          'usernames/jane': {
            uid: 'user-2',
            lockedUntil: { toDate: () => new Date(Date.now() + 60_000) },
          },
        },
        false,
      ],
      [
        'released with an expired lock',
        {
          'usernames/jane': {
            uid: 'user-2',
            lockedUntil: { toDate: () => new Date(Date.now() - 60_000) },
          },
        },
        true,
      ],
    ])('should report a %s handle as available=%s', async (_label, docs, expected) => {
      mockDocs(docs as Record<string, Record<string, unknown>>);

      await expect(createRepository().isUsernameAvailable('jane', 'user-1')).resolves.toBe(
        expected,
      );
    });
  });
});
