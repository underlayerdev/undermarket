import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@underlayerdev/ui';
import { SettingsProfileAvatarComponent } from './settings-profile-avatar';
import { SettingsProfileStore } from '../settings-profile.store';
import { ErrorService } from '../../../../application/services/error.service';
import { UserService } from '../../../../application/services/user.service';
import { IMAGE_STORAGE } from '../../../../core/configuration/tokens';
import { AvatarUploadStore } from '../../../../shared/avatar-upload/avatar-upload.store';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import { mockUser } from '../../../../domain/user/user.mock';
import type { User } from '../../../../domain/user/user.model';

describe('SettingsProfileAvatarComponent', () => {
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let uploadSpy: ReturnType<typeof vi.fn>;

  function setup(initialProfile: User | null = mockUser({ photoUrl: undefined })) {
    const profile = signal<User | null>(initialProfile);
    updateProfileSpy = vi.fn(async (user: User) => profile.set(user));
    uploadSpy = vi.fn().mockResolvedValue('https://res.cloudinary.com/new.jpg');

    TestBed.configureTestingModule({
      imports: [SettingsProfileAvatarComponent, getTranslocoTestingModule()],
      providers: [
        SettingsProfileStore,
        { provide: UserService, useValue: { profile, updateProfile: updateProfileSpy } },
        { provide: IMAGE_STORAGE, useValue: { upload: uploadSpy } },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
      ],
    });

    const fixture = TestBed.createComponent(SettingsProfileAvatarComponent);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      profile,
      // The panel provides its own AvatarUploadStore, so it has to be read
      // from the component's injector, not the TestBed's.
      avatarUpload: fixture.debugElement.injector.get(AvatarUploadStore),
    };
  }

  it('should derive the placeholder initials from the display name', () => {
    const { component } = setup(mockUser({ displayName: 'Jane Doe', photoUrl: undefined }));

    expect(component['initials']()).toBe('J');
  });

  it('should save the uploaded photo to the profile and toast success', async () => {
    const { component, profile } = setup();
    const successSpy = vi.spyOn(TestBed.inject(ToastService), 'success');

    await component.onUploaded('https://res.cloudinary.com/new.jpg');

    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: 'https://res.cloudinary.com/new.jpg' }),
    );
    expect(profile()?.photoUrl).toBe('https://res.cloudinary.com/new.jpg');
    expect(successSpy).toHaveBeenCalled();
  });

  it('should toast an error and keep the saved photo when saving fails', async () => {
    const { component, profile } = setup(
      mockUser({ photoUrl: 'https://res.cloudinary.com/old.jpg' }),
    );
    updateProfileSpy.mockRejectedValueOnce(new Error('network down'));
    const errorSpy = vi.spyOn(TestBed.inject(ToastService), 'error');

    await component.onUploaded('https://res.cloudinary.com/new.jpg');

    expect(errorSpy).toHaveBeenCalled();
    expect(profile()?.photoUrl).toBe('https://res.cloudinary.com/old.jpg');
  });

  it('should drop the local preview once the save settles, success or not', async () => {
    const { component, avatarUpload } = setup();
    await avatarUpload.uploadCropped(new File(['x'], 'photo.jpg'));
    expect(avatarUpload.previewUrl()).toBeTruthy();

    await component.onUploaded('https://res.cloudinary.com/new.jpg');

    expect(avatarUpload.previewUrl()).toBeNull();
    expect(avatarUpload.uploadedUrl()).toBeNull();
  });
});
