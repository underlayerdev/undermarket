import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, ImageCropperComponent } from '@underlayerdev/ui';
import { AvatarUploadStore } from './avatar-upload.store';

/**
 * The editable avatar with its crop dialog and upload status. State lives in
 * the AvatarUploadStore, which whoever hosts this must provide — that decides
 * how long the picked photo survives (a settings panel vs. a whole onboarding
 * flow).
 */
@Component({
  selector: 'um-avatar-uploader',
  templateUrl: './avatar-uploader.html',
  styleUrl: './avatar-uploader.scss',
  imports: [AvatarComponent, ButtonComponent, ImageCropperComponent, TranslocoDirective],
})
export class AvatarUploaderComponent {
  protected readonly store = inject(AvatarUploadStore);

  /** The photo currently saved on the profile, shown until a new one is picked. */
  readonly src = input<string | undefined>();
  /** Placeholder for an avatar with no image yet. */
  readonly initials = input<string | undefined>();

  /** The uploaded image's URL, once a crop (or a retry) has finished uploading. */
  readonly uploaded = output<string>();

  protected readonly displaySrc = computed(() => this.store.previewUrl() ?? this.src());

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so picking the same file again still fires a change.
    input.value = '';
    if (file) this.store.selectFile(file);
  }

  async onCropped(file: File): Promise<void> {
    this.emitUploaded(await this.store.uploadCropped(file));
  }

  async onRetry(): Promise<void> {
    this.emitUploaded(await this.store.retry());
  }

  private emitUploaded(url: string | null): void {
    if (url) this.uploaded.emit(url);
  }
}
