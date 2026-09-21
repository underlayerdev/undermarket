import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { UserService } from '../../../application/services/user.service';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { validateConfirmPassword, validatePassword } from '../../../shared/utils/auth-validation';
import { LocaleDatePipe } from '../../../shared/pipes';
import { ButtonComponent, InputComponent, ModalComponent } from '@underlayerdev/ui';
import { validateDisplayName } from '../../../domain/user/user-display.validator';
import { SettingsFeedbackService } from '../shared/settings-feedback/settings-feedback.service';
import { SettingsLayoutComponent } from '../shared/settings-layout/settings-layout';
import { SettingsAccountProfileComponent } from './settings-account-profile/settings-account-profile';

@Component({
  selector: 'um-settings-account',
  imports: [
    ButtonComponent,
    InputComponent,
    LocaleDatePipe,
    ModalComponent,
    SettingsAccountProfileComponent,
    SettingsLayoutComponent,
    TranslocoDirective,
  ],
  templateUrl: './settings-account.html',
  styleUrl: './settings-account.scss',
})
export class SettingsAccountComponent implements OnInit {
  protected readonly userService = inject(UserService);
  protected readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly feedbackService = inject(SettingsFeedbackService);
  private readonly router = inject(Router);

  readonly isEmailPasswordUser = computed(
    () => this.authService.currentUser()?.providerId === 'password',
  );

  readonly currentPasswordValue = signal('');
  readonly newPasswordValue = signal('');
  readonly confirmNewPasswordValue = signal('');
  readonly passwordFormTouched = signal(false);
  readonly isChangingPassword = signal(false);

  readonly currentPasswordError = computed(() => {
    if (!this.passwordFormTouched() || this.currentPasswordValue()) return null;
    return this.transloco.translate('settings.currentPasswordRequired');
  });

  readonly newPasswordError = computed(() => {
    this.transloco.activeLang();
    return this.passwordFormTouched()
      ? validatePassword(this.newPasswordValue(), this.transloco)
      : null;
  });

  readonly confirmNewPasswordError = computed(() => {
    this.transloco.activeLang();
    return this.passwordFormTouched()
      ? validateConfirmPassword(
          this.confirmNewPasswordValue(),
          this.newPasswordValue(),
          this.transloco,
        )
      : null;
  });

  readonly isPasswordFormValid = computed(
    () =>
      !this.currentPasswordError() && !this.newPasswordError() && !this.confirmNewPasswordError(),
  );

  readonly changePasswordButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.isChangingPassword()
      ? this.transloco.translate('settings.changingPassword')
      : this.transloco.translate('settings.changePasswordButton');
  });

  readonly showDeleteModal = signal(false);
  readonly deleteAccountPasswordValue = signal('');
  readonly isDeletingAccount = signal(false);

  // Seeded once from the loaded profile — waits for an explicit Save rather
  // than persisting per keystroke.
  readonly displayNameValue = signal('');
  readonly displayNameTouched = signal(false);
  readonly isSavingDisplayName = signal(false);
  private profileFieldsInitialized = false;

  readonly displayNameError = computed(() => {
    if (!this.displayNameTouched()) return null;
    return validateDisplayName(this.displayNameValue(), this.transloco);
  });

  readonly saveDisplayNameButtonLabel = computed(() => {
    this.transloco.activeLang();
    return this.isSavingDisplayName()
      ? this.transloco.translate('settings.saving')
      : this.transloco.translate('settings.saveButton');
  });

  constructor() {
    effect(() => {
      const profile = this.userService.profile();
      if (!profile || this.profileFieldsInitialized) return;
      this.profileFieldsInitialized = true;
      this.displayNameValue.set(profile.displayName);
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      // The onboarding-required guard already guarantees a doc exists by
      // the time this page is reachable — this is just a normal read.
      void this.userService.loadProfile(user.id);
    }
  }

  async onSaveDisplayName(): Promise<void> {
    this.displayNameTouched.set(true);
    if (this.displayNameError()) return;

    const profile = this.userService.profile();
    if (!profile) return;

    const trimmed = this.displayNameValue().trim();
    this.isSavingDisplayName.set(true);
    try {
      // Firestore is the source of truth read everywhere else in the app
      // (profile pages, seller info on listings); Auth is updated too so
      // authService.currentUser() — read directly on this page and in the
      // navbar/dock — doesn't show a stale name until the next full reload.
      await this.userService.updateProfile({ ...profile, displayName: trimmed });
      await this.authService.updateDisplayName(trimmed);
      this.displayNameValue.set(trimmed);
      this.displayNameTouched.set(false);
      this.feedbackService.success(this.transloco.translate('settings.displayNameUpdated'));
    } catch (err) {
      this.feedbackService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isSavingDisplayName.set(false);
    }
  }

  async onChangePassword(): Promise<void> {
    this.passwordFormTouched.set(true);
    if (!this.isPasswordFormValid()) return;

    this.isChangingPassword.set(true);
    try {
      await this.authService.changePassword(this.newPasswordValue(), this.currentPasswordValue());
      this.feedbackService.success(this.transloco.translate('settings.passwordChanged'));
      this.currentPasswordValue.set('');
      this.newPasswordValue.set('');
      this.confirmNewPasswordValue.set('');
      this.passwordFormTouched.set(false);
    } catch (err) {
      this.feedbackService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  onDeleteAccountClick(): void {
    this.showDeleteModal.set(true);
  }

  cancelDeleteAccount(): void {
    this.showDeleteModal.set(false);
    this.deleteAccountPasswordValue.set('');
  }

  async confirmDeleteAccount(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    this.isDeletingAccount.set(true);
    try {
      await this.authService.deleteAccount(
        this.isEmailPasswordUser() ? this.deleteAccountPasswordValue() : undefined,
      );
      await this.userService.deleteAccount(user.id);
      this.showDeleteModal.set(false);
      await this.router.navigateByUrl('/login');
    } catch (err) {
      this.feedbackService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isDeletingAccount.set(false);
    }
  }

  async onSignOut(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
