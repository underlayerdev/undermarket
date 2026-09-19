import { inject, Service, signal } from '@angular/core';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { IMAGE_STORAGE } from '../../../core/configuration/tokens';

// Uploads eagerly once cropped so a failure surfaces immediately, with a
// retry, rather than at the very end of onboarding.
@Service()
export class OnboardingAvatarService {
  private readonly authService = inject(AuthService);
  private readonly errorService = inject(ErrorService);
  private readonly imageStorage = inject(IMAGE_STORAGE);

  readonly avatarPreviewUrl = signal(this.authService.currentUser()?.photoUrl);
  readonly avatarUploadedUrl = signal<string | null>(null);
  readonly isUploadingAvatar = signal(false);
  readonly avatarError = signal<string | null>(null);

  // The raw file goes through the cropper first — showCropper/pendingFile
  // drive that modal — and only the cropped result becomes avatarFile,
  // which is what actually gets uploaded (and re-uploaded on retry).
  readonly showCropper = signal(false);
  readonly pendingFile = signal<File | null>(null);
  private avatarFile: File | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.pendingFile.set(file);
    this.showCropper.set(true);
  }

  onCropped(file: File): void {
    this.showCropper.set(false);
    this.avatarFile = file;
    this.avatarPreviewUrl.set(URL.createObjectURL(file));
    void this.uploadAvatar(file);
  }

  onCropCancelled(): void {
    this.showCropper.set(false);
    this.pendingFile.set(null);
  }

  retryUpload(): void {
    if (this.avatarFile) void this.uploadAvatar(this.avatarFile);
  }

  private async uploadAvatar(file: File): Promise<void> {
    this.isUploadingAvatar.set(true);
    this.avatarError.set(null);
    try {
      this.avatarUploadedUrl.set(await this.imageStorage.upload(file));
    } catch (err) {
      this.avatarError.set(this.errorService.toUserMessage(err));
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }
}
