import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingAvatarComponent } from './onboarding-avatar';
import { OnboardingAvatarService } from './onboarding-avatar.service';
import { OnboardingNameService } from '../onboarding-name/onboarding-name.service';
import { OnboardingProgressService } from '../shared/onboarding-progress/onboarding-progress.service';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingAvatarComponent', () => {
  let onFileSelectedSpy: ReturnType<typeof vi.fn>;
  let onCroppedSpy: ReturnType<typeof vi.fn>;
  let onCropCancelledSpy: ReturnType<typeof vi.fn>;
  let retryUploadSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let updatePhotoUrlSpy: ReturnType<typeof vi.fn>;
  let avatarUploadedUrl: string | null;
  let profile: object | null;

  function setup() {
    onFileSelectedSpy = vi.fn();
    onCroppedSpy = vi.fn();
    onCropCancelledSpy = vi.fn();
    retryUploadSpy = vi.fn();
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    updatePhotoUrlSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [OnboardingAvatarComponent, getTranslocoTestingModule()],
      providers: [
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        {
          provide: AuthService,
          useValue: { updatePhotoUrl: updatePhotoUrlSpy },
        },
        {
          provide: UserService,
          useValue: { profile: () => profile, updateProfile: updateProfileSpy },
        },
        {
          provide: OnboardingAvatarService,
          useValue: {
            avatarPreviewUrl: () => undefined,
            avatarUploadedUrl: () => avatarUploadedUrl,
            isUploadingAvatar: () => false,
            avatarError: () => null,
            showCropper: () => false,
            pendingFile: () => null,
            onFileSelected: onFileSelectedSpy,
            onCropped: onCroppedSpy,
            onCropCancelled: onCropCancelledSpy,
            retryUpload: retryUploadSpy,
          },
        },
        {
          provide: OnboardingNameService,
          useValue: { displayNameValue: () => 'Jane Doe' },
        },
      ],
    });

    const fixture = TestBed.createComponent(OnboardingAvatarComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    avatarUploadedUrl = null;
    profile = mockUser({ id: 'user-1' });
  });

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should report itself as step 2 on activation', () => {
    setup();

    expect(TestBed.inject(OnboardingProgressService).currentStep()).toBe(2);
  });

  it('should pass the file input event through to the service', () => {
    const fixture = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');

    input.dispatchEvent(new Event('change'));

    expect(onFileSelectedSpy).toHaveBeenCalledTimes(1);
  });

  it('should derive the avatar fallback initials from the name step', () => {
    const fixture = setup();

    expect(fixture.nativeElement.textContent).toContain('J');
  });

  it('should navigate back to the name step', () => {
    const fixture = setup();

    fixture.componentInstance.back();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/name');
  });

  it('should navigate to the location step on continue when no photo was chosen', async () => {
    const fixture = setup();

    await fixture.componentInstance.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should save the uploaded photo to Firestore and Auth, then navigate on continue', async () => {
    avatarUploadedUrl = 'https://res.cloudinary.com/avatar.jpg';
    const fixture = setup();

    await fixture.componentInstance.continue();

    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        photoUrl: 'https://res.cloudinary.com/avatar.jpg',
      }),
    );
    expect(updatePhotoUrlSpy).toHaveBeenCalledWith('https://res.cloudinary.com/avatar.jpg');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should show an error and not navigate when saving the photo fails', async () => {
    avatarUploadedUrl = 'https://res.cloudinary.com/avatar.jpg';
    const fixture = setup();
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));

    await fixture.componentInstance.continue();

    expect(fixture.componentInstance.saveError()).toBeTruthy();
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should pass the cropped file through to the service', () => {
    const fixture = setup();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    fixture.componentInstance.onCropped(file);

    expect(onCroppedSpy).toHaveBeenCalledWith(file);
  });

  it('should tell the service when cropping is cancelled', () => {
    const fixture = setup();

    fixture.componentInstance.onCropCancelled();

    expect(onCropCancelledSpy).toHaveBeenCalledTimes(1);
  });
});
