import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsAccountStore } from './settings-account.store';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('SettingsAccountStore', () => {
  function setup(initialProfile: User | null = mockUser()) {
    const profile = signal<User | null>(initialProfile);
    const updateProfileSpy = vi.fn(async (user: User) => {
      profile.set(user);
    });
    const changeUsernameSpy = vi.fn(async (username: string) => {
      const current = profile();
      if (current) profile.set({ ...current, username });
    });
    const isUsernameAvailableSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        SettingsAccountStore,
        {
          provide: UserService,
          useValue: {
            profile,
            updateProfile: updateProfileSpy,
            changeUsername: changeUsernameSpy,
            isUsernameAvailable: isUsernameAvailableSpy,
          },
        },
      ],
    });

    return {
      store: TestBed.inject(SettingsAccountStore),
      profile,
      updateProfileSpy,
      changeUsernameSpy,
      isUsernameAvailableSpy,
    };
  }

  it('should save a display name onto the current profile', async () => {
    const { store, profile, updateProfileSpy } = setup(mockUser({ displayName: 'Old Name' }));

    await store.saveDisplayName('New Name');

    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'New Name' }),
    );
    expect(profile()?.displayName).toBe('New Name');
  });

  it('should save a profile city onto the current profile', async () => {
    const { store, profile, updateProfileSpy } = setup(mockUser({ profileCity: undefined }));
    const city = {
      displayName: 'Palermo, Buenos Aires',
      city: 'Buenos Aires',
      region: 'Buenos Aires',
      countryCode: 'AR',
    };

    await store.saveProfileCity(city);

    expect(updateProfileSpy).toHaveBeenCalledWith(expect.objectContaining({ profileCity: city }));
    expect(profile()?.profileCity).toEqual(city);
  });

  it('should clear the profile city when given null', async () => {
    const { store, updateProfileSpy } = setup(
      mockUser({
        profileCity: { displayName: 'X', city: 'X', region: 'X', countryCode: 'AR' },
      }),
    );

    await store.saveProfileCity(null);

    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ profileCity: undefined }),
    );
  });

  it('should toggle isSavingDisplayName while the save is in flight', async () => {
    const { store, updateProfileSpy } = setup();
    const gate = deferred<void>();
    updateProfileSpy.mockImplementationOnce(() => gate.promise);

    expect(store.isSavingDisplayName()).toBe(false);
    const save = store.saveDisplayName('New Name');
    expect(store.isSavingDisplayName()).toBe(true);

    gate.resolve();
    await save;

    expect(store.isSavingDisplayName()).toBe(false);
  });

  it('should toggle isSavingProfileCity while the save is in flight', async () => {
    const { store, updateProfileSpy } = setup();
    const gate = deferred<void>();
    updateProfileSpy.mockImplementationOnce(() => gate.promise);

    expect(store.isSavingProfileCity()).toBe(false);
    const save = store.saveProfileCity(null);
    expect(store.isSavingProfileCity()).toBe(true);

    gate.resolve();
    await save;

    expect(store.isSavingProfileCity()).toBe(false);
  });

  it('should do nothing when there is no profile loaded yet', async () => {
    const { store, updateProfileSpy } = setup(null);

    await store.saveDisplayName('New Name');

    expect(updateProfileSpy).not.toHaveBeenCalled();
  });

  it('should propagate a rejected save to the caller and still reset the loading flag', async () => {
    const { store, updateProfileSpy } = setup();
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(store.saveDisplayName('New Name')).rejects.toThrow('network down');

    expect(store.isSavingDisplayName()).toBe(false);
  });

  it('should not let a failed save jam the queue for the next one', async () => {
    const { store, updateProfileSpy } = setup();
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));

    await expect(store.saveDisplayName('New Name')).rejects.toThrow('network down');
    await store.saveProfileCity(null);

    expect(updateProfileSpy).toHaveBeenCalledTimes(2);
  });

  it('should serialize concurrent saves so the second one never overwrites the first with a stale snapshot', async () => {
    const { store, profile, updateProfileSpy } = setup(mockUser({ displayName: 'Old Name' }));
    const calls: User[] = [];
    const gate = deferred<void>();
    let callCount = 0;
    updateProfileSpy.mockImplementation(async (user: User) => {
      calls.push(user);
      callCount++;
      if (callCount === 1) await gate.promise;
      profile.set(user);
    });

    const displayNameSave = store.saveDisplayName('New Name');
    const city = {
      displayName: 'Palermo',
      city: 'Palermo',
      region: 'Buenos Aires',
      countryCode: 'AR',
    };
    const citySave = store.saveProfileCity(city);

    gate.resolve();
    await displayNameSave;
    await citySave;

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(expect.objectContaining({ displayName: 'New Name' }));
    // The second write must have started from the FIRST write's result, not
    // the pre-save snapshot — otherwise it would silently drop displayName.
    expect(calls[1]).toEqual(
      expect.objectContaining({ displayName: 'New Name', profileCity: city }),
    );
  });

  describe('saveUsername', () => {
    it('should claim the handle and flag isSavingUsername while in flight', async () => {
      const { store, changeUsernameSpy } = setup();
      const gate = deferred<void>();
      changeUsernameSpy.mockImplementationOnce(() => gate.promise);

      const save = store.saveUsername('jane.doe');
      await Promise.resolve();
      expect(store.isSavingUsername()).toBe(true);

      gate.resolve();
      await save;

      expect(changeUsernameSpy).toHaveBeenCalledWith('jane.doe');
      expect(store.isSavingUsername()).toBe(false);
    });

    it('should not let an earlier display-name save restore the old handle', async () => {
      const { store, profile, updateProfileSpy } = setup(mockUser({ username: 'old.handle' }));
      const gate = deferred<void>();
      updateProfileSpy.mockImplementationOnce(async (user: User) => {
        await gate.promise;
        profile.set(user);
      });

      const displayNameSave = store.saveDisplayName('New Name');
      const usernameSave = store.saveUsername('new.handle');
      gate.resolve();
      await displayNameSave;
      await usernameSave;

      expect(profile()).toEqual(
        expect.objectContaining({ displayName: 'New Name', username: 'new.handle' }),
      );
    });

    it('should rethrow a failed claim', async () => {
      const { store, changeUsernameSpy } = setup();
      changeUsernameSpy.mockRejectedValueOnce({ code: 'functions/already-exists' });

      await expect(store.saveUsername('taken')).rejects.toEqual({
        code: 'functions/already-exists',
      });
    });
  });

  describe('checkUsernameAvailability', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    async function check(store: SettingsAccountStore, username: string): Promise<void> {
      store.checkUsernameAvailability(username);
      await vi.advanceTimersByTimeAsync(400);
    }

    it('should go checking → available after the debounce', async () => {
      const { store, isUsernameAvailableSpy } = setup(mockUser({ username: 'old.handle' }));

      store.checkUsernameAvailability('jane.doe');
      expect(store.usernameAvailability()).toBe('checking');
      await vi.advanceTimersByTimeAsync(400);

      expect(isUsernameAvailableSpy).toHaveBeenCalledWith('jane.doe');
      expect(store.usernameAvailability()).toBe('available');
    });

    it('should report a taken handle', async () => {
      const { store, isUsernameAvailableSpy } = setup(mockUser({ username: 'old.handle' }));
      isUsernameAvailableSpy.mockResolvedValue(false);

      await check(store, 'jane.doe');

      expect(store.usernameAvailability()).toBe('taken');
    });

    it('should only look up the last value typed within the debounce window', async () => {
      const { store, isUsernameAvailableSpy } = setup(mockUser({ username: 'old.handle' }));

      store.checkUsernameAvailability('jan');
      store.checkUsernameAvailability('jane');
      await vi.advanceTimersByTimeAsync(400);

      expect(isUsernameAvailableSpy).toHaveBeenCalledTimes(1);
      expect(isUsernameAvailableSpy).toHaveBeenCalledWith('jane');
    });

    it.each([
      ['unchanged', 'old.handle'],
      ['badly formatted', 'a..b'],
      ['reserved', 'admin'],
    ])('should stay idle without a lookup for a %s handle', async (_label, username) => {
      const { store, isUsernameAvailableSpy } = setup(mockUser({ username: 'old.handle' }));

      await check(store, username);

      expect(store.usernameAvailability()).toBe('idle');
      expect(isUsernameAvailableSpy).not.toHaveBeenCalled();
    });

    it('should fall back to idle when the lookup fails', async () => {
      const { store, isUsernameAvailableSpy } = setup(mockUser({ username: 'old.handle' }));
      isUsernameAvailableSpy.mockRejectedValue(new Error('offline'));

      await check(store, 'jane.doe');

      expect(store.usernameAvailability()).toBe('idle');
    });
  });
});
