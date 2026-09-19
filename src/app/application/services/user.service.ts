import { inject, Injectable, signal } from '@angular/core';
import { USER_REPOSITORY } from '../../core/configuration/tokens';
import type { User, UserId, UserSettings } from '../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userRepository = inject(USER_REPOSITORY);

  readonly profile = signal<User | null>(null);

  /** True only while waitForProfile is actually polling — never on its cached fast path. */
  readonly isCheckingProfile = signal(false);

  async loadProfile(id: UserId): Promise<void> {
    const user = await this.userRepository.getById(id);
    this.profile.set(user);
  }

  /**
   * Polls for the profile doc, since it's created by the onUserCreate Cloud
   * Function shortly after signup rather than synchronously by the client —
   * there's a brief (typically sub-second) window right after a brand-new
   * signup where it doesn't exist yet. Guards are the only real callers of
   * this; everything else can just read profile() once it's populated.
   *
   * Returns the cached profile() immediately if it's already loaded for
   * this id AND already onboarded — onboardingRequiredGuard and
   * onboardingGuard both call this back-to-back on the same redirect (one
   * to discover a redirect is needed, the other on the route it redirects
   * to), and re-polling from scratch the second time would double every
   * new signup's wait and request count for nothing. A cached *not yet*
   * onboarded profile is never trusted, though: `onboarded` flips
   * server-side, asynchronously, once the onboarding flow saves a valid
   * displayName (see functions/src/users/on-update.ts) — nothing here
   * listens for that, so the only way to see it is a fresh read.
   */
  async waitForProfile(id: UserId, attempts = 5, delayMs = 250): Promise<User | null> {
    const cached = this.profile();
    if (cached?.id === id && cached.onboarded) return cached;

    this.isCheckingProfile.set(true);
    try {
      for (let i = 0; i < attempts; i++) {
        const user = await this.userRepository.getById(id);
        if (user) {
          this.profile.set(user);
          return user;
        }
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
      this.profile.set(null);
      return null;
    } finally {
      this.isCheckingProfile.set(false);
    }
  }

  async updateProfile(user: User): Promise<void> {
    await this.userRepository.update(user);
    this.profile.set(user);
  }

  /**
   * Takes the id explicitly rather than reading it off `profile()` so a
   * preference can be saved before (or without) the profile being loaded.
   */
  async updateSettings(id: UserId, settings: UserSettings): Promise<void> {
    await this.userRepository.updateSettings(id, settings);
    const current = this.profile();
    if (current?.id === id) {
      this.profile.set({ ...current, settings });
    }
  }

  async deleteAccount(id: UserId): Promise<void> {
    await this.userRepository.delete(id);
    this.profile.set(null);
  }
}
