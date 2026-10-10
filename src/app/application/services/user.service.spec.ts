import type { WritableSignal } from '@angular/core';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import {
  DISPLAY_NAME_PROVIDER,
  USER_REPOSITORY,
  USERNAME_PROVIDER,
} from '../../core/configuration/tokens';
import type { UserRepository } from '../../domain/user/user.repository';
import { mockUser } from '../../domain/user/user.mock';
import type { AuthUser, User } from '../../domain/user/user.model';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function signedIn(id: string): AuthUser {
  return { id, providerId: 'password' };
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('UserService', () => {
  let repository: {
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateSettings: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getByUsername: ReturnType<typeof vi.fn>;
    isUsernameAvailable: ReturnType<typeof vi.fn>;
  };
  let usernameProvider: { claim: ReturnType<typeof vi.fn> };
  let displayNameProvider: { change: ReturnType<typeof vi.fn> };
  let authUser: WritableSignal<AuthUser | null>;

  beforeEach(() => {
    authUser = signal<AuthUser | null>(null);
  });

  function setup(stored: User | null = null): UserService {
    repository = {
      getById: vi.fn().mockResolvedValue(stored),
      update: vi.fn().mockResolvedValue(undefined),
      updateSettings: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      getByUsername: vi.fn().mockResolvedValue(null),
      isUsernameAvailable: vi.fn().mockResolvedValue(true),
    };
    usernameProvider = { claim: vi.fn() };
    displayNameProvider = { change: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: USER_REPOSITORY, useValue: repository as UserRepository },
        { provide: USERNAME_PROVIDER, useValue: usernameProvider },
        { provide: DISPLAY_NAME_PROVIDER, useValue: displayNameProvider },
        { provide: AuthService, useValue: { currentUser: authUser } },
      ],
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
        getByUsername: vi.fn().mockResolvedValue(null),
        isUsernameAvailable: vi.fn().mockResolvedValue(true),
      };
      TestBed.configureTestingModule({
        providers: [
          { provide: USER_REPOSITORY, useValue: repository as UserRepository },
          { provide: USERNAME_PROVIDER, useValue: usernameProvider },
          { provide: DISPLAY_NAME_PROVIDER, useValue: displayNameProvider },
          { provide: AuthService, useValue: { currentUser: authUser } },
        ],
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
        getByUsername: vi.fn().mockResolvedValue(null),
        isUsernameAvailable: vi.fn().mockResolvedValue(true),
      };
      TestBed.configureTestingModule({
        providers: [
          { provide: USER_REPOSITORY, useValue: repository as UserRepository },
          { provide: USERNAME_PROVIDER, useValue: usernameProvider },
          { provide: DISPLAY_NAME_PROVIDER, useValue: displayNameProvider },
          { provide: AuthService, useValue: { currentUser: authUser } },
        ],
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
        getByUsername: vi.fn().mockResolvedValue(null),
        isUsernameAvailable: vi.fn().mockResolvedValue(true),
      };
      TestBed.configureTestingModule({
        providers: [
          { provide: USER_REPOSITORY, useValue: repository as UserRepository },
          { provide: USERNAME_PROVIDER, useValue: usernameProvider },
          { provide: DISPLAY_NAME_PROVIDER, useValue: displayNameProvider },
          { provide: AuthService, useValue: { currentUser: authUser } },
        ],
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
      authUser.set(signedIn('user-1'));
      await service.loadProfile('user-1');

      await service.updateSettings('user-1', { language: 'es' });

      expect(service.profile()?.settings).toEqual({ language: 'es' });
    });

    it('should leave a different user profile untouched', async () => {
      const service = setup(mockUser());
      authUser.set(signedIn('user-1'));
      await service.loadProfile('user-1');

      await service.updateSettings('user-2', { language: 'es' });

      expect(service.profile()?.settings).toEqual({ language: 'en' });
    });
  });

  it('should clear the profile on account deletion', async () => {
    const service = setup(mockUser());
    authUser.set(signedIn('user-1'));
    await service.loadProfile('user-1');

    await service.deleteAccount('user-1');

    expect(repository.delete).toHaveBeenCalledWith('user-1');
    expect(service.profile()).toBeNull();
  });

  describe('changeDisplayName', () => {
    it('should change through the provider and store the normalized name', async () => {
      const service = setup();
      service.profile.set(mockUser({ displayName: 'Old Name' }));
      displayNameProvider.change.mockResolvedValue({ displayName: 'José María' });

      await service.changeDisplayName('  José   María ');

      expect(displayNameProvider.change).toHaveBeenCalledWith('  José   María ');
      expect(service.profile()?.displayName).toBe('José María');
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should leave the profile untouched when the name is refused', async () => {
      const service = setup();
      service.profile.set(mockUser({ displayName: 'Old Name' }));
      displayNameProvider.change.mockRejectedValue({ code: 'user/display-name-invalid' });

      await expect(service.changeDisplayName('Admin')).rejects.toEqual({
        code: 'user/display-name-invalid',
      });
      expect(service.profile()?.displayName).toBe('Old Name');
    });
  });

  describe('changeUsername', () => {
    it('should claim through the provider and patch the loaded profile', async () => {
      const service = setup();
      service.profile.set(mockUser({ username: 'old.handle' }));
      const changedAt = new Date('2026-10-08T12:00:00Z');
      usernameProvider.claim.mockResolvedValue({
        username: 'new.handle',
        usernameChangedAt: changedAt,
      });

      await service.changeUsername('new.handle');

      expect(usernameProvider.claim).toHaveBeenCalledWith('new.handle');
      expect(service.profile()).toEqual(
        expect.objectContaining({ username: 'new.handle', usernameChangedAt: changedAt }),
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should leave the profile untouched when the claim fails', async () => {
      const service = setup();
      service.profile.set(mockUser({ username: 'old.handle' }));
      usernameProvider.claim.mockRejectedValue({ code: 'functions/already-exists' });

      await expect(service.changeUsername('taken')).rejects.toEqual({
        code: 'functions/already-exists',
      });
      expect(service.profile()?.username).toBe('old.handle');
    });
  });

  describe('isUsernameAvailable', () => {
    it("should check against the loaded profile's id", async () => {
      const service = setup();
      service.profile.set(mockUser({ id: 'user-7' }));

      await expect(service.isUsernameAvailable('jane')).resolves.toBe(true);
      expect(repository.isUsernameAvailable).toHaveBeenCalledWith('jane', 'user-7');
    });

    it('should report unavailable without a loaded profile', async () => {
      const service = setup();

      await expect(service.isUsernameAvailable('jane')).resolves.toBe(false);
      expect(repository.isUsernameAvailable).not.toHaveBeenCalled();
    });
  });

  describe('following the session', () => {
    it('should load the profile when a user signs in, without any guard involved', async () => {
      const stored = mockUser({ id: 'user-1' });
      const service = setup(stored);

      authUser.set(signedIn('user-1'));
      TestBed.tick();
      await flushAsync();

      expect(repository.getById).toHaveBeenCalledWith('user-1');
      expect(service.profile()).toEqual(stored);
    });

    it('should clear the profile when the user signs out', async () => {
      const service = setup(mockUser({ id: 'user-1' }));
      authUser.set(signedIn('user-1'));
      TestBed.tick();
      await flushAsync();

      authUser.set(null);
      TestBed.tick();

      expect(service.profile()).toBeNull();
    });

    it("should drop the previous user's profile at once when a different user signs in", async () => {
      const service = setup(mockUser({ id: 'user-1' }));
      authUser.set(signedIn('user-1'));
      TestBed.tick();
      await flushAsync();
      const second = deferred<User | null>();
      repository.getById.mockReturnValueOnce(second.promise);

      authUser.set(signedIn('user-2'));
      TestBed.tick();

      expect(service.profile()).toBeNull();
      second.resolve(mockUser({ id: 'user-2', displayName: 'Second' }));
      await flushAsync();
      expect(service.profile()?.displayName).toBe('Second');
    });

    it('should not read again when a guard already loaded this user', async () => {
      const service = setup();
      service.profile.set(mockUser({ id: 'user-1' }));

      authUser.set(signedIn('user-1'));
      TestBed.tick();
      await flushAsync();

      expect(repository.getById).not.toHaveBeenCalled();
    });

    it('should ignore a response that arrives after the user signed out', async () => {
      const service = setup();
      const pending = deferred<User | null>();
      repository.getById.mockReturnValueOnce(pending.promise);
      authUser.set(signedIn('user-1'));
      TestBed.tick();

      authUser.set(null);
      TestBed.tick();
      pending.resolve(mockUser({ id: 'user-1' }));
      await flushAsync();

      expect(service.profile()).toBeNull();
    });

    it('should not let an early empty read wipe a profile waitForProfile already found', async () => {
      const service = setup();
      const early = deferred<User | null>();
      repository.getById.mockReturnValueOnce(early.promise);
      authUser.set(signedIn('user-1'));
      TestBed.tick();

      service.profile.set(mockUser({ id: 'user-1' }));
      early.resolve(null);
      await flushAsync();

      expect(service.profile()?.id).toBe('user-1');
    });

    it('should share one read between concurrent loadProfile calls for the same user', async () => {
      const service = setup(mockUser({ id: 'user-1' }));
      authUser.set(signedIn('user-1'));

      await Promise.all([service.loadProfile('user-1'), service.loadProfile('user-1')]);

      expect(repository.getById).toHaveBeenCalledTimes(1);
    });

    it('should read again for a later loadProfile once the first has finished', async () => {
      const service = setup(mockUser({ id: 'user-1' }));
      authUser.set(signedIn('user-1'));

      await service.loadProfile('user-1');
      await service.loadProfile('user-1');

      expect(repository.getById).toHaveBeenCalledTimes(2);
    });
  });
});
