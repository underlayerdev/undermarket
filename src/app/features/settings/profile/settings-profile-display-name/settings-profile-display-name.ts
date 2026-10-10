import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonComponent, InputComponent, ToastService } from '@underlayerdev/ui';
import { normalizeDisplayName } from '../../../../domain/user/display-name';
import { validateDisplayName } from '../../../../domain/user/user-display.validator';
import { ErrorService } from '../../../../application/services/error.service';
import { SettingsProfileStore } from '../settings-profile.store';

@Component({
  selector: 'um-settings-profile-display-name',
  templateUrl: './settings-profile-display-name.html',
  imports: [TranslocoDirective, InputComponent, ButtonComponent],
})
export class SettingsProfileDisplayNameComponent {
  protected readonly store = inject(SettingsProfileStore);
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

  // Compared normalized, so extra spaces around the saved name don't count as
  // an edit.
  readonly isUnchanged = computed(
    () => normalizeDisplayName(this.displayNameValue()) === this.store.profile()?.displayName,
  );

  readonly canSave = computed(() => !this.isUnchanged() && !this.store.isSavingDisplayName());

  readonly saveDisplayNameButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.store.isSavingDisplayName()
      ? this.transloco.translate('settings.saving')
      : this.transloco.translate('settings.saveButton');
  });

  async onSaveDisplayName(): Promise<void> {
    this.displayNameTouched.set(true);
    if (this.displayNameError() || !this.canSave() || !this.store.profile()) return;

    const displayName = normalizeDisplayName(this.displayNameValue());
    try {
      await this.store.saveDisplayName(displayName);
      this.displayNameValue.set(displayName);
      this.displayNameTouched.set(false);
      this.toastService.success(this.transloco.translate('settings.displayNameUpdated'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    }
  }
}
