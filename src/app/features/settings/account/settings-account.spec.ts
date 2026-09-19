import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '@underlayerdev/ui';
import { SettingsAccountComponent } from './settings-account';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { GEOCODING_PROVIDER, GEOLOCATION_PROVIDER } from '../../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import { mockUser } from '../../../domain/user/user.mock';
import type { User } from '../../../domain/user/user.model';

describe('SettingsAccountComponent', () => {
  let currentUser: User | null;
  let changePasswordSpy: ReturnType<typeof vi.fn>;
  let deleteAccountSpy: ReturnType<typeof vi.fn>;
  let logoutSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let userServiceDeleteAccountSpy: ReturnType<typeof vi.fn>;
  let updateProfileSpy: ReturnType<typeof vi.fn>;
  let updateDisplayNameSpy: ReturnType<typeof vi.fn>;

  function setup() {
    changePasswordSpy = vi.fn().mockResolvedValue(undefined);
    deleteAccountSpy = vi.fn().mockResolvedValue(undefined);
    logoutSpy = vi.fn().mockResolvedValue(undefined);
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    userServiceDeleteAccountSpy = vi.fn().mockResolvedValue(undefined);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);
    updateDisplayNameSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [SettingsAccountComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => currentUser,
            changePassword: changePasswordSpy,
            updateDisplayName: updateDisplayNameSpy,
            deleteAccount: deleteAccountSpy,
            logout: logoutSpy,
          },
        },
        {
          provide: UserService,
          useValue: {
            profile: () => currentUser,
            loadProfile: vi.fn().mockResolvedValue(undefined),
            ensureProfile: vi.fn().mockImplementation(async () => currentUser),
            updateProfile: updateProfileSpy,
            updateSettings: vi.fn().mockResolvedValue(undefined),
            deleteAccount: userServiceDeleteAccountSpy,
          },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: GEOCODING_PROVIDER, useValue: { search: vi.fn(), reverseGeocode: vi.fn() } },
        { provide: GEOLOCATION_PROVIDER, useValue: { getCurrentPosition: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(SettingsAccountComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    currentUser = mockUser();
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the account creation date', () => {
    currentUser = mockUser({ createdAt: new Date('2024-03-15T10:00:00Z') });
    const fixture = setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Member since');
    expect(text).toContain('Mar 15, 2024');
  });

  it('should show change password for an email/password user', () => {
    currentUser = mockUser({ providerId: 'password' });
    const fixture = setup();
    expect(fixture.componentInstance.isEmailPasswordUser()).toBe(true);
  });

  it('should hide change password for a Google user', () => {
    currentUser = mockUser({ providerId: 'google.com' });
    const fixture = setup();
    expect(fixture.componentInstance.isEmailPasswordUser()).toBe(false);
  });

  it('should require the current password before submitting a password change', async () => {
    currentUser = mockUser();
    const fixture = setup();

    await fixture.componentInstance.onChangePassword();

    expect(fixture.componentInstance.currentPasswordError()).toBeTruthy();
    expect(changePasswordSpy).not.toHaveBeenCalled();
  });

  it('should call authService.changePassword with valid input', async () => {
    currentUser = mockUser();
    const fixture = setup();
    const toastService = TestBed.inject(ToastService);
    const successSpy = vi.spyOn(toastService, 'success');
    fixture.componentInstance.currentPasswordValue.set('oldpass1');
    fixture.componentInstance.newPasswordValue.set('newpass1');
    fixture.componentInstance.confirmNewPasswordValue.set('newpass1');

    await fixture.componentInstance.onChangePassword();

    expect(changePasswordSpy).toHaveBeenCalledWith('newpass1', 'oldpass1');
    expect(successSpy).toHaveBeenCalled();
  });

  it('should open and close the delete-account modal', () => {
    currentUser = mockUser();
    const fixture = setup();

    fixture.componentInstance.onDeleteAccountClick();
    expect(fixture.componentInstance.showDeleteModal()).toBe(true);

    fixture.componentInstance.cancelDeleteAccount();
    expect(fixture.componentInstance.showDeleteModal()).toBe(false);
  });

  it('should delete the account and navigate to /login on confirm', async () => {
    currentUser = mockUser();
    const fixture = setup();
    fixture.componentInstance.deleteAccountPasswordValue.set('mypassword');

    await fixture.componentInstance.confirmDeleteAccount();

    expect(deleteAccountSpy).toHaveBeenCalledWith('mypassword');
    expect(userServiceDeleteAccountSpy).toHaveBeenCalledWith('user-1');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });

  it('should sign out and navigate to /login', async () => {
    currentUser = mockUser();
    const fixture = setup();

    await fixture.componentInstance.onSignOut();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });

  describe('display name', () => {
    it('should seed displayNameValue from the loaded profile', () => {
      currentUser = mockUser({ displayName: 'Old Name' });
      const fixture = setup();

      expect(fixture.componentInstance.displayNameValue()).toBe('Old Name');
    });

    it('should reject an empty display name once touched', () => {
      currentUser = mockUser();
      const fixture = setup();
      fixture.componentInstance.displayNameValue.set('   ');

      fixture.componentInstance.onSaveDisplayName();

      expect(fixture.componentInstance.displayNameError()).toBe('Display name is required.');
      expect(updateProfileSpy).not.toHaveBeenCalled();
      expect(updateDisplayNameSpy).not.toHaveBeenCalled();
    });

    it('should reject a display name under the min length', () => {
      currentUser = mockUser();
      const fixture = setup();
      fixture.componentInstance.displayNameValue.set('a');

      fixture.componentInstance.onSaveDisplayName();

      expect(fixture.componentInstance.displayNameError()).toContain('at least');
      expect(updateProfileSpy).not.toHaveBeenCalled();
    });

    it('should reject a display name over the max length', () => {
      currentUser = mockUser();
      const fixture = setup();
      fixture.componentInstance.displayNameValue.set('a'.repeat(51));

      fixture.componentInstance.onSaveDisplayName();

      expect(fixture.componentInstance.displayNameError()).toContain('at most');
      expect(updateProfileSpy).not.toHaveBeenCalled();
    });

    it('should save the trimmed display name to both Firestore and Firebase Auth', async () => {
      currentUser = mockUser({ id: 'user-1', displayName: 'Old Name' });
      const fixture = setup();
      fixture.componentInstance.displayNameValue.set('  New Name  ');

      await fixture.componentInstance.onSaveDisplayName();

      expect(updateProfileSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1', displayName: 'New Name' }),
      );
      expect(updateDisplayNameSpy).toHaveBeenCalledWith('New Name');
      expect(fixture.componentInstance.displayNameValue()).toBe('New Name');
      expect(fixture.componentInstance.displayNameTouched()).toBe(false);
    });

    it('should show an error toast and not clear touched state when saving fails', async () => {
      currentUser = mockUser();
      const fixture = setup();
      updateProfileSpy.mockRejectedValue(new Error('network down'));
      const toastService = TestBed.inject(ToastService);
      const errorSpy = vi.spyOn(toastService, 'error');
      fixture.componentInstance.displayNameValue.set('New Name');

      await fixture.componentInstance.onSaveDisplayName();

      expect(errorSpy).toHaveBeenCalled();
      expect(fixture.componentInstance.isSavingDisplayName()).toBe(false);
    });
  });
});
