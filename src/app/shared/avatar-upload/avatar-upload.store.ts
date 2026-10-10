import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { ErrorService } from '../../application/services/error.service';
import { IMAGE_STORAGE } from '../../core/configuration/tokens';

interface AvatarUploadState {
  /** The raw file the user picked, shown in the cropper. */
  pendingFile: File | null;
  cropperOpen: boolean;
  /** Object URL of the cropped file, so the avatar updates before the upload lands. */
  previewUrl: string | null;
  uploadedUrl: string | null;
  isUploading: boolean;
  error: string | null;
}

const initialState: AvatarUploadState = {
  pendingFile: null,
  cropperOpen: false,
  previewUrl: null,
  uploadedUrl: null,
  isUploading: false,
  error: null,
};

/**
 * Pick → crop → upload for a profile photo, shared by onboarding and
 * settings. It only gets the image to storage and reports the resulting URL;
 * what happens to that URL (written on Continue, saved straight away) is up
 * to whoever provides this store.
 *
 * Uploads eagerly once cropped so a failure shows up immediately, with a
 * retry, rather than at the end of the flow that uses it.
 */
export const AvatarUploadStore = signalStore(
  withState(initialState),
  withProps(() => ({
    _imageStorage: inject(IMAGE_STORAGE),
    _errorService: inject(ErrorService),
  })),
  withMethods((store) => {
    let lastFile: File | null = null;
    // Only the newest upload may write its outcome: picking a second photo
    // while the first is still uploading must not let the first one win.
    let latestAttempt = 0;

    function setPreview(previewUrl: string | null): void {
      const previous = store.previewUrl();
      if (previous) URL.revokeObjectURL(previous);
      patchState(store, { previewUrl });
    }

    async function upload(file: File): Promise<string | null> {
      const attempt = ++latestAttempt;
      lastFile = file;
      patchState(store, { isUploading: true, error: null });
      try {
        const uploadedUrl = await store._imageStorage.upload(file);
        if (attempt !== latestAttempt) return null;
        patchState(store, { uploadedUrl });
        return uploadedUrl;
      } catch (err) {
        if (attempt !== latestAttempt) return null;
        patchState(store, { error: store._errorService.toUserMessage(err) });
        return null;
      } finally {
        if (attempt === latestAttempt) patchState(store, { isUploading: false });
      }
    }

    return {
      selectFile(file: File): void {
        patchState(store, { pendingFile: file, cropperOpen: true });
      },

      setCropperOpen(cropperOpen: boolean): void {
        patchState(store, { cropperOpen });
      },

      cancelCrop(): void {
        patchState(store, { pendingFile: null, cropperOpen: false });
      },

      /** Resolves to the uploaded URL, or null when the upload failed (see `error`). */
      uploadCropped(file: File): Promise<string | null> {
        patchState(store, { cropperOpen: false });
        setPreview(URL.createObjectURL(file));
        return upload(file);
      },

      /** Re-uploads the last cropped file; resolves to null if there is none. */
      retry(): Promise<string | null> {
        return lastFile ? upload(lastFile) : Promise.resolve(null);
      },

      /** Back to a clean slate, so the avatar falls back to the saved photo. */
      reset(): void {
        latestAttempt++;
        lastFile = null;
        setPreview(null);
        patchState(store, initialState);
      },
    };
  }),
);

export type AvatarUploadStore = InstanceType<typeof AvatarUploadStore>;
