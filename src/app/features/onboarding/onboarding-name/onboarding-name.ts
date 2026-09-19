import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { InputComponent } from '@underlayerdev/ui';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { OnboardingProgressService } from '../shared/onboarding-progress/onboarding-progress.service';
import { OnboardingStepComponent } from '../shared/onboarding-step/onboarding-step';
import { OnboardingNameService } from './onboarding-name.service';
import { onboardingPhotoPath } from '../onboarding.routes';

@Component({
  selector: 'um-onboarding-name',
  templateUrl: './onboarding-name.html',
  styleUrl: './onboarding-name.scss',
  imports: [InputComponent, OnboardingStepComponent, TranslocoDirective],
})
export class OnboardingNameComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly errorService = inject(ErrorService);
  readonly onboardingNameService = inject(OnboardingNameService);

  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  constructor() {
    inject(OnboardingProgressService).currentStep.set(1);
  }

  // Saves eagerly on continue, rather than accumulating this along with the
  // photo/location steps for one write at the end — the `onboarded` flag
  // itself is never set here (or anywhere client-side): a Firestore trigger
  // (functions/src/users/on-update.ts) flips it server-side once it sees a
  // not-yet-onboarded profile pick up a valid displayName, which this write
  // is what actually produces.
  async continue(): Promise<void> {
    this.onboardingNameService.markTouched();
    if (!this.onboardingNameService.canContinue()) return;

    const profile = this.userService.profile();
    if (!profile) return;

    const displayName = this.onboardingNameService.displayNameValue().trim();
    this.isSaving.set(true);
    this.saveError.set(null);
    try {
      await this.userService.updateProfile({ ...profile, displayName });
      await this.authService.updateDisplayName(displayName);
      void this.router.navigateByUrl(onboardingPhotoPath);
    } catch (err) {
      this.saveError.set(this.errorService.toUserMessage(err));
    } finally {
      this.isSaving.set(false);
    }
  }
}
