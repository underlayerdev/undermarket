import { inject, Service, signal } from '@angular/core';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import type { PublicCityInfo, User } from '../../../domain/user/user.model';

/**
 * Coordinates writes to the user profile doc for the Account tab. Not
 * app-wide: meant to be `provided` on `SettingsAccountComponent`, so its
 * child `SettingsAccountProfileComponent` resolves the same instance
 * (standard Angular DI, same as `ListingDetailStore` being shared between
 * `ListingDetailComponent` and its two `ListingDetailActionsComponent`
 * instances) instead of each independently injecting `UserService`.
 *
 * That independent-injection pattern is what this store actually fixes, not
 * just tidies: `UserService.updateProfile()` does `await repo.update(user);
 * profile.set(user)` — if `SettingsAccountComponent` saves a display name
 * and `SettingsAccountProfileComponent` saves a profile city before the
 * first write's round-trip resolves, both read `userService.profile()` at
 * call time and spread it, so whichever `updateProfile` resolves last wins
 * and silently discards the other field's change. `enqueueProfileUpdate`
 * below serializes every write through this store so each one always starts
 * from the result of the previous one, not a stale snapshot.
 *
 * Deliberately excluded, and why:
 * - Toast/error presentation — both methods below just throw on failure
 *   (matching `ListingDetailStore.publish()`/`.delete()`'s own convention);
 *   the calling component still does its own `try { await store.saveX(...);
 *   toast.success(...) } catch (err) { toast.error(...) }`. This store has
 *   no opinion on *how* a failure is shown.
 * - The "seed a local signal from `userService.profile()` once" effect in
 *   both components — `displayNameValue`/`selectedCity` are different
 *   shapes of component-local UI state (a text input's value, a modal's
 *   picked city), not a shared resource with a consistency problem, so
 *   centralizing it here would just add surface area for no bug-fixing
 *   benefit.
 * - Password change / sign out / delete account — stay in
 *   `SettingsAccountComponent` calling `AuthService` directly; no shared
 *   state, no duplication, nothing to fix.
 *
 * `autoProvided: false` keeps this out of DI until `SettingsAccountComponent`
 * lists it in its own `providers` array (same reasoning as `ListingDetailStore`).
 */
@Service({ autoProvided: false })
export class SettingsProfileStore {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  private readonly _isSavingDisplayName = signal(false);
  private readonly _isSavingProfileCity = signal(false);
  readonly isSavingDisplayName = this._isSavingDisplayName.asReadonly();
  readonly isSavingProfileCity = this._isSavingProfileCity.asReadonly();

  // Chains every profile write onto whatever's already in flight. Swallowed
  // here (not on the Promise returned to the caller below) so one rejected
  // save doesn't jam the queue for the next one.
  private writeQueue: Promise<unknown> = Promise.resolve();

  async saveDisplayName(displayName: string): Promise<void> {
    this._isSavingDisplayName.set(true);
    try {
      await this.enqueueProfileUpdate((profile) => ({ ...profile, displayName }));
      // Firestore is the source of truth read everywhere else in the app
      // (profile pages, seller info on listings); Auth is updated too so
      // authService.currentUser() — read directly on this page and in the
      // navbar/dock — doesn't show a stale name until the next full reload.
      await this.authService.updateDisplayName(displayName);
    } finally {
      this._isSavingDisplayName.set(false);
    }
  }

  async saveProfileCity(profileCity: PublicCityInfo | null): Promise<void> {
    this._isSavingProfileCity.set(true);
    try {
      await this.enqueueProfileUpdate((profile) => ({
        ...profile,
        profileCity: profileCity ?? undefined,
      }));
    } finally {
      this._isSavingProfileCity.set(false);
    }
  }

  private enqueueProfileUpdate(mutate: (profile: User) => User): Promise<void> {
    const result = this.writeQueue.then(async () => {
      const profile = this.userService.profile();
      if (!profile) return;
      await this.userService.updateProfile(mutate(profile));
    });
    this.writeQueue = result.catch(() => undefined);
    return result;
  }
}
