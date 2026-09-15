import { Component, effect, inject, signal } from '@angular/core';
import { ToastService, ToggleComponent } from '@underlayerdev/ui';
import { LocationPickerComponent } from '../../../../shared/location';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LocationSuggestion } from '../../../../domain/location/location.model';
import { toLocationErrorMessage } from '../../../../application/services/location-error.util';
import { LocationService } from '../../../../application/services/location.service';
import { PublicCityInfo } from '../../../../domain/user/user.model';
import { UserService } from '../../../../application/services/user.service';
import { ErrorService } from '../../../../application/services/error.service';

@Component({
  selector: 'um-settings-account-profile',
  templateUrl: './settings-account-profile.html',
  imports: [TranslocoDirective, ToggleComponent, LocationPickerComponent],
})
export class SettingsAccountProfileComponent {
  protected readonly userService = inject(UserService);
  private readonly errorService = inject(ErrorService);
  private readonly locationService = inject(LocationService);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  // Seeded once from the loaded profile, then a purely local UI toggle from
  // that point on — checking/unchecking updates the persisted profile
  // immediately, it doesn't wait for a separate save action.
  readonly showCity = signal(false);
  readonly selectedCity = signal<PublicCityInfo | null>(null);
  readonly citySuggestions = signal<LocationSuggestion[]>([]);
  readonly isResolvingCurrentCity = signal(false);
  private cityFieldsInitialized = false;

  constructor() {
    effect(() => {
      const profile = this.userService.profile();
      if (!profile || this.cityFieldsInitialized) return;
      this.cityFieldsInitialized = true;
      this.selectedCity.set(profile.profileCity ?? null);
      this.showCity.set(!!profile.profileCity);
    });
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
}
