import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ErrorService } from '../../../application/services/error.service';
import { UserService } from '../../../application/services/user.service';
import { IMAGE_STORAGE } from '../../../core/configuration/tokens';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';
import { AvatarUploadStore } from '../../../shared/avatar-upload/avatar-upload.store';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { OnboardingService } from '../onboarding.service';
import { OnboardingAvatarComponent } from './onboarding-avatar';

describe('OnboardingAvatarComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let profile: User | null;

  function setup() {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [OnboardingAvatarComponent, getTranslocoTestingModule()],
      providers: [
        // Provided by OnboardingShellComponent in the app.
        AvatarUploadStore,
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        {
          provide: UserService,
          useValue: { profile: () => profile, updateProfile: updateProfileSpy },
        },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
        {
          provide: IMAGE_STORAGE,
          useValue: { upload: vi.fn().mockResolvedValue('https://res.cloudinary.com/avatar.jpg') },
        },
      ],
    });

    const fixture = TestBed.createComponent(OnboardingAvatarComponent);
    fixture.detectChanges();
    return {
      fixture,
      onboardingService: TestBed.inject(OnboardingService),
      avatarUpload: TestBed.inject(AvatarUploadStore),
    };
  }

  beforeEach(() => {
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

  it('should save the uploaded photo to the profile, then advance', async () => {
    const { onboardingService, avatarUpload } = setup();
    await avatarUpload.uploadCropped(new File(['x'], 'photo.jpg'));

    await onboardingService.continue();

    expect(updateProfileSpy).toHaveBeenCalledWith({
      ...profile,
      photoUrl: 'https://res.cloudinary.com/avatar.jpg',
    });
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should write nothing when the uploaded photo already matches the profile', async () => {
    profile = mockUser({ id: 'user-1', photoUrl: 'https://res.cloudinary.com/avatar.jpg' });
    const { onboardingService, avatarUpload } = setup();
    await avatarUpload.uploadCropped(new File(['x'], 'photo.jpg'));

    await onboardingService.continue();

    expect(updateProfileSpy).not.toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/location');
  });

  it('should surface an error and not advance when saving the photo fails', async () => {
    const { onboardingService, avatarUpload } = setup();
    await avatarUpload.uploadCropped(new File(['x'], 'photo.jpg'));
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));

    await onboardingService.continue();

    expect(onboardingService.errorMessage()).toBe('Something went wrong.');
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });
});
