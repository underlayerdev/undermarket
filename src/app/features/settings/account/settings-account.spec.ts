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

  function setup() {
    changePasswordSpy = vi.fn().mockResolvedValue(undefined);
    deleteAccountSpy = vi.fn().mockResolvedValue(undefined);
    logoutSpy = vi.fn().mockResolvedValue(undefined);
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    userServiceDeleteAccountSpy = vi.fn().mockResolvedValue(undefined);
    updateProfileSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [SettingsAccountComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => currentUser,
            changePassword: changePasswordSpy,
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

  describe('public profile city', () => {
    it('should seed showCity as false when the profile has no city set', () => {
      currentUser = mockUser({ profileCity: undefined });
      const fixture = setup();

      expect(fixture.componentInstance.showCity()).toBe(false);
    });

    it('should seed showCity and selectedCity from an existing profile city', () => {
      currentUser = mockUser({
        profileCity: {
          displayName: 'Palermo, Buenos Aires',
          city: 'Buenos Aires',
          region: 'Buenos Aires',
          countryCode: 'AR',
        },
      });
      const fixture = setup();

      expect(fixture.componentInstance.showCity()).toBe(true);
      expect(fixture.componentInstance.selectedCity()?.city).toBe('Buenos Aires');
    });

    it('should clear the profile city immediately when the checkbox is unchecked', async () => {
      currentUser = mockUser({
        profileCity: {
          displayName: 'Palermo, Buenos Aires',
          city: 'Buenos Aires',
          region: 'Buenos Aires',
          countryCode: 'AR',
        },
      });
      const fixture = setup();

      fixture.componentInstance.onToggleShowCity(false);
      await Promise.resolve();

      expect(fixture.componentInstance.selectedCity()).toBeNull();
      expect(updateProfileSpy).toHaveBeenCalledWith(
        expect.objectContaining({ profileCity: undefined }),
      );
    });

    it('should not save anything just from checking the box, before a city is picked', () => {
      currentUser = mockUser({ profileCity: undefined });
      const fixture = setup();

      fixture.componentInstance.onToggleShowCity(true);

      expect(fixture.componentInstance.showCity()).toBe(true);
      expect(updateProfileSpy).not.toHaveBeenCalled();
    });

    it('should save the picked city and update selectedCity', async () => {
      currentUser = mockUser({ profileCity: undefined });
      const fixture = setup();

      await fixture.componentInstance.onCityPicked({
        id: 'place.1',
        displayName: 'Recoleta, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
        neighborhood: 'Recoleta',
        latitude: -34.5875,
        longitude: -58.3974,
      });

      expect(fixture.componentInstance.selectedCity()).toEqual({
        displayName: 'Recoleta, Buenos Aires',
        countryCode: 'AR',
        region: 'Buenos Aires',
        city: 'Buenos Aires',
      });
      expect(updateProfileSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          profileCity: {
            displayName: 'Recoleta, Buenos Aires',
            countryCode: 'AR',
            region: 'Buenos Aires',
            city: 'Buenos Aires',
          },
        }),
      );
    });
  });
});
