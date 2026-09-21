import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent } from '@underlayerdev/ui';
import { LocationSuggestion } from '../../../domain/location/location.model';
import { LocationPickerComponent } from '../../../shared/location';
import { OnboardingService } from '../onboarding.service';
import { OnboardingLocationService } from './onboarding-location.service';

// Registers no `changes`: the picked location is saved to userSearchLocations
// as it's picked (see OnboardingLocationService), not onto the user profile, so
// there is nothing for Continue to persist here.
@Component({
  selector: 'um-onboarding-location',
  templateUrl: './onboarding-location.html',
  styleUrl: './onboarding-location.scss',
  imports: [ButtonComponent, LocationPickerComponent, TranslocoDirective],
})
export class OnboardingLocationComponent {
  readonly onboardingLocationService = inject(OnboardingLocationService);

  constructor() {
    inject(OnboardingService).startStep({ id: 'location' });
  }

  async onLocationQueryChanged(query: string): Promise<void> {
    await this.onboardingLocationService.onLocationQueryChanged(query);
  }

  async onUseCurrentLocation(): Promise<void> {
    await this.onboardingLocationService.onUseCurrentLocation();
  }

  async onLocationPicked(suggestion: LocationSuggestion): Promise<void> {
    await this.onboardingLocationService.onLocationPicked(suggestion);
  }
}
