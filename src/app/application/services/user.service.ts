import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { USER_REPOSITORY, USERNAME_PROVIDER } from '../../core/configuration/tokens';
import { AuthService } from './auth.service';
import type { User, UserId, UserSettings } from '../../domain/user/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userRepository = inject(USER_REPOSITORY);
  private readonly usernameProvider = inject(USERNAME_PROVIDER);
  private readonly authService = inject(AuthService);
  private readonly pendingLoads = new Map<UserId, Promise<void>>();

  /**
   * The signed-in user's Firestore profile — the one source of truth for
   * everything the UI shows about them (Firebase Auth only carries the
   * session, see AuthUser). Follows the session by itself: cleared the moment
   * the user signs out or a different one signs in, and loaded on sign-in
   * even when no navigation (and so no guard) happens.
   */
  readonly profile = signal<User | null>(null);

  /** True only while waitForProfile is actually polling — never on its cached fast path. */
  readonly isCheckingProfile = signal(false);

  constructor() {
    effect(() => {
      const id = this.authService.currentUser()?.id ?? null;
      untracked(() => {
        // Already holds this user (a guard got there first), or nobody to load.
        if (id === (this.profile()?.id ?? null)) return;
        // Cleared first so the previous user's name/avatar never shows
        // while the new profile is on its way.
        this.profile.set(null);
        if (id) void this.loadProfile(id).catch(() => undefined);
      });
    });
  }

  /**
   * Concurrent calls for the same id share one read — on sign-in the session
   * effect above, LanguageService and the guards all ask at about the same
   * time.
   */
  loadProfile(id: UserId): Promise<void> {
    const pending = this.pendingLoads.get(id);
    if (pending) return pending;

    const load = this.userRepository
      .getById(id)
      .then((user) => this.applyLoaded(id, user))
      .finally(() => this.pendingLoads.delete(id));
    this.pendingLoads.set(id, load);
    return load;
  }

  private applyLoaded(id: UserId, user: User | null): void {
    // Signed out, or a different user signed in, while this was in flight.
    if (this.authService.currentUser()?.id !== id) return;
    // A brand-new account's doc is created by a Cloud Function a moment
    // after sign-up, so an early read can come back empty — never let that
    // overwrite a profile waitForProfile() has found in the meantime.
    if (!user && this.profile()?.id === id) return;
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
   * Goes through the claimUsername callable rather than update() — the
   * handle is server-owned (see User.username). Throws the callable's error
   * as-is; ErrorService maps its code to a message.
   */
  async changeUsername(username: string): Promise<void> {
    const result = await this.usernameProvider.claim(username);
    const current = this.profile();
    if (current) {
      this.profile.set({ ...current, ...result });
    }
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const current = this.profile();
    if (!current) return false;
    return this.userRepository.isUsernameAvailable(username, current.id);
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
