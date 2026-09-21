import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, ImageCropperComponent } from '@underlayerdev/ui';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { OnboardingService } from '../onboarding.service';
import { OnboardingAvatarService } from './onboarding-avatar.service';

// Collects User.photoUrl. Optional: with nothing uploaded the step reports no
// changes, so continuing past it writes nothing at all.
@Component({
  selector: 'um-onboarding-avatar',
  templateUrl: './onboarding-avatar.html',
  styleUrl: './onboarding-avatar.scss',
  imports: [AvatarComponent, ButtonComponent, ImageCropperComponent, TranslocoDirective],
})
export class OnboardingAvatarComponent {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  readonly onboardingAvatarService = inject(OnboardingAvatarService);

  // Placeholder for an avatar with no image yet. The name step persisted the
  // display name before this step could be reached, so it's read back from the
  // profile rather than held in a service spanning both steps.
  readonly initials = computed(() => {
    const displayName =
      this.userService.profile()?.displayName ?? this.authService.currentUser()?.displayName ?? '';
    return displayName.trim().charAt(0).toUpperCase() || undefined;
  });

  constructor() {
    inject(OnboardingService).startStep({
      id: 'photo',
      // The upload itself already happened eagerly on crop (see
      // OnboardingAvatarService) — all that's left for Continue is putting the
      // resulting URL on the profile.
      changes: () => {
        const photoUrl = this.onboardingAvatarService.avatarUploadedUrl();
        return photoUrl ? { photoUrl } : {};
      },
    });
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
}
