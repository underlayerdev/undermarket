import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, InputComponent, ToastService } from '@underlayerdev/ui';
import { ErrorService } from '../../../../application/services/error.service';
import { normalizeUsername } from '../../../../domain/user/username';
import { validateUsername } from '../../../../domain/user/username.validator';
import {
  USERNAME_CHANGE_COOLDOWN_DAYS,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '../../../../domain/user/user-constraints';
import { LocaleDatePipe } from '../../../../shared/pipes';
import { SettingsProfileStore } from '../settings-profile.store';

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'um-settings-profile-username',
  templateUrl: './settings-profile-username.html',
  imports: [TranslocoDirective, InputComponent, ButtonComponent, LocaleDatePipe],
})
export class SettingsProfileUsernameComponent {
  protected readonly store = inject(SettingsProfileStore);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);

  protected readonly maxLength = USERNAME_MAX_LENGTH;

  // Local draft, re-seeded whenever the saved profile changes. Always kept
  // normalized (lowercase, no leading @) so what's shown is what's stored.
  readonly usernameValue = linkedSignal(() => this.store.profile()?.username ?? '');
  readonly usernameTouched = signal(false);

  readonly isUnchanged = computed(() => this.usernameValue() === this.store.profile()?.username);

  /** Set while the 30-day cooldown since the last self-chosen handle is still running. */
  readonly nextChangeAt = computed(() => {
    const changedAt = this.store.profile()?.usernameChangedAt;
    if (!changedAt) return null;
    const next = new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * DAY_MS);
    return next > new Date() ? next : null;
  });

  readonly usernameError = computed(() => {
    this.transloco.activeLang();
    if (this.store.usernameAvailability() === 'taken') {
      return this.transloco.translate('errors.usernameTaken');
    }
    if (!this.usernameTouched()) return null;
    return validateUsername(this.usernameValue(), this.transloco);
  });

  readonly usernameHelperText = computed(() => {
    this.transloco.activeLang();
    switch (this.store.usernameAvailability()) {
      case 'checking':
        return this.transloco.translate('settings.usernameChecking');
      case 'available':
        return this.transloco.translate('settings.usernameAvailable', {
          username: this.usernameValue(),
        });
      default:
        return this.transloco.translate('settings.usernameHelper', {
          minLength: USERNAME_MIN_LENGTH,
          maxLength: USERNAME_MAX_LENGTH,
        });
    }
  });

  readonly canSave = computed(
    () =>
      !this.isUnchanged() &&
      !this.nextChangeAt() &&
      !this.store.isSavingUsername() &&
      this.store.usernameAvailability() !== 'checking' &&
      this.store.usernameAvailability() !== 'taken',
  );

  readonly saveUsernameButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.store.isSavingUsername()
      ? this.transloco.translate('settings.saving')
      : this.transloco.translate('settings.saveButton');
  });

  onUsernameInput(value: string): void {
    const username = normalizeUsername(value);
    this.usernameValue.set(username);
    this.store.checkUsernameAvailability(username);
  }

  async onSaveUsername(): Promise<void> {
    this.usernameTouched.set(true);
    if (this.usernameError() || !this.canSave()) return;

    try {
      await this.store.saveUsername(this.usernameValue());
      this.usernameTouched.set(false);
      this.toastService.success(this.transloco.translate('settings.usernameUpdated'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    }
  }
}
