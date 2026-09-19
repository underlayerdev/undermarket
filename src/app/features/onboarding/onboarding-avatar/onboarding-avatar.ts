import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, ImageCropperComponent } from '@underlayerdev/ui';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { OnboardingNameService } from '../onboarding-name/onboarding-name.service';
import { onboardingLocationPath, onboardingNamePath } from '../onboarding.routes';
import { OnboardingProgressService } from '../shared/onboarding-progress/onboarding-progress.service';
import { OnboardingStepComponent } from '../shared/onboarding-step/onboarding-step';
import { OnboardingAvatarService } from './onboarding-avatar.service';

@Component({
  selector: 'um-onboarding-avatar',
  templateUrl: './onboarding-avatar.html',
  styleUrl: './onboarding-avatar.scss',
  imports: [
    AvatarComponent,
    ButtonComponent,
    ImageCropperComponent,
    OnboardingStepComponent,
    TranslocoDirective,
  ],
})
export class OnboardingAvatarComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly errorService = inject(ErrorService);
  private readonly onboardingNameService = inject(OnboardingNameService);
  readonly onboardingAvatarService = inject(OnboardingAvatarService);

  readonly isSaving = signal(false);
  readonly saveError = signal<string | null>(null);

  // Depends on the name entered in the previous step, which this step
  // doesn't own — read straight from the shared service instead of a
  // parent-passed input (there's no parent template composing these
  // anymore, each step is its own route).
  readonly initials = computed(
    () => this.onboardingNameService.displayNameValue().trim().charAt(0).toUpperCase() || undefined,
  );

  constructor() {
    inject(OnboardingProgressService).currentStep.set(2);
  }

  onFileSelected(event: Event): void {
    this.onboardingAvatarService.onFileSelected(event);
  }

  onCropped(file: File): void {
    this.onboardingAvatarService.onCropped(file);
  }

  onCropCancelled(): void {
    this.onboardingAvatarService.onCropCancelled();
  }

  retryUpload(): void {
    this.onboardingAvatarService.retryUpload();
  }

  back(): void {
    void this.router.navigateByUrl(onboardingNamePath);
  }

  // The upload itself already happened eagerly on crop (see
  // OnboardingAvatarService) — this is what actually saves the resulting
  // URL onto the profile/Auth, the same eager-per-step write as the name
  // step. Photo is optional, so a step with nothing uploaded just navigates.
  async continue(): Promise<void> {
    const avatarUploadedUrl = this.onboardingAvatarService.avatarUploadedUrl();
    if (!avatarUploadedUrl) {
      void this.router.navigateByUrl(onboardingLocationPath);
      return;
    }

    const profile = this.userService.profile();
    if (!profile) return;

    this.isSaving.set(true);
    this.saveError.set(null);
    try {
      await this.userService.updateProfile({ ...profile, photoUrl: avatarUploadedUrl });
      await this.authService.updatePhotoUrl(avatarUploadedUrl);
      void this.router.navigateByUrl(onboardingLocationPath);
    } catch (err) {
      this.saveError.set(this.errorService.toUserMessage(err));
    } finally {
      this.isSaving.set(false);
    }
  }
}
