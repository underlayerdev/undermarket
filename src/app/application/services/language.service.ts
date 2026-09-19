import { effect, inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  isAvailableLanguage,
  readCachedLanguage,
  resolveBrowserLanguage,
  writeCachedLanguage,
} from '../../core/i18n/languages';
import { AuthService } from './auth.service';
import { UserService } from './user.service';

/**
 * Owns the app's active language.
 *
 * The user's preference lives on their Firestore profile, but that is only
 * readable once auth has restored a session. So startup applies the best
 * offline guess immediately (last applied language, else the browser's), then
 * upgrades to the stored preference when the profile arrives — avoiding a
 * flash of the wrong language on every reload.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  /** The id whose preference is already applied, so we don't re-sync on every profile write. */
  private syncedUserId: string | null = null;

  /** The in-flight profile sync, so a write can wait for the doc to exist first. */
  private syncInFlight: Promise<void> | null = null;

  constructor() {
    this.transloco.setActiveLang(readCachedLanguage() ?? resolveBrowserLanguage());

    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.syncedUserId = null;
        return;
      }
      if (user.id === this.syncedUserId) return;
      this.syncedUserId = user.id;
      this.syncInFlight = this.syncFromProfile(user.id);
    });
  }

  /**
   * Resolves once the profile sync triggered by the current session has
   * settled. Nothing in the UI needs to await this — it exists so callers and
   * tests can order work after the stored preference has been applied.
   */
  async whenSynced(): Promise<void> {
    await this.syncInFlight?.catch(() => undefined);
  }

  /** Applies a language and persists it to the signed-in user's profile. */
  async setLanguage(language: string): Promise<void> {
    if (!isAvailableLanguage(language)) return;

    this.apply(language);

    const user = this.authService.currentUser();
    if (!user) return;

    // Wait for any in-flight sync before writing. It may still be loading the
    // profile — updateSettings below patches profile() locally, and letting
    // that load resolve afterwards would overwrite the patch with the
    // pre-change value the user just moved away from.
    await this.syncInFlight?.catch(() => undefined);

    await this.userService.updateSettings(user.id, {
      ...(this.userService.profile()?.settings ?? { language }),
      language,
    });
  }

  private async syncFromProfile(userId: string): Promise<void> {
    const langAtStart = this.transloco.getActiveLang();

    // The doc is created by the onUserCreate Cloud Function now, not by
    // this service — just read whatever language it (or a later Settings
    // change) landed with. If the doc genuinely isn't there yet (the brief
    // window right after signup), profile() just stays null and this
    // quietly no-ops; the onboarding-required guard is what actually waits
    // for it.
    await this.userService.loadProfile(userId);
    const profile = this.userService.profile();

    // The fetch is slow enough that the user can change the language while it
    // is in flight (the settings page is reachable before the profile lands).
    // Their explicit choice wins over the value we started reading.
    if (this.transloco.getActiveLang() !== langAtStart) return;
    if (this.syncedUserId !== userId) return;

    if (profile && isAvailableLanguage(profile.settings.language)) {
      this.apply(profile.settings.language);
    }
  }

  private apply(language: string): void {
    if (this.transloco.getActiveLang() !== language) {
      this.transloco.setActiveLang(language);
    }
    writeCachedLanguage(language);
  }
}
