import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { USER_REPOSITORY } from '../../core/configuration/tokens';
import type { UserRepository } from '../../domain/user/user.repository';
import type { User } from '../../domain/user/user.model';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    settings: { language: 'en' },
    providerId: 'password',
    createdAt: new Date('2024-03-15T10:00:00Z'),
    ...overrides,
  };
}

describe('UserService', () => {
  let repository: {
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  function setup(stored: User | null = null): UserService {
    repository = {
      getById: vi.fn().mockResolvedValue(stored),
      create: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      updateSettings: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: USER_REPOSITORY, useValue: repository as UserRepository }],
    });
    return TestBed.inject(UserService);
  }

  it('should create', () => {
    expect(setup()).toBeTruthy();
  });

  describe('ensureProfile', () => {
    it('should return the stored profile without writing when one exists', async () => {
      const stored = createUser({ settings: { language: 'es' } });
      const service = setup(stored);

      const result = await service.ensureProfile(createUser());

      expect(result).toEqual(stored);
      expect(service.profile()).toEqual(stored);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create the doc when the account has no profile yet', async () => {
      const service = setup(null);
      const user = createUser({ settings: { language: 'es' } });

      const result = await service.ensureProfile(user);

      expect(repository.create).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
      expect(service.profile()).toEqual(user);
    });
  });

  describe('updateSettings', () => {
    it('should persist settings against the given id', async () => {
      const service = setup();

      await service.updateSettings('user-1', { language: 'es' });

      expect(repository.updateSettings).toHaveBeenCalledWith('user-1', { language: 'es' });
    });

    it('should persist without a loaded profile', async () => {
      const service = setup();

      await service.updateSettings('user-1', { language: 'es' });

      expect(service.profile()).toBeNull();
      expect(repository.updateSettings).toHaveBeenCalled();
    });

    it('should patch the loaded profile in place', async () => {
      const service = setup(createUser());
      await service.loadProfile('user-1');

      await service.updateSettings('user-1', { language: 'es' });

      expect(service.profile()?.settings).toEqual({ language: 'es' });
    });

    it('should leave a different user profile untouched', async () => {
      const service = setup(createUser());
      await service.loadProfile('user-1');

      await service.updateSettings('user-2', { language: 'es' });

      expect(service.profile()?.settings).toEqual({ language: 'en' });
    });
  });

  it('should clear the profile on account deletion', async () => {
    const service = setup(createUser());
    await service.loadProfile('user-1');

    await service.deleteAccount('user-1');

    expect(repository.delete).toHaveBeenCalledWith('user-1');
    expect(service.profile()).toBeNull();
  });
});
