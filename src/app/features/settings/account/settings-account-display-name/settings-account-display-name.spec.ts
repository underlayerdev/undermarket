import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@underlayerdev/ui';
import { SettingsAccountDisplayNameComponent } from './settings-account-display-name';
import { SettingsAccountStore } from '../settings-account.store';
import { UserService } from '../../../../application/services/user.service';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import { mockUser } from '../../../../domain/user/user.mock';
import type { User } from '../../../../domain/user/user.model';

describe('SettingsAccountDisplayNameComponent', () => {
  let updateProfileSpy: ReturnType<typeof vi.fn>;

  function setup(initialProfile: User | null = mockUser()) {
    const profile = signal<User | null>(initialProfile);
    updateProfileSpy = vi.fn(async (user: User) => profile.set(user));

    TestBed.configureTestingModule({
      imports: [SettingsAccountDisplayNameComponent, getTranslocoTestingModule()],
      providers: [
        SettingsAccountStore,
        { provide: UserService, useValue: { profile, updateProfile: updateProfileSpy } },
      ],
    });

    const fixture = TestBed.createComponent(SettingsAccountDisplayNameComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, profile };
  }

  it('should create', () => {
    expect(setup().component).toBeTruthy();
  });

  it('should seed displayNameValue from the loaded profile', () => {
    const { component } = setup(mockUser({ displayName: 'Old Name' }));

    expect(component.displayNameValue()).toBe('Old Name');
  });

  it('should seed displayNameValue once the profile arrives after creation', () => {
    const { component, profile } = setup(null);
    expect(component.displayNameValue()).toBe('');

    profile.set(mockUser({ displayName: 'Late Name' }));

    expect(component.displayNameValue()).toBe('Late Name');
  });

  it('should reject an empty display name once touched', async () => {
    const { component } = setup();
    component.displayNameValue.set('   ');

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toBe('Display name is required.');
    expect(updateProfileSpy).not.toHaveBeenCalled();
  });

  it('should reject a display name under the min length', async () => {
    const { component } = setup();
    component.displayNameValue.set('a');

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toContain('at least');
    expect(updateProfileSpy).not.toHaveBeenCalled();
  });

  it('should reject a display name over the max length', async () => {
    const { component } = setup();
    component.displayNameValue.set('a'.repeat(51));

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toContain('at most');
    expect(updateProfileSpy).not.toHaveBeenCalled();
  });

  it('should save the trimmed display name to the profile', async () => {
    const { component } = setup(mockUser({ id: 'user-1', displayName: 'Old Name' }));
    component.displayNameValue.set('  New Name  ');

    await component.onSaveDisplayName();

    expect(updateProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', displayName: 'New Name' }),
    );
    expect(component.displayNameValue()).toBe('New Name');
    expect(component.displayNameTouched()).toBe(false);
  });

  it('should show an error toast and reset the button label when saving fails', async () => {
    const { component } = setup();
    updateProfileSpy.mockRejectedValue(new Error('network down'));
    const errorSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
    component.displayNameValue.set('New Name');

    await component.onSaveDisplayName();

    expect(errorSpy).toHaveBeenCalled();
    expect(component.saveDisplayNameButtonLabel()).toBe('Save');
  });
});
