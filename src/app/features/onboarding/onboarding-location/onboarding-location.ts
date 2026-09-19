import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonComponent } from '@underlayerdev/ui';
import { LocationPickerComponent } from '../../../shared/location';
import { LocationSuggestion } from '../../../domain/location/location.model';
import { onboardingDonePath, onboardingPhotoPath } from '../onboarding.routes';
import { OnboardingProgressService } from '../shared/onboarding-progress/onboarding-progress.service';
import { OnboardingStepComponent } from '../shared/onboarding-step/onboarding-step';
import { OnboardingLocationService } from './onboarding-location.service';

@Component({
  selector: 'um-onboarding-location',
  templateUrl: './onboarding-location.html',
  styleUrl: './onboarding-location.scss',
  imports: [ButtonComponent, LocationPickerComponent, OnboardingStepComponent, TranslocoDirective],
})
export class OnboardingLocationComponent {
  private readonly router = inject(Router);
  readonly onboardingLocationService = inject(OnboardingLocationService);

  readonly isNavigating = signal(false);

  constructor() {
    inject(OnboardingProgressService).currentStep.set(3);
  }

  async onLocationQueryChanged(query: string): Promise<void> {
    await this.onboardingLocationService.onLocationQueryChanged(query);
  }

  async onUseCurrentLocation() {
    await this.onboardingLocationService.onUseCurrentLocation();
  }

  async onLocationPicked(suggestion: LocationSuggestion) {
    await this.onboardingLocationService.onLocationPicked(suggestion);
  }

  back(): void {
    void this.router.navigateByUrl(onboardingPhotoPath);
  }

  // Nothing left to save here — displayName and photoUrl are already
  // persisted by the name/photo steps as the user continues through them,
  // and the picked location is saved to userSearchLocations as it's picked
  // (see OnboardingLocationService), not onto the user profile. `onboarded`
  // is never set client-side at all; see on-update.ts. The done route's
  // guard polls until the server-side flip lands before letting this
  // through, which can take a beat — isNavigating keeps the button showing
  // a loading state for that gap instead of the click looking like a no-op.
  async finish(): Promise<void> {
    this.isNavigating.set(true);
    await this.router.navigateByUrl(onboardingDonePath);
    this.isNavigating.set(false);
  }
}
