import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { UserService } from '../../../application/services/user.service';
import { getInitials } from '../../../domain/user/user-display';
import { AvatarUploadStore } from '../../../shared/avatar-upload/avatar-upload.store';
import { AvatarUploaderComponent } from '../../../shared/avatar-upload/avatar-uploader';
import { OnboardingService } from '../onboarding.service';

// Collects User.photoUrl. Optional: with nothing uploaded the step reports no
// changes, so continuing past it writes nothing at all. The picked photo lives
// in the AvatarUploadStore the shell provides, so it survives going back and
// forth between steps.
@Component({
  selector: 'um-onboarding-avatar',
  templateUrl: './onboarding-avatar.html',
  styleUrl: './onboarding-avatar.scss',
  imports: [AvatarUploaderComponent, TranslocoDirective],
})
export class OnboardingAvatarComponent {
  protected readonly userService = inject(UserService);
  private readonly avatarUpload = inject(AvatarUploadStore);

  // The name step persisted the display name before this step could be
  // reached, so the placeholder is read back from the profile.
  readonly initials = computed(() => getInitials(this.userService.profile()));

  constructor() {
    inject(OnboardingService).startStep({
      id: 'photo',
      // The upload itself already happened eagerly on crop (see
      // AvatarUploadStore) — all that's left for Continue is putting the
      // resulting URL on the profile.
      changes: () => {
        const photoUrl = this.avatarUpload.uploadedUrl();
        return photoUrl ? { photoUrl } : {};
      },
    });
  }
}
