import { TestBed } from '@angular/core/testing';
import { OnboardingAvatarService } from './onboarding-avatar.service';
import { AuthService } from '../../../application/services/auth.service';
import { IMAGE_STORAGE } from '../../../core/configuration/tokens';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingAvatarService', () => {
  let uploadSpy: ReturnType<typeof vi.fn>;

  function setup(photoUrl?: string) {
    uploadSpy = vi.fn().mockResolvedValue('https://res.cloudinary.com/avatar.jpg');

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => mockUser({ photoUrl }) } },
        { provide: IMAGE_STORAGE, useValue: { upload: uploadSpy } },
      ],
    });

    return TestBed.inject(OnboardingAvatarService);
  }

  function fileInputEvent(file: File): Event {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    return { target: input } as unknown as Event;
  }

  it('should seed the preview from the current Auth photo, if any', () => {
    const service = setup('https://example.com/existing.jpg');

    expect(service.avatarPreviewUrl()).toBe('https://example.com/existing.jpg');
  });

  it('should open the cropper with the selected file instead of uploading it directly', () => {
    const service = setup();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });

    service.onFileSelected(fileInputEvent(file));

    expect(service.pendingFile()).toBe(file);
    expect(service.showCropper()).toBe(true);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should upload the cropped file and store the resulting url', async () => {
    const service = setup();
    const rawFile = new File(['x'], 'avatar.png', { type: 'image/png' });
    const croppedFile = new File(['cropped'], 'photo.jpg', { type: 'image/jpeg' });
    service.onFileSelected(fileInputEvent(rawFile));

    service.onCropped(croppedFile);
    await Promise.resolve();
    await Promise.resolve();

    expect(service.showCropper()).toBe(false);
    expect(uploadSpy).toHaveBeenCalledWith(croppedFile);
    expect(service.avatarUploadedUrl()).toBe('https://res.cloudinary.com/avatar.jpg');
    expect(service.avatarError()).toBeNull();
  });

  it('should close the cropper without uploading anything when cancelled', () => {
    const service = setup();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    service.onFileSelected(fileInputEvent(file));

    service.onCropCancelled();

    expect(service.showCropper()).toBe(false);
    expect(service.pendingFile()).toBeNull();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should show an error and allow retrying when the upload fails', async () => {
    const service = setup();
    uploadSpy.mockRejectedValueOnce(new Error('network down'));
    const croppedFile = new File(['cropped'], 'photo.jpg', { type: 'image/jpeg' });

    service.onCropped(croppedFile);
    await Promise.resolve();
    await Promise.resolve();

    expect(service.avatarError()).toBeTruthy();
    expect(service.avatarUploadedUrl()).toBeNull();

    uploadSpy.mockResolvedValueOnce('https://res.cloudinary.com/retry.jpg');
    service.retryUpload();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.avatarUploadedUrl()).toBe('https://res.cloudinary.com/retry.jpg');
    expect(service.avatarError()).toBeNull();
  });

  it('should do nothing when no file was actually selected', () => {
    const service = setup();
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    service.onFileSelected({ target: input } as unknown as Event);

    expect(service.showCropper()).toBe(false);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should do nothing on retry when nothing was ever cropped', () => {
    const service = setup();

    service.retryUpload();

    expect(uploadSpy).not.toHaveBeenCalled();
  });
});
