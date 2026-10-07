import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, InputComponent, ToastService } from '@underlayerdev/ui';
import { validateDisplayName } from '../../../../domain/user/user-display.validator';
import { ErrorService } from '../../../../application/services/error.service';
import { SettingsAccountStore } from '../settings-account.store';

@Component({
  selector: 'um-settings-account-display-name',
  templateUrl: './settings-account-display-name.html',
  imports: [TranslocoDirective, InputComponent, ButtonComponent],
})
export class SettingsAccountDisplayNameComponent {
  protected readonly store = inject(SettingsAccountStore);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);

  // Local draft, re-seeded whenever the saved profile changes — it waits for
  // an explicit Save rather than persisting per keystroke.
  readonly displayNameValue = linkedSignal(() => this.store.profile()?.displayName ?? '');
  readonly displayNameTouched = signal(false);

  readonly displayNameError = computed(() => {
    if (!this.displayNameTouched()) return null;
    return validateDisplayName(this.displayNameValue(), this.transloco);
  });

  readonly saveDisplayNameButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.store.isSavingDisplayName()
      ? this.transloco.translate('settings.saving')
      : this.transloco.translate('settings.saveButton');
  });

  async onSaveDisplayName(): Promise<void> {
    this.displayNameTouched.set(true);
    if (this.displayNameError() || !this.store.profile()) return;

    const trimmed = this.displayNameValue().trim();
    try {
      await this.store.saveDisplayName(trimmed);
      this.displayNameValue.set(trimmed);
      this.displayNameTouched.set(false);
      this.toastService.success(this.transloco.translate('settings.displayNameUpdated'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    }
  }
}
