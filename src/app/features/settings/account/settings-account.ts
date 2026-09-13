import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { UserService } from '../../../application/services/user.service';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { LocationService } from '../../../application/services/location.service';
import { toLocationErrorMessage } from '../../../application/services/location-error.util';
import { validateConfirmPassword, validatePassword } from '../../../shared/utils/auth-validation';
import { LocaleDatePipe } from '../../../shared/pipes';
import { LocationPickerComponent } from '../../../shared/location/location-picker/location-picker';
import type { LocationSuggestion } from '../../../domain/location/location.model';
import type { PublicCityInfo } from '../../../domain/user/user.model';
import {
  ButtonComponent,
  CheckboxComponent,
  InputComponent,
  ModalComponent,
  ToastService,
} from '@underlayerdev/ui';
import { SettingsLayoutComponent } from '../shared/settings-layout/settings-layout';

@Component({
  selector: 'um-settings-account',
  imports: [
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    LocaleDatePipe,
    LocationPickerComponent,
    ModalComponent,
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
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);

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

  // Seeded once from the loaded profile (below), then a purely local UI
  // toggle from that point on — checking/unchecking updates the persisted
  // profile immediately, it doesn't wait for a separate save action.
  readonly showCity = signal(false);
  readonly selectedCity = signal<PublicCityInfo | null>(null);
  readonly citySuggestions = signal<LocationSuggestion[]>([]);
  readonly isResolvingCurrentCity = signal(false);
  private cityInitialized = false;

  constructor() {
    effect(() => {
      const profile = this.userService.profile();
      if (!profile || this.cityInitialized) return;
      this.cityInitialized = true;
      this.selectedCity.set(profile.profileCity ?? null);
      this.showCity.set(!!profile.profileCity);
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      // ensureProfile, not loadProfile: an account with no Firestore doc yet
      // would otherwise leave the panel with nothing to show.
      void this.userService.ensureProfile(user);
    }
  }

  onToggleShowCity(checked: boolean): void {
    this.showCity.set(checked);
    // Only clearing is immediate — turning it on waits for an actual city to
    // be picked, so there's nothing to save (and nothing to show) yet.
    if (!checked) {
      this.selectedCity.set(null);
      void this.saveProfileCity(null);
    }
  }

  async onCityQueryChanged(query: string): Promise<void> {
    if (!query.trim()) {
      this.citySuggestions.set([]);
      return;
    }
    try {
      this.citySuggestions.set(await this.locationService.searchAreas(query));
    } catch {
      this.citySuggestions.set([]);
    }
  }

  async onCityPicked(suggestion: LocationSuggestion): Promise<void> {
    const city: PublicCityInfo = {
      displayName: suggestion.displayName,
      city: suggestion.city,
      region: suggestion.region,
      countryCode: suggestion.countryCode,
    };
    this.selectedCity.set(city);
    await this.saveProfileCity(city);
  }

  async onUseCurrentCity(): Promise<void> {
    this.isResolvingCurrentCity.set(true);
    try {
      const area = await this.locationService.resolveCurrentArea();
      await this.onCityPicked({ id: '', ...area });
    } catch (err) {
      this.toastService.error(toLocationErrorMessage(err, this.transloco));
    } finally {
      this.isResolvingCurrentCity.set(false);
    }
  }

  private async saveProfileCity(profileCity: PublicCityInfo | null): Promise<void> {
    const profile = this.userService.profile();
    if (!profile) return;

    try {
      await this.userService.updateProfile({ ...profile, profileCity: profileCity ?? undefined });
      this.toastService.success(this.transloco.translate('settings.profileCityUpdated'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
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
