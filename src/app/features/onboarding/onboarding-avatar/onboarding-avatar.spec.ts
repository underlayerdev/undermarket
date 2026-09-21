import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../application/services/auth.service';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { OnboardingService } from '../onboarding.service';
import { OnboardingAvatarComponent } from './onboarding-avatar';
import { OnboardingAvatarService } from './onboarding-avatar.service';

describe('OnboardingAvatarComponent', () => {
  let onFileSelectedSpy: ReturnType<typeof vi.fn>;
  let onCroppedSpy: ReturnType<typeof vi.fn>;
  let onCropCancelledSpy: ReturnType<typeof vi.fn>;
  let retryUploadSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let updatePhotoUrlSpy: ReturnType<typeof vi.fn>;
  let avatarUploadedUrl: string | null;
  let profile: User | null;

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
          provide: UserService,
          useValue: { profile: () => profile, updateProfile: updateProfileSpy },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: () => profile,
            updateDisplayName: vi.fn(),
            updatePhotoUrl: updatePhotoUrlSpy,
          },
        },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
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
      ],
    });

    const fixture = TestBed.createComponent(OnboardingAvatarComponent);
    fixture.detectChanges();
    return { fixture, onboardingService: TestBed.inject(OnboardingService) };
  }

  beforeEach(() => {
    avatarUploadedUrl = null;
    profile = mockUser({ id: 'user-1', displayName: 'Jane Doe', photoUrl: undefined });
  });

  it('should create', () => {
    const { fixture } = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should register itself as the photo step', () => {
    const { onboardingService } = setup();

    expect(onboardingService.step().id).toBe('photo');
    expect(onboardingService.stepperPosition()).toBe(2);
  });

  it('should offer a back button to the name step', () => {
    const { onboardingService } = setup();

    expect(onboardingService.showBack()).toBe(true);
  });

  it('should be continuable with nothing uploaded — the photo is optional', () => {
    const { onboardingService } = setup();

    expect(onboardingService.canContinue()).toBe(true);
  });

  it('should pass the file input event through to the service', () => {
    const { fixture } = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');

    input.dispatchEvent(new Event('change'));

    expect(onFileSelectedSpy).toHaveBeenCalledTimes(1);
  });

  it('should derive the avatar fallback initials from the name already saved', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.initials()).toBe('J');
  });

  it('should write nothing on continue when no photo was chosen', async () => {
    const { onboardingService } = setup();

    await onboardingService.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should save the uploaded photo to Firestore and Auth, then advance', async () => {
    avatarUploadedUrl = 'https://res.cloudinary.com/avatar.jpg';
    const { onboardingService } = setup();

    await onboardingService.continue();

    expect(updateProfileSpy).toHaveBeenCalledWith({
      ...profile,
      photoUrl: 'https://res.cloudinary.com/avatar.jpg',
    });
    expect(updatePhotoUrlSpy).toHaveBeenCalledWith('https://res.cloudinary.com/avatar.jpg');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should write nothing when the uploaded photo already matches the profile', async () => {
    avatarUploadedUrl = 'https://res.cloudinary.com/avatar.jpg';
    profile = mockUser({ id: 'user-1', photoUrl: 'https://res.cloudinary.com/avatar.jpg' });
    const { onboardingService } = setup();

    await onboardingService.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should surface an error and not advance when saving the photo fails', async () => {
    avatarUploadedUrl = 'https://res.cloudinary.com/avatar.jpg';
    const { onboardingService } = setup();
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));

    await onboardingService.continue();

    expect(onboardingService.errorMessage()).toBe('Something went wrong.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should pass the cropped file through to the service', () => {
    const { fixture } = setup();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    fixture.componentInstance.onCropped(file);

    expect(onCroppedSpy).toHaveBeenCalledWith(file);
  });

  it('should tell the service when cropping is cancelled', () => {
    const { fixture } = setup();

    fixture.componentInstance.onCropCancelled();

    expect(onCropCancelledSpy).toHaveBeenCalledTimes(1);
  });
});
