import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import type { PublicCityInfo, User } from '../../../domain/user/user.model';
import { withPendingOperations } from '../../../shared/state/with-pending-operations';

type SettingsAccountOperation = 'displayName' | 'profileCity';

/**
 * Profile-doc writes for the Account tab, provided on
 * `SettingsAccountComponent` so every panel under it shares one instance.
 *
 * Every write goes through one queue and starts from the *latest* profile,
 * not the snapshot the caller saw. Without it, saving the display name and
 * the city back-to-back would spread the same stale profile twice and the
 * slower write would silently discard the other field.
 *
 * Commands throw on failure; the calling component decides how to show it.
 */
export const SettingsAccountStore = signalStore(
  withProps(() => ({
    _userService: inject(UserService),
    _authService: inject(AuthService),
  })),
  withPendingOperations<SettingsAccountOperation>(),
  withComputed((store) => ({
    profile: computed(() => store._userService.profile()),
    isSavingDisplayName: computed(() => store.isPending('displayName')),
    isSavingProfileCity: computed(() => store.isPending('profileCity')),
  })),
  withMethods((store) => {
    // Swallowed here (not on the Promise handed back to the caller) so one
    // rejected save doesn't jam the queue for the next one.
    let writeQueue: Promise<unknown> = Promise.resolve();

    function updateProfile(patch: Partial<User>): Promise<void> {
      const result = writeQueue.then(async () => {
        const profile = store._userService.profile();
        if (!profile) return;
        await store._userService.updateProfile({ ...profile, ...patch });
      });
      writeQueue = result.catch(() => undefined);
      return result;
    }

    return {
      saveDisplayName(displayName: string): Promise<void> {
        return store.track('displayName', async () => {
          await updateProfile({ displayName });
          // Firestore is what the rest of the app reads; Auth is updated too
          // so authService.currentUser() (navbar, dock) isn't stale until reload.
          await store._authService.updateDisplayName(displayName);
        });
      },

      saveProfileCity(profileCity: PublicCityInfo | null): Promise<void> {
        return store.track('profileCity', () =>
          updateProfile({ profileCity: profileCity ?? undefined }),
        );
      },
    };
  }),
);

export type SettingsAccountStore = InstanceType<typeof SettingsAccountStore>;
