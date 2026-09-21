import { Component, computed, effect, inject, signal } from '@angular/core';
import { ButtonComponent, ToastService, ToggleComponent } from '@underlayerdev/ui';
import { LocationPickerComponent } from '../../../../shared/location';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LocationSuggestion } from '../../../../domain/location/location.model';
import { toLocationErrorMessage } from '../../../../application/services/location-error.util';
import { LocationService } from '../../../../application/services/location.service';
import { SearchLocationService } from '../../../../application/services/search-location.service';
import { PublicCityInfo } from '../../../../domain/user/user.model';
import { UserService } from '../../../../application/services/user.service';
import { ErrorService } from '../../../../application/services/error.service';

/**
 * Narrows anything city-shaped down to exactly the four fields that go on the
 * publicly readable users/{userId} doc. Destructuring rather than spreading is
 * the point: a SearchLocation's latitude/longitude/geohash/neighborhood can't
 * ride along by accident.
 */
function toPublicCityInfo({
  displayName,
  city,
  region,
  countryCode,
}: PublicCityInfo): PublicCityInfo {
  return { displayName, city, region, countryCode };
}

@Component({
  selector: 'um-settings-account-profile',
  templateUrl: './settings-account-profile.html',
  imports: [TranslocoDirective, ToggleComponent, ButtonComponent, LocationPickerComponent],
})
export class SettingsAccountProfileComponent {
  protected readonly userService = inject(UserService);
  private readonly errorService = inject(ErrorService);
  private readonly locationService = inject(LocationService);
  private readonly searchLocationService = inject(SearchLocationService);
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

  /**
   * The search area the user already chose (during onboarding, or from the
   * search bar), offered as a one-tap value for the public field so they don't
   * have to look the same place up twice.
   *
   * Deliberately only a suggestion, never an automatic write:
   * userSearchLocations/{userId} is owner-only and was given for setting a
   * search radius, while profileCity lands on a world-readable doc — so
   * publishing it stays an explicit act, and the button shows the exact name
   * first. It also keeps the two free to diverge: browsing Córdoba while your
   * profile says Buenos Aires is a legitimate state, which an automatic copy
   * would quietly overwrite on every search-area change.
   */
  readonly suggestedCity = computed<PublicCityInfo | null>(() => {
    if (this.selectedCity()) return null;
    const searchLocation = this.searchLocationService.searchLocation();
    return searchLocation ? toPublicCityInfo(searchLocation) : null;
  });

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
    await this.setProfileCity(toPublicCityInfo(suggestion));
  }

  async onUseSuggestedCity(city: PublicCityInfo): Promise<void> {
    await this.setProfileCity(city);
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

  private async setProfileCity(city: PublicCityInfo): Promise<void> {
    this.selectedCity.set(city);
    await this.saveProfileCity(city);
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
