import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, debounceTime, from, map, of, pipe, switchMap, tap } from 'rxjs';
import { UserService } from '../../../application/services/user.service';
import type { PublicCityInfo, User } from '../../../domain/user/user.model';
import { getUsernameFormatError } from '../../../domain/user/username';
import { withPendingOperations } from '../../../shared/state/with-pending-operations';

type SettingsProfileOperation = 'displayName' | 'profileCity' | 'username' | 'avatar';

/**
 * Availability of the handle currently typed in the username panel.
 * `idle` covers "nothing to check": empty, badly formatted, or unchanged.
 */
export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken';

interface SettingsProfileState {
  usernameAvailability: UsernameAvailability;
}

const initialState: SettingsProfileState = {
  usernameAvailability: 'idle',
};

// Long enough to not fire a read per keystroke, short enough to feel live.
const USERNAME_AVAILABILITY_DEBOUNCE_MS = 400;

/**
 * Profile-doc writes for the Profile tab, provided on
 * `SettingsProfileComponent` so every panel under it shares one instance.
 *
 * Every write goes through one queue and starts from the *latest* profile,
 * not the snapshot the caller saw. Without it, saving the display name and
 * the city back-to-back would spread the same stale profile twice and the
 * slower write would silently discard the other field.
 *
 * Commands throw on failure; the calling component decides how to show it.
 */
export const SettingsProfileStore = signalStore(
  withState(initialState),
  withProps(() => ({
    _userService: inject(UserService),
  })),
  withPendingOperations<SettingsProfileOperation>(),
  withComputed((store) => ({
    profile: computed(() => store._userService.profile()),
    isSavingDisplayName: computed(() => store.isPending('displayName')),
    isSavingProfileCity: computed(() => store.isPending('profileCity')),
    isSavingUsername: computed(() => store.isPending('username')),
    isSavingAvatar: computed(() => store.isPending('avatar')),
  })),
  withMethods((store) => {
    // Swallowed here (not on the Promise handed back to the caller) so one
    // rejected save doesn't jam the queue for the next one.
    let writeQueue: Promise<unknown> = Promise.resolve();

    function enqueue(write: () => Promise<void>): Promise<void> {
      const result = writeQueue.then(write);
      writeQueue = result.catch(() => undefined);
      return result;
    }

    function updateProfile(patch: Partial<User>): Promise<void> {
      return enqueue(async () => {
        const profile = store._userService.profile();
        if (!profile) return;
        await store._userService.updateProfile({ ...profile, ...patch });
      });
    }

    return {
      saveDisplayName(displayName: string): Promise<void> {
        return store.track('displayName', () =>
          // Queued with the other writes (not through updateProfile): the
          // callable returns a new profile, which must not be overwritten by
          // an earlier profile save that finishes after it.
          enqueue(async () => {
            if (!store._userService.profile()) return;
            await store._userService.changeDisplayName(displayName);
          }),
        );
      },

      saveAvatar(photoUrl: string): Promise<void> {
        return store.track('avatar', () => updateProfile({ photoUrl }));
      },

      saveProfileCity(profileCity: PublicCityInfo | null): Promise<void> {
        return store.track('profileCity', () =>
          updateProfile({ profileCity: profileCity ?? undefined }),
        );
      },

      // Queued with the other writes even though it goes through the
      // callable, not updateProfile(): a display-name save that started
      // first would otherwise finish by setting profile() back to its
      // snapshot — with the old handle in it.
      saveUsername(username: string): Promise<void> {
        return store.track('username', () =>
          enqueue(async () => {
            await store._userService.changeUsername(username);
            patchState(store, { usernameAvailability: 'idle' });
          }),
        );
      },

      /**
       * Expects a normalized handle (see normalizeUsername()). switchMap
       * drops the answer for a value the user has already typed past. A
       * failed lookup reads as `idle` (no hint) rather than `taken` — the
       * callable re-checks on save regardless.
       */
      checkUsernameAvailability: rxMethod<string>(
        pipe(
          tap((username) => {
            const unchanged = username === store._userService.profile()?.username;
            const checkable = !unchanged && !getUsernameFormatError(username);
            patchState(store, { usernameAvailability: checkable ? 'checking' : 'idle' });
          }),
          debounceTime(USERNAME_AVAILABILITY_DEBOUNCE_MS),
          switchMap((username) => {
            if (store.usernameAvailability() !== 'checking') return of(null);
            return from(store._userService.isUsernameAvailable(username)).pipe(
              map((available): UsernameAvailability => (available ? 'available' : 'taken')),
              catchError(() => of<UsernameAvailability>('idle')),
              tap((usernameAvailability) => patchState(store, { usernameAvailability })),
            );
          }),
        ),
      ),
    };
  }),
);

export type SettingsProfileStore = InstanceType<typeof SettingsProfileStore>;
