import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '@underlayerdev/ui';
import { SettingsAccountComponent } from './settings-account';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';
import type { User } from '../../../domain/user/user.model';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    settings: { language: 'en' },
    providerId: 'password',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SettingsAccountComponent', () => {
  let currentUser: User | null;
  let changePasswordSpy: ReturnType<typeof vi.fn>;
  let deleteAccountSpy: ReturnType<typeof vi.fn>;
  let logoutSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let userServiceDeleteAccountSpy: ReturnType<typeof vi.fn>;

  function setup() {
    changePasswordSpy = vi.fn().mockResolvedValue(undefined);
    deleteAccountSpy = vi.fn().mockResolvedValue(undefined);
    logoutSpy = vi.fn().mockResolvedValue(undefined);
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    userServiceDeleteAccountSpy = vi.fn().mockResolvedValue(undefined);

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
            updateSettings: vi.fn().mockResolvedValue(undefined),
            deleteAccount: userServiceDeleteAccountSpy,
          },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(SettingsAccountComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    currentUser = createUser();
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the account creation date', () => {
    currentUser = createUser({ createdAt: new Date('2024-03-15T10:00:00Z') });
    const fixture = setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Member since');
    expect(text).toContain('Mar 15, 2024');
  });

  it('should show change password for an email/password user', () => {
    currentUser = createUser({ providerId: 'password' });
    const fixture = setup();
    expect(fixture.componentInstance.isEmailPasswordUser()).toBe(true);
  });

  it('should hide change password for a Google user', () => {
    currentUser = createUser({ providerId: 'google.com' });
    const fixture = setup();
    expect(fixture.componentInstance.isEmailPasswordUser()).toBe(false);
  });

  it('should require the current password before submitting a password change', async () => {
    currentUser = createUser();
    const fixture = setup();

    await fixture.componentInstance.onChangePassword();

    expect(fixture.componentInstance.currentPasswordError()).toBeTruthy();
    expect(changePasswordSpy).not.toHaveBeenCalled();
  });

  it('should call authService.changePassword with valid input', async () => {
    currentUser = createUser();
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
    currentUser = createUser();
    const fixture = setup();

    fixture.componentInstance.onDeleteAccountClick();
    expect(fixture.componentInstance.showDeleteModal()).toBe(true);

    fixture.componentInstance.cancelDeleteAccount();
    expect(fixture.componentInstance.showDeleteModal()).toBe(false);
  });

  it('should delete the account and navigate to /login on confirm', async () => {
    currentUser = createUser();
    const fixture = setup();
    fixture.componentInstance.deleteAccountPasswordValue.set('mypassword');

    await fixture.componentInstance.confirmDeleteAccount();

    expect(deleteAccountSpy).toHaveBeenCalledWith('mypassword');
    expect(userServiceDeleteAccountSpy).toHaveBeenCalledWith('user-1');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });

  it('should sign out and navigate to /login', async () => {
    currentUser = createUser();
    const fixture = setup();

    await fixture.componentInstance.onSignOut();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });
});
