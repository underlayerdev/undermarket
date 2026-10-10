import { Component, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from '@underlayerdev/ui';
import { ErrorService } from '../../../../application/services/error.service';
import { getInitials } from '../../../../domain/user/user-display';
import { AvatarUploadStore } from '../../../../shared/avatar-upload/avatar-upload.store';
import { AvatarUploaderComponent } from '../../../../shared/avatar-upload/avatar-uploader';
import { SettingsProfileStore } from '../settings-profile.store';

@Component({
  selector: 'um-settings-profile-avatar',
  templateUrl: './settings-profile-avatar.html',
  imports: [AvatarUploaderComponent],
  // Scoped to this panel: a photo picked here is gone once the panel is.
  providers: [AvatarUploadStore],
})
export class SettingsProfileAvatarComponent {
  protected readonly store = inject(SettingsProfileStore);
  private readonly avatarUpload = inject(AvatarUploadStore);
  private readonly toastService = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly errorService = inject(ErrorService);

  protected readonly initials = computed(() => getInitials(this.store.profile()));

  // Saved as soon as the upload finishes — cropping is the user's
  // confirmation, there's no separate Save button as for the text fields.
  async onUploaded(photoUrl: string): Promise<void> {
    try {
      await this.store.saveAvatar(photoUrl);
      this.toastService.success(this.transloco.translate('settings.avatarUpdated'));
    } catch (err) {
      this.toastService.error(this.errorService.toUserMessage(err));
    } finally {
      // Back to the saved photo: on success that's the new one, on failure
      // the old one, so the avatar never shows a picture that wasn't saved.
      this.avatarUpload.reset();
    }
  }
}
