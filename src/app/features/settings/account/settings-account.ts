import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { UserService } from '../../../application/services/user.service';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { validateConfirmPassword, validatePassword } from '../../../shared/utils/auth-validation';
import { LocaleDatePipe } from '../../../shared/pipes';
import { ButtonComponent, InputComponent, ModalComponent, ToastService } from '@underlayerdev/ui';
import { SettingsLayoutComponent } from '../shared/settings-layout/settings-layout';
import { SettingsAccountProfileComponent } from './settings-account-profile/settings-account-profile';
import { SettingsAccountStore } from './settings-account.store';
import { SettingsAccountDisplayNameComponent } from './settings-account-display-name/settings-account-display-name';
import { SettingsAccountUsernameComponent } from './settings-account-username/settings-account-username';

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
    SettingsAccountDisplayNameComponent,
    SettingsAccountUsernameComponent,
  ],
  // Shared by every Account panel below (display name, username, public profile).
  providers: [SettingsAccountStore],
  templateUrl: './settings-account.html',
  styleUrl: './settings-account.scss',
})
export class SettingsAccountComponent implements OnInit {
  protected readonly userService = inject(UserService);
  protected readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);
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

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      // The onboarding-required guard already guarantees a doc exists by
      // the time this page is reachable — this is just a normal read.
      void this.userService.loadProfile(user.id);
    }
  }

  async onChangePassword(): Promise<void> {
    this.passwordFormTouched.set(true);
    if (!this.isPasswordFormValid()) return;

    this.isChangingPassword.set(true);
    try {
      await this.authService.changePassword(this.newPasswordValue(), this.currentPasswordValue());
      this.toastService.success(this.transloco.translate('settings.passwordChanged'));
      this.currentPasswordValue.set('');
      this.newPasswordValue.set('');
      this.confirmNewPasswordValue.set('');
      this.passwordFormTouched.set(false);
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
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
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      this.isDeletingAccount.set(false);
    }
  }

  async onSignOut(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
