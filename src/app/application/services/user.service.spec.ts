import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { USER_REPOSITORY } from '../../core/configuration/tokens';
import type { UserRepository } from '../../domain/user/user.repository';
import { mockUser } from '../../domain/user/user.mock';
import type { User } from '../../domain/user/user.model';

describe('UserService', () => {
  let repository: {
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  function setup(stored: User | null = null): UserService {
    repository = {
      getById: vi.fn().mockResolvedValue(stored),
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

  describe('waitForProfile', () => {
    it('should return and set the profile immediately when it already exists', async () => {
      const stored = mockUser({ settings: { language: 'es' } });
      const service = setup(stored);

      const result = await service.waitForProfile('user-1');

      expect(result).toEqual(stored);
      expect(service.profile()).toEqual(stored);
      expect(repository.getById).toHaveBeenCalledTimes(1);
    });

    it('should poll until the doc appears', async () => {
      const stored = mockUser();
      repository = {
        getById: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(stored),
        update: vi.fn().mockResolvedValue(undefined),
        updateSettings: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      TestBed.configureTestingModule({
        providers: [{ provide: USER_REPOSITORY, useValue: repository as UserRepository }],
      });
      const service = TestBed.inject(UserService);

      const result = await service.waitForProfile('user-1', 5, 0);

      expect(result).toEqual(stored);
      expect(service.profile()).toEqual(stored);
      expect(repository.getById).toHaveBeenCalledTimes(3);
    });

    it('should give up and clear the profile after exhausting all attempts', async () => {
      const service = setup(null);

      const result = await service.waitForProfile('user-1', 2, 0);

      expect(result).toBeNull();
      expect(service.profile()).toBeNull();
      expect(repository.getById).toHaveBeenCalledTimes(2);
    });

    it('should not re-poll on a second call for the same id once already cached and onboarded', async () => {
      const stored = mockUser({ onboarded: true });
      const service = setup(stored);
      await service.waitForProfile('user-1');

      const result = await service.waitForProfile('user-1');

      expect(result).toEqual(stored);
      expect(repository.getById).toHaveBeenCalledTimes(1);
    });

    it('should always refetch when the cached profile is not yet onboarded', async () => {
      const notOnboarded = mockUser({ onboarded: false });
      const onboardedNow = mockUser({ onboarded: true });
      repository = {
        getById: vi.fn().mockResolvedValueOnce(notOnboarded).mockResolvedValueOnce(onboardedNow),
        update: vi.fn().mockResolvedValue(undefined),
        updateSettings: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      TestBed.configureTestingModule({
        providers: [{ provide: USER_REPOSITORY, useValue: repository as UserRepository }],
      });
      const service = TestBed.inject(UserService);
      await service.waitForProfile('user-1');

      const result = await service.waitForProfile('user-1');

      expect(result).toEqual(onboardedNow);
      expect(repository.getById).toHaveBeenCalledTimes(2);
    });

    it('should flag isCheckingProfile only while actually polling, not on the cached fast path', async () => {
      const stored = mockUser();
      const service = setup(stored);

      await service.waitForProfile('user-1');

      expect(service.isCheckingProfile()).toBe(false);
    });

    it('should flag isCheckingProfile during polling and clear it once resolved', async () => {
      const stored = mockUser();
      let sawCheckingDuringPoll = false;
      repository = {
        getById: vi.fn().mockImplementation(async () => {
          sawCheckingDuringPoll ||= service.isCheckingProfile();
          return stored;
        }),
        update: vi.fn().mockResolvedValue(undefined),
        updateSettings: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };
      TestBed.configureTestingModule({
        providers: [{ provide: USER_REPOSITORY, useValue: repository as UserRepository }],
      });
      const service = TestBed.inject(UserService);

      await service.waitForProfile('user-1');

      expect(sawCheckingDuringPoll).toBe(true);
      expect(service.isCheckingProfile()).toBe(false);
    });

    it('should clear isCheckingProfile even when polling exhausts all attempts', async () => {
      const service = setup(null);

      await service.waitForProfile('user-1', 2, 0);

      expect(service.isCheckingProfile()).toBe(false);
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
      const service = setup(mockUser());
      await service.loadProfile('user-1');

      await service.updateSettings('user-1', { language: 'es' });

      expect(service.profile()?.settings).toEqual({ language: 'es' });
    });

    it('should leave a different user profile untouched', async () => {
      const service = setup(mockUser());
      await service.loadProfile('user-1');

      await service.updateSettings('user-2', { language: 'es' });

      expect(service.profile()?.settings).toEqual({ language: 'en' });
    });
  });

  it('should clear the profile on account deletion', async () => {
    const service = setup(mockUser());
    await service.loadProfile('user-1');

    await service.deleteAccount('user-1');

    expect(repository.delete).toHaveBeenCalledWith('user-1');
    expect(service.profile()).toBeNull();
  });
});
